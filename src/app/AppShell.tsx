import { useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAppMeta, useInProgress } from '@/data/queries';
import { useOnline } from '@/lib/hooks';
import { MIN_SCHEMA_VERSION } from '@/lib/version';
import { Banner, cx, PageBanners } from '@/ui/components';
import { IconBook, IconDumbbell, IconMore, IconPulse, IconToday } from '@/ui/icons';
import { UpdatePrompt } from './UpdatePrompt';

const TABS = [
  { to: '/', label: 'Hôm nay', Icon: IconToday, end: true },
  { to: '/training', label: 'Tập', Icon: IconDumbbell },
  { to: '/exercises', label: 'Bài tập', Icon: IconBook },
  { to: '/body', label: 'Cơ thể', Icon: IconPulse },
  { to: '/more', label: 'Thêm', Icon: IconMore },
];

export function AppShell() {
  const online = useOnline();
  const meta = useAppMeta();
  const inProgress = useInProgress();
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);

  const dbOutdated = meta.data?.schema_version && meta.data.schema_version < MIN_SCHEMA_VERSION;

  const banners = (
    <>
      {dbOutdated && <Banner tone="bad">Database cần chạy migration mới ({meta.data?.schema_version} &lt; {MIN_SCHEMA_VERSION})</Banner>}
      {inProgress.data && !loc.pathname.startsWith('/workout') && (
        <Banner tone="accent" onClick={() => nav(`/workout/${inProgress.data!.id}`)} action={<span className="font-bold">Tiếp tục ›</span>}>
          Đang có buổi tập dở
        </Banner>
      )}
    </>
  );

  return (
    <div className="min-h-dvh">
      {!online && (
        <div className="sticky top-0 z-40 bg-warn/90 px-4 pt-[calc(env(safe-area-inset-top)+0.375rem)] pb-1.5 text-center text-sm font-semibold text-black backdrop-blur" role="alert">
          Mất kết nối — không lưu được cho tới khi có mạng
        </div>
      )}
      <PageBanners value={banners}>
        <Outlet />
      </PageBanners>
      <UpdatePrompt blocked={!!inProgress.data} />
      <nav className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <div className="glass-strong mx-auto flex max-w-xl gap-1 rounded-[26px] p-1.5">
          {TABS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  'flex flex-1 flex-col items-center gap-0.5 rounded-[20px] pt-2 pb-1.5 text-[11px] font-semibold transition',
                  isActive ? 'bg-white/[0.1] text-fg shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cx('size-[22px]', isActive && 'text-accent')} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
