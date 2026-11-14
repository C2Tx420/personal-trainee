import { useNavigate } from 'react-router';
import { usePlans, useReviews } from '@/data/queries';
import { getLocale, type Locale, saveLocale, t } from '@/i18n';
import { APP_VERSION } from '@/lib/version';
import { Badge, Card, Page, SectionTitle, Segmented } from '@/ui/components';
import { IconArchive, IconBell, IconChat, IconInfo, IconLayers, IconSparkle } from '@/ui/icons';
import { RELEASES, releaseDate, useWhatsNewUnseen } from '../whats-new';

export function MorePage() {
  const nav = useNavigate();
  const plans = usePlans();
  const reviews = useReviews();
  const drafts = (plans.data ?? []).filter((p) => p.status === 'draft').length;
  const unread = (reviews.data ?? []).filter((r) => !r.is_read).length;
  const whatsNew = useWhatsNewUnseen();
  const rows: { to: string; icon: React.ReactNode; label: string; sub: string; badge?: React.ReactNode }[] = [
    { to: '/more/plans', icon: <IconLayers className="size-5" />, label: t('Lộ trình'), sub: t('Lịch sử phiên bản, so sánh, duyệt'), badge: drafts ? <Badge tone="accent">{t('{n} chờ duyệt', { n: drafts })}</Badge> : null },
    { to: '/more/reviews', icon: <IconChat className="size-5" />, label: t('Nhận xét coach'), sub: t('Review tuần của Claude Code'), badge: unread ? <Badge tone="info">{t('{n} mới', { n: unread })}</Badge> : null },
    { to: '/more/reminders', icon: <IconBell className="size-5" />, label: t('Nhắc nhở'), sub: t('Thông báo đẩy, giờ nhắc') },
    { to: '/more/backup', icon: <IconArchive className="size-5" />, label: t('Sao lưu'), sub: t('Xuất / nhập JSON') },
    { to: '/more/whats-new', icon: <IconSparkle className="size-5" />, label: t('Có gì mới'), sub: `${releaseDate(RELEASES[0])} · ${RELEASES[0].title}`, badge: whatsNew ? <Badge tone="accent">{t('Mới')}</Badge> : null },
    { to: '/more/about', icon: <IconInfo className="size-5" />, label: t('Cài đặt & giới thiệu'), sub: t('Phiên bản {v}', { v: APP_VERSION }) },
  ];
  return (
    <Page title={t('Thêm')}>
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
      <SectionTitle>Ngôn ngữ / Language</SectionTitle>{/* i18n-ignore: bilingual so either reader finds it */}
      <Segmented<Locale>
        value={getLocale()}
        onChange={(l) => {
          if (l === getLocale()) return;
          saveLocale(l);
          location.reload();
        }}
        options={[
          { value: 'vi', label: 'Tiếng Việt' }, // i18n-ignore: each language names itself
          { value: 'en', label: 'English' },
        ]}
      />
    </Page>
  );
}
