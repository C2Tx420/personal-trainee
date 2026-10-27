import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { bootstrap } from '@/data/api';
import { queryClient } from '@/data/queries';
import { useOnline } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { Banner, Button, Spinner } from '@/ui/components';
import { LoginPage } from './LoginPage';
import { PinLock } from './PinLock';

const IDLE_MS = 5 * 60_000;

type AuthCtx = { userId: string; lock: () => void; signOut: () => Promise<void> };
const Ctx = createContext<AuthCtx | null>(null);

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth ngoài AuthGate');
  return c;
}

/**
 * Cổng vào app: chưa đăng nhập → Login; đăng nhập rồi → luôn khoá PIN khi mở app,
 * sau 5 phút không thao tác, hoặc khi app ở nền > 5 phút (§3).
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const online = useOnline();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [locked, setLocked] = useState(true);
  const [booted, setBooted] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const lastActive = useRef(Date.now());
  const hiddenAt = useRef<number | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const lock = useCallback(() => setLocked(true), []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' }).catch(() => supabase.auth.signOut({ scope: 'local' }));
    queryClient.clear();
    setBooted(false);
    setLocked(true);
  }, []);

  // Tự khoá: không thao tác 5 phút / ở nền quá 5 phút
  useEffect(() => {
    if (locked) return;
    const touch = () => (lastActive.current = Date.now());
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    const timer = setInterval(() => {
      if (Date.now() - lastActive.current > IDLE_MS) setLocked(true);
    }, 5_000);
    const onVis = () => {
      if (document.visibilityState === 'hidden') hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > IDLE_MS) setLocked(true);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [locked]);

  // Bootstrap dữ liệu seed sau khi mở khoá lần đầu
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
        onUnlock={() => {
          lastActive.current = Date.now();
          setLocked(false);
        }}
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
  return <Ctx.Provider value={{ userId: session.user.id, lock, signOut }}>{children}</Ctx.Provider>;
}

export function OfflineScreen() {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <div className="mb-3 text-5xl">📡</div>
        <h1 className="mb-2 text-xl font-semibold">Cần kết nối mạng</h1>
        <p className="mb-5 text-sm text-muted">App lưu dữ liệu trên Supabase và không hỗ trợ dùng offline. Bật Wi-Fi hoặc 4G rồi thử lại.</p>
        <Button variant="primary" onClick={() => location.reload()}>
          Thử lại
        </Button>
      </div>
    </div>
  );
}
