import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { APP_VERSION, BUILD_TIME, GIT_SHA } from './version';

/**
 * Service worker updates (§15.4) — one global guard, no per-screen prompt:
 * - opening the app or coming back to it: /version.json is compared with the running build;
 *   a newer build locks the app (AuthGate → ForceUpdate) until it is installed — this does not
 *   wait for the service worker to notice the release on its own;
 * - while he is using it: a release found later is installed on the next screen change
 *   (applyOnNavigation), which drops the current screen anyway, so nothing typed is lost;
 * - never inside the workout flow.
 *
 * A release is identified by its build (git SHA + build time), not by package.json's version,
 * which stays the same across deploys.
 */
const CHECK_EVERY_MS = 30 * 60_000;
/** skipWaiting normally hands over in < 1 s; past this, reload anyway. */
const APPLY_TIMEOUT_MS = 6000;
/** Same target build forced this many times without landing on it → stop forcing (no reload loop). */
const MAX_ATTEMPTS = 2;
/** Login / PIN wait this long at most for the first version check (slow network → show them anyway). */
const ENTRY_CHECK_TIMEOUT_MS = 3000;

export type Release = { version: string; sha: string; builtAt: string };

/** The build that is running now. */
export const CURRENT_RELEASE: Release = { version: APP_VERSION, sha: GIT_SHA, builtAt: BUILD_TIME };

let needRefresh = false;
// reloaded MAX_ATTEMPTS times for the same build and still not on it → only on screen change, never before the PIN
let stalled = false;
let forced = false;
let applying = false;
// false until the first check on open settles: the login / PIN screen waits for it, so a newer
// build is caught before he starts typing instead of yanking the PIN screen away mid-entry
let entryChecked = true;
let latest: Release | null = null;
let registration: ServiceWorkerRegistration | undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let reloading = false;
function reloadOnce() {
  if (reloading) return;
  reloading = true;
  location.reload();
}

async function fetchLatest(): Promise<Release | null> {
  try {
    const r = await fetch('/version.json', { cache: 'no-store' });
    return r.ok ? ((await r.json()) as Release) : null;
  } catch {
    return null;
  }
}

const isNewer = (r: Release | null) => !!r && (r.sha !== GIT_SHA || r.builtAt !== BUILD_TIME);

// ── reload-loop guard (sessionStorage: survives the reload, not the app being closed)
const ATTEMPT_KEY = 'pt:update-attempt';
function attempts(target: Release): number {
  try {
    const a = JSON.parse(sessionStorage.getItem(ATTEMPT_KEY) ?? 'null') as { builtAt: string; n: number } | null;
    return a?.builtAt === target.builtAt ? a.n : 0;
  } catch {
    return 0;
  }
}
function countAttempt(target: Release) {
  try {
    sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({ builtAt: target.builtAt, n: attempts(target) + 1 }));
  } catch {
    /* private mode */
  }
}

const inWorkout = () => location.pathname.startsWith('/workout');

/** Opening / resuming the app: lock and install right away if the server has a newer build. */
async function checkOnEnter() {
  if (!navigator.onLine || applying) return;
  const next = await fetchLatest();
  if (!isNewer(next)) return;
  latest = next;
  if (attempts(next!) >= MAX_ATTEMPTS) {
    // already reloaded for it and still not running it → fall back to "next screen change"
    needRefresh = true;
    stalled = true;
  } else if (!inWorkout()) {
    forced = true;
  }
  emit();
  void registration?.update().catch(() => undefined);
}

function markEntryChecked() {
  if (entryChecked) return;
  entryChecked = true;
  emit();
}

export function startSwUpdates(): void {
  if (!('serviceWorker' in navigator)) return;

  // A new worker took over (this tab's update, another tab's, or an old tab left open):
  // reload so the page never keeps running old JS whose chunks were just purged from the cache.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) reloadOnce();
  });

  registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      emit();
      if (!latest) void fetchLatest().then((next) => ((latest = next), (stalled = !!next && attempts(next) >= MAX_ATTEMPTS), emit()));
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      registration = reg;
      setInterval(() => {
        if (navigator.onLine && !reg.installing) void reg.update().catch(() => undefined);
      }, CHECK_EVERY_MS);
    },
  });

  entryChecked = false;
  setTimeout(markEntryChecked, ENTRY_CHECK_TIMEOUT_MS);
  void checkOnEnter().finally(markEntryChecked);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void checkOnEnter();
  });
}

