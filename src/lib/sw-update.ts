import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { APP_VERSION, BUILD_TIME, GIT_SHA } from './version';

/**
 * Service worker updates (§15.4) — one global guard, no per-screen prompt:
 * - login / PIN screen: a waiting release is installed before anything else (AuthGate);
 * - in the app: it is installed on the next screen change (applyOnNavigation), which drops the
 *   current screen anyway, so nothing typed is lost; never inside the workout flow.
 * Checks for a new release on start, every 30 minutes, and whenever the app comes back to the
 * foreground — an installed PWA is often resumed, not reloaded.
 *
 * A release is identified by its build (git SHA + build time from /version.json), not by
 * package.json's version, which stays the same across deploys.
 */
const CHECK_EVERY_MS = 30 * 60_000;
/** skipWaiting normally hands over in < 1 s; past this, reload anyway. */
const APPLY_TIMEOUT_MS = 4000;

export type Release = { version: string; sha: string; builtAt: string };

let needRefresh = false;
let applying = false;
let latest: Release | null = null;
let registration: ServiceWorkerRegistration | undefined;
let apply: (reload?: boolean) => Promise<void> = async () => undefined;
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

export function startSwUpdates(): void {
  if (!('serviceWorker' in navigator)) return;

  // A new worker took over (this tab's update, another tab's, or an old tab left open):
  // reload so the page never keeps running old JS whose chunks were just purged from the cache.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) reloadOnce();
  });

  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      emit();
      void fetchLatest().then((next) => {
        latest = next;
        emit();
      });
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      registration = reg;
      const check = () => {
        // the waiting worker was activated elsewhere → nothing left to install here
        if (needRefresh && !reg.waiting && !reg.installing && !applying) {
          needRefresh = false;
          emit();
        }
        if (navigator.onLine && !reg.installing) void reg.update().catch(() => undefined);
      };
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}

type NavRouter = { state: { location: { key: string } }; subscribe: (fn: (s: { location: { key: string; pathname: string } }) => void) => unknown };

const UNLOCK_KEY = 'pt:update-unlocked';
const UNLOCK_TTL_MS = 60_000;
let unlockedByUpdate: boolean | null = null;

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

/** In the app: install a waiting release on the next screen change (the reload lands on that screen). */
export function applyOnNavigation(router: NavRouter): void {
  let last = router.state.location.key;
  router.subscribe((s) => {
    if (s.location.key === last) return;
    last = s.location.key;
    if (!needRefresh || s.location.pathname.startsWith('/workout')) return;
    // the router only renders once the PIN is entered → he is already in the app
    try {
      sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
    } catch {
      /* private mode — PIN again after the update */
    }
    applySwUpdate();
  });
}

/** Activate the waiting service worker and reload into the new version. */
export function applySwUpdate(): void {
  if (applying) return;
  applying = true;
  emit();
  // Nothing waiting (already activated by another tab) → the new version is one reload away
  if (registration && !registration.waiting) return reloadOnce();
  void apply(true);
  setTimeout(reloadOnce, APPLY_TIMEOUT_MS);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSwUpdate(): { needRefresh: boolean; applying: boolean; latest: Release | null } {
  const refresh = useSyncExternalStore(subscribe, () => needRefresh);
  const busy = useSyncExternalStore(subscribe, () => applying);
  const next = useSyncExternalStore(subscribe, () => latest);
  return { needRefresh: refresh, applying: busy, latest: next };
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

/** The build that is running now. */
export const CURRENT_RELEASE: Release = { version: APP_VERSION, sha: GIT_SHA, builtAt: BUILD_TIME };
