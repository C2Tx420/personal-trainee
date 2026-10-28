import { useSyncExternalStore } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Service worker updates (§15.4), shared by the PIN screen (forced update before the PIN)
 * and the in-app toast. Checks for a new release on start, every 30 minutes, and whenever
 * the app comes back to the foreground — an installed PWA is often resumed, not reloaded.
 */
const CHECK_EVERY_MS = 30 * 60_000;

let needRefresh = false;
let applying = false;
let apply: (reload?: boolean) => Promise<void> = async () => undefined;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function startSwUpdates(): void {
  if (!('serviceWorker' in navigator)) return;
  apply = registerSW({
    immediate: true,
    onNeedRefresh() {
      needRefresh = true;
      emit();
    },
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => {
        if (navigator.onLine && !reg.installing) void reg.update().catch(() => undefined);
      };
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
}

/** Activate the waiting service worker and reload into the new version. */
export function applySwUpdate(): void {
  if (applying) return;
  applying = true;
  emit();
  void apply(true);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSwUpdate(): { needRefresh: boolean; applying: boolean } {
  const refresh = useSyncExternalStore(subscribe, () => needRefresh);
  const busy = useSyncExternalStore(subscribe, () => applying);
  return { needRefresh: refresh, applying: busy };
}
