import { useEffect, useRef, useState } from 'react';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Re-render mỗi `ms` (đồng hồ nghỉ, đếm ngược). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Giữ màn hình sáng trong lúc tập (Wake Lock API). */
export function useWakeLock(active: boolean): void {
  const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock.current = await navigator.wakeLock.request('screen');
      } catch {
        /* trình duyệt từ chối — bỏ qua */
      }
    };
    void acquire();
    const onVis = () => {
      if (document.visibilityState === 'visible' && !cancelled) void acquire();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock.current?.release().catch(() => undefined);
    };
  }, [active]);
}

export function beep(): void {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    o.start();
    o.stop(ctx.currentTime + 0.35);
  } catch {
    /* không có âm thanh */
  }
  navigator.vibrate?.([200, 100, 200]);
}

export async function notifyLocal(title: string, body: string): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (reg) await reg.showNotification(title, { body, tag: 'rest-timer', icon: '/icons/icon-192.png' });
}