type NavRouter = { state: { location: { key: string } }; subscribe: (fn: (s: { location: { key: string; pathname: string } }) => void) => unknown };

const UNLOCK_KEY = 'pt:update-unlocked';
const UNLOCK_TTL_MS = 60_000;
let unlockedByUpdate: boolean | null = null;

/** The app is about to reload itself for an update while it is unlocked → no PIN after it. */
export function rememberUnlock(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
  } catch {
    /* private mode — PIN again after the update */
  }
}

/**
 * The app reloaded itself for an update while it was unlocked → skip the PIN this once
 * (same tab, within 60 s). Read once per page load.
 */
export function takeUpdateUnlock(): boolean {
  if (unlockedByUpdate !== null) return unlockedByUpdate;
  try {
    const t = Number(sessionStorage.getItem(UNLOCK_KEY) ?? 0);
    sessionStorage.removeItem(UNLOCK_KEY);
    unlockedByUpdate = Date.now() - t < UNLOCK_TTL_MS;
  } catch {
    unlockedByUpdate = false;
  }
  return unlockedByUpdate;
}

/** In the app: install a release found later on the next screen change (the reload lands on that screen). */
export function applyOnNavigation(router: NavRouter): void {
  let last = router.state.location.key;
  router.subscribe((s) => {
    if (s.location.key === last) return;
    last = s.location.key;
    if (!needRefresh || s.location.pathname.startsWith('/workout')) return;
    rememberUnlock(); // the router only renders once the PIN is entered
    applySwUpdate();
  });
}

/**
 * Install the new release and reload into it. Works whether the new worker is already waiting,
 * still installing, or not fetched yet; reloads anyway after a timeout.
 */
export function applySwUpdate(): void {
  if (applying) return;
  applying = true;
  emit();
  if (latest) countAttempt(latest);
  setTimeout(reloadOnce, APPLY_TIMEOUT_MS);
  const reg = registration;
  if (!reg) return reloadOnce();
  const go = (): void => {
    if (reg.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' }); // → controllerchange → reload
      return;
    }
    const installing = reg.installing;
    if (installing) {
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' || installing.state === 'activated') go();
        else if (installing.state === 'redundant') reloadOnce();
      });
      return;
    }
    // nothing pending: fetch the new worker now; if there is none it was already activated elsewhere
    void reg.update().then(() => (reg.waiting || reg.installing ? go() : reloadOnce()), reloadOnce);
  };
  go();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSwUpdate(): {
  needRefresh: boolean;
  stalled: boolean;
  forced: boolean;
  applying: boolean;
  latest: Release | null;
  entryChecked: boolean;
} {
  return {
    stalled: useSyncExternalStore(subscribe, () => stalled),
    entryChecked: useSyncExternalStore(subscribe, () => entryChecked),
    needRefresh: useSyncExternalStore(subscribe, () => needRefresh),
    forced: useSyncExternalStore(subscribe, () => forced),
    applying: useSyncExternalStore(subscribe, () => applying),
    latest: useSyncExternalStore(subscribe, () => latest),
  };
}

/** "0.1.0 · a1b2c3d · 02/11 09:51" — version and commit alone repeat across deploys. */
export function releaseLabel(r: Release): string {
  const v = r.version.includes(r.sha) ? r.version : `${r.version} · ${r.sha}`;
  const t = new Date(r.builtAt);
  if (Number.isNaN(t.getTime())) return v;
  const fmt = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = Object.fromEntries(fmt.formatToParts(t).map((x) => [x.type, x.value]));
  return `${v} · ${p.day}/${p.month} ${p.hour}:${p.minute}`;
}
