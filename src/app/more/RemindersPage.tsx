import { useState } from 'react';
import { sendTestPush, subscribePush, updateNotification } from '@/data/api';
import { qk, useInvalidate, useNotificationSettings } from '@/data/queries';
import { REMINDER_LABEL, type ReminderKind } from '@/engine/reminders';
import { t } from '@/i18n';
import { Banner, Button, Card, Input, Page, Skeleton, Toggle } from '@/ui/components';

const WD = [t('T2'), t('T3'), t('T4'), t('T5'), t('T6'), t('T7'), t('CN')];

// display copy of the shared REMINDER_LABEL, which stays Vietnamese for the server's push text
const KIND_LABEL: Record<ReminderKind, string> = {
  workout: t('Buổi tập'),
  water: t('Uống nước'),
  weigh_in: t('Cân hằng tuần'),
  measurements: t('Số đo cơ thể'),
  inbody: t('Đo InBody'),
  photos: t('Chụp ảnh tiến độ'),
  goal: t('Sắp tới mốc mục tiêu'),
  weekly_review: t('Review tuần với Claude Code'),
  missed_workout: t('Chưa ghi buổi tập'),
};

export function RemindersPage() {
  const settings = useNotificationSettings();
  const invalidate = useInvalidate();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';

  if (settings.isLoading) return <Page title={t('Nhắc nhở')} back="/more"><Skeleton /></Page>;

  async function patch(id: string, p: Parameters<typeof updateNotification>[1]) {
    await updateNotification(id, p);
    await invalidate(qk.notifications);
  }

  return (
    <Page title={t('Nhắc nhở')} back="/more">
      <Card>
        <div className="mb-1 font-semibold">{t('Thông báo đẩy trên thiết bị này')}</div>
        <p className="mb-3 text-sm text-muted">
          {t('Trạng thái:')} <b>{perm === 'granted' ? t('đã cho phép') : perm === 'denied' ? t('đã chặn') : perm === 'unsupported' ? t('không hỗ trợ') : t('chưa bật')}</b>. {t('iPhone: cần “Thêm vào MH chính” và mở app từ icon (iOS 16.4+).')}{' '}
          {t('Nội dung nhắc luôn chung chung, không có số liệu sức khỏe.')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            onClick={async () => {
              try {
                await subscribePush();
                setMsg({ tone: 'ok', text: t('Đã bật thông báo cho thiết bị này') });
              } catch (e) {
                setMsg({ tone: 'bad', text: (e as Error).message });
              }
            }}
          >
            {t('Bật thông báo')}
          </Button>
          <Button
            onClick={async () => {
              try {
                const n = await sendTestPush();
                setMsg({ tone: n > 0 ? 'ok' : 'bad', text: n > 0 ? t('Đã gửi thông báo thử') : t('Chưa có thiết bị nào bật thông báo') });
              } catch (e) {
                setMsg({ tone: 'bad', text: (e as Error).message });
              }
            }}
          >
            {t('Gửi thử')}
          </Button>
        </div>
      </Card>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      {(settings.data ?? []).map((s) => (
        <Card key={s.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{KIND_LABEL[s.kind as ReminderKind] ?? REMINDER_LABEL[s.kind as ReminderKind] ?? s.kind}</div>
              <div className="text-xs text-muted">
                {s.kind === 'workout' && t('17:30 ngày tạ · 17:00 cầu lông · 10:30 CN (theo lịch)')}
                {s.kind === 'water' && t('Mỗi {h} giờ, {from}–{to}', { h: (s.interval_min ?? 120) / 60, from: String(s.window_start?.slice(0, 5)), to: String(s.window_end?.slice(0, 5)) })}
                {s.kind === 'inbody' && t('30 ngày sau lần đo gần nhất')}
                {s.kind === 'photos' && t('14 ngày sau lần chụp gần nhất')}
                {s.kind === 'goal' && t('7 ngày trước mỗi mốc')}
                {s.kind === 'missed_workout' && t('Ngày có buổi tạ mà chưa ghi gì (không sau 22:30; bỏ 3 buổi liền thì thôi nhắc)')}
                {s.weekdays && s.weekdays.length > 0 && ` · ${s.weekdays.map((d) => WD[d - 1]).join(', ')}`}
              </div>
            </div>
            {s.time_of_day && (
              <Input type="time" aria-label={t('Giờ {kind}', { kind: s.kind })} className="w-28" value={s.time_of_day.slice(0, 5)} onChange={(e) => void patch(s.id, { time_of_day: e.target.value })} />
            )}
            <Toggle label={t('Bật {kind}', { kind: s.kind })} checked={s.enabled} onChange={(v) => void patch(s.id, { enabled: v })} />
          </div>
        </Card>
      ))}
    </Page>
  );
}
