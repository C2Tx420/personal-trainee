import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { bootstrap } from '@/data/api';
import { queryClient } from '@/data/queries';
import { useOnline } from '@/lib/hooks';
import { takeUpdateUnlock, useSwUpdate } from '@/lib/sw-update';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Splash } from '@/ui/components';
import { IconWifiOff } from '@/ui/icons';
import { ForceUpdate } from './ForceUpdate';
import { LoginPage } from './LoginPage';
import { PinLock } from './PinLock';
import { t } from '@/i18n';

type AuthCtx = { userId: string; signOut: () => Promise<void> };
const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth outside AuthGate');
  return c;
}

// Device flag (no health data): once this device has bootstrapped for a user, later
// launches skip waiting for bootstrap and run it in the background instead.
const bootKey = (uid: string) => `pt:booted:${uid}`;
function bootedBefore(uid: string): boolean {
  try {
    return localStorage.getItem(bootKey(uid)) === '1';
  } catch {
    return false;
  }
}
function markBooted(uid: string) {
  try {
    localStorage.setItem(bootKey(uid), '1');
  } catch {
    /* private mode — next launch just waits for bootstrap again */
  }
}

/**
 * App gate: not signed in → Login; signed in → enter the PIN every time the app opens.
 * A waiting new release is installed first, before the login / PIN screen.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const online = useOnline();
  const update = useSwUpdate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // PIN every time the app opens — except the reload the app does itself to install an update
  const [locked, setLocked] = useState(() => !takeUpdateUnlock());
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' }).catch(() => supabase.auth.signOut({ scope: 'local' }));
    queryClient.clear();
    setBooted(false);
    setLocked(true);
  }, []);

  const unlock = useCallback(() => setLocked(false), []);

  // Seen this device before → show the app right away (also after the reload for an update, which
  // skips the PIN) and top up seed data in the background
  const warm = !!session && bootedBefore(session.user.id);

  // First launch on this device: wait for the seed data before showing the app
  useEffect(() => {
    if (!session || locked || booted) return;
    const uid = session.user.id;
    if (warm) {
      setBooted(true);
      bootstrap()
        .then((changed) => {
          if (changed) void queryClient.invalidateQueries();
        })
        .catch(() => {});
      return;
    }
    bootstrap()
      .then(() => {
        markBooted(uid);
        setBooted(true);
        setBootError(null);
      })
      .catch((e: Error) => setBootError(e.message));
  }, [session, locked, booted, warm]);

  if (!online && (session === undefined || !booted)) return <OfflineScreen />;
  // global guard: lock the app while a new release is installed — on open / resume (forced), before
  // the login / PIN, or after a screen change in the app (applying)
  if (update.applying || update.forced || (update.needRefresh && !update.stalled && (!session || locked))) {
    return <ForceUpdate keepUnlocked={!!session && !locked} />;
  }
  // first open: hold the login / PIN until the version check settles (≤ 3 s), so the update
  // screen never replaces them mid-entry
  if (session === undefined || (!update.entryChecked && (!session || locked))) return <Splash />;
  if (!session) return <LoginPage />;
  if (locked) {
    return (
      <PinLock
        onUnlock={unlock}
        onLockedOut={signOut}
        email={session.user.email ?? ''}
      />
    );
  }
  if (bootError) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Banner tone="bad">{t('Không tải được dữ liệu: {error}', { error: bootError ?? '' })}</Banner>
        <Button variant="primary" block onClick={() => {
            setBootError(null);
            setBooted(false);
          }}>
          {t('Thử lại')}
        </Button>
      </div>
    );
  }
  if (!booted && !warm) return <Splash label={t('Đang chuẩn bị dữ liệu…')} />;
  return <Ctx.Provider value={{ userId: session.user.id, signOut }}>{children}</Ctx.Provider>;
}

function OfflineScreen() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <IconWifiOff className="mx-auto mb-3 size-10 text-muted" />
        <h1 className="mb-2 text-xl font-semibold">{t('Cần kết nối mạng')}</h1>
        <p className="mb-5 text-sm text-muted">{t('App lưu dữ liệu trên Supabase và không hỗ trợ dùng offline. Bật Wi-Fi hoặc 4G rồi thử lại.')}</p>
        <Button variant="primary" onClick={() => location.reload()}>
          {t('Thử lại')}
        </Button>
      </div>
    </div>
  );
}
