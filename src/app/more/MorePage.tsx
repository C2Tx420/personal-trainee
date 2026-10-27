import { useNavigate } from 'react-router';
import { useAuth } from '@/auth/AuthGate';
import { usePlans, useReviews } from '@/data/queries';
import { APP_VERSION } from '@/lib/version';
import { Badge, Card, Page } from '@/ui/components';
import { IconArchive, IconBell, IconChat, IconInfo, IconLayers, IconLock } from '@/ui/icons';

export function MorePage() {
  const nav = useNavigate();
  const { lock } = useAuth();
  const plans = usePlans();
  const reviews = useReviews();
  const drafts = (plans.data ?? []).filter((p) => p.status === 'draft').length;
  const unread = (reviews.data ?? []).filter((r) => !r.is_read).length;
  const rows: { to: string; icon: React.ReactNode; label: string; sub: string; badge?: React.ReactNode }[] = [
    { to: '/more/plans', icon: <IconLayers className="size-5" />, label: 'Lộ trình', sub: 'Lịch sử phiên bản, so sánh, duyệt', badge: drafts ? <Badge tone="accent">{drafts} chờ duyệt</Badge> : null },
    { to: '/more/reviews', icon: <IconChat className="size-5" />, label: 'Nhận xét coach', sub: 'Review tuần của Claude Code', badge: unread ? <Badge tone="info">{unread} mới</Badge> : null },
    { to: '/more/reminders', icon: <IconBell className="size-5" />, label: 'Nhắc nhở', sub: 'Thông báo đẩy, giờ nhắc' },
    { to: '/more/backup', icon: <IconArchive className="size-5" />, label: 'Sao lưu', sub: 'Xuất / nhập JSON' },
    { to: '/more/about', icon: <IconInfo className="size-5" />, label: 'Cài đặt & giới thiệu', sub: `Phiên bản ${APP_VERSION}` },
  ];
  return (
    <Page title="Thêm">
      {rows.map((r) => (
        <Card key={r.to} onClick={() => nav(r.to)}>
          <div className="flex items-center gap-3">
            <span className="glass-subtle rounded-ctl grid size-10 place-items-center text-accent">{r.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{r.label}</div>
              <div className="truncate text-sm text-muted">{r.sub}</div>
            </div>
            {r.badge}
            <span className="text-muted">›</span>
          </div>
        </Card>
      ))}
      <Card onClick={lock}>
        <div className="flex items-center gap-3">
          <span className="glass-subtle rounded-ctl grid size-10 place-items-center text-accent"><IconLock className="size-5" /></span>
          <div className="font-semibold">Khoá app ngay</div>
        </div>
      </Card>
    </Page>
  );
}
