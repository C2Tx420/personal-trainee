import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthGate';
import { useAppMeta, useInProgress } from '@/data/queries';
import { useOnline } from '@/lib/hooks';
import { MIN_SCHEMA_VERSION } from '@/lib/version';
import { Banner, cx } from '@/ui/components';
import { UpdatePrompt } from './UpdatePrompt';

const TABS = [
  { to: '/', label: 'Hôm nay', icon: '☀︎', end: true },
  { to: '/training', label: 'Tập', icon: '🏋︎' },
  { to: '/exercises', label: 'Bài tập', icon: '📖' },
  { to: '/body', label: 'Cơ thể', icon: '⚖︎' },
  { to: '/more', label: 'Thêm', icon: '☰' },
];

export function AppShell() {
  const online = useOnline();
  const { lock } = useAuth();
  const meta = useAppMeta();
  const inProgress = useInProgress();
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  const dbOutdated = meta.data?.schema_version && meta.data.schema_version < MIN_SCHEMA_VERSION;

  return (
    <div className="min-h-dvh">
      {!online && (
        <div className="sticky top-0 z-40 bg-warn px-4 py-1.5 text-center text-sm font-semibold text-white" role="alert">
          Mất kết nối — không lưu được cho tới khi có mạng
        </div>
      )}
      <button
        aria-label="Khoá app"
        onClick={lock}
        className="fixed top-[max(env(safe-area-inset-top),0px)] right-3 z-30 mt-2 grid size-10 place-items-center rounded-full text-lg text-muted active:bg-card-2"
      >
        🔒
      </button>
      <div className="mx-auto max-w-xl px-4 pt-2 empty:hidden">
        {dbOutdated && <Banner tone="bad">Database cần chạy migration mới ({meta.data?.schema_version} &lt; {MIN_SCHEMA_VERSION})</Banner>}
        {inProgress.data && !loc.pathname.startsWith('/workout') && (
          <Banner tone="accent" onClick={() => nav(`/workout/${inProgress.data!.id}`)} action={<span className="font-bold">Tiếp tục ›</span>}>
            Đang có buổi tập dở
          </Banner>
        )}
      </div>
      <Outlet />
      <UpdatePrompt blocked={!!inProgress.data} />
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-xl">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cx('flex flex-1 flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium', isActive ? 'text-accent' : 'text-muted')
              }
            >
              <span className="text-xl leading-none" aria-hidden>
                {t.icon}
              </span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
