import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { bootstrap } from '@/data/api';
import { queryClient } from '@/data/queries';
import { useOnline } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Spinner } from '@/ui/components';
import { IconWifiOff } from '@/ui/icons';
import { LoginPage } from './LoginPage';
import { PinLock } from './PinLock';

type AuthCtx = { userId: string; signOut: () => Promise<void> };
const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth ngoài AuthGate');
  return c;
}

/** App gate: not signed in → Login; signed in → enter the PIN every time the app opens. */
export function AuthGate({ children }: { children: ReactNode }) {
  const online = useOnline();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [locked, setLocked] = useState(true);
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

  // Bootstrap seed data after the first unlock
  useEffect(() => {
    if (!session || locked || booted) return;
    bootstrap()
      .then(() => {
        setBooted(true);
        setBootError(null);
      })
      .catch((e: Error) => setBootError(e.message));
  }, [session, locked, booted]);

  if (!online && (session === undefined || !booted)) return <OfflineScreen />;
  if (session === undefined) return <Spinner />;
  if (!session) return <LoginPage />;
  if (locked) {
    return (
      <PinLock
        onUnlock={() => setLocked(false)}
        onLockedOut={signOut}
        email={session.user.email ?? ''}
      />
    );
  }
  if (bootError) {
    return (
      <div className="mx-auto max-w-md p-6">
        <Banner tone="bad">Không tải được dữ liệu: {bootError}</Banner>
        <Button variant="primary" block onClick={() => {
            setBootError(null);
            setBooted(false);
          }}>
          Thử lại
        </Button>
      </div>
    );
  }
  if (!booted) return <Spinner label="Đang chuẩn bị dữ liệu…" />;
  return <Ctx.Provider value={{ userId: session.user.id, signOut }}>{children}</Ctx.Provider>;
}

export function OfflineScreen() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <IconWifiOff className="mx-auto mb-3 size-10 text-muted" />
        <h1 className="mb-2 text-xl font-semibold">Cần kết nối mạng</h1>
        <p className="mb-5 text-sm text-muted">App lưu dữ liệu trên Supabase và không hỗ trợ dùng offline. Bật Wi-Fi hoặc 4G rồi thử lại.</p>
        <Button variant="primary" onClick={() => location.reload()}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
