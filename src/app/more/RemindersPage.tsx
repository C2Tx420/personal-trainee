import { useState } from 'react';
import { sendTestPush, subscribePush, updateNotification } from '@/data/api';
import { qk, useInvalidate, useNotificationSettings } from '@/data/queries';
import { REMINDER_LABEL, type ReminderKind } from '@/engine/reminders';
import { Banner, Button, Card, Input, Page, Spinner, Toggle } from '@/ui/components';

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function RemindersPage() {
  const settings = useNotificationSettings();
  const invalidate = useInvalidate();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const perm = 'Notification' in window ? Notification.permission : 'unsupported';

  if (settings.isLoading) return <Page title="Nhắc nhở" back="/more"><Spinner /></Page>;

  async function patch(id: string, p: Parameters<typeof updateNotification>[1]) {
    await updateNotification(id, p);
    await invalidate(qk.notifications);
  }

  return (
    <Page title="Nhắc nhở" back="/more">
      <Card>
        <div className="mb-1 font-semibold">Thông báo đẩy trên thiết bị này</div>
        <p className="mb-3 text-sm text-muted">
          Trạng thái: <b>{perm === 'granted' ? 'đã cho phép' : perm === 'denied' ? 'đã chặn' : perm === 'unsupported' ? 'không hỗ trợ' : 'chưa bật'}</b>. iPhone: cần “Thêm vào MH chính” và mở app từ icon (iOS 16.4+).
          Nội dung nhắc luôn chung chung, không có số liệu sức khỏe.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="primary"
            onClick={async () => {
              try {
                await subscribePush();
                setMsg({ tone: 'ok', text: 'Đã bật thông báo cho thiết bị này' });
              } catch (e) {
                setMsg({ tone: 'bad', text: (e as Error).message });
              }
            }}
          >
            Bật thông báo
          </Button>
          <Button
            onClick={async () => {
              try {
                const n = await sendTestPush();
                setMsg({ tone: n > 0 ? 'ok' : 'bad', text: n > 0 ? 'Đã gửi thông báo thử' : 'Chưa có thiết bị nào bật thông báo' });
              } catch (e) {
                setMsg({ tone: 'bad', text: (e as Error).message });
              }
            }}
          >
            Gửi thử
          </Button>
        </div>
      </Card>
      {msg && <Banner tone={msg.tone}>{msg.text}</Banner>}
      {(settings.data ?? []).map((s) => (
        <Card key={s.id}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{REMINDER_LABEL[s.kind as ReminderKind] ?? s.kind}</div>
              <div className="text-xs text-muted">
                {s.kind === 'workout' && '17:30 ngày tạ · 17:00 cầu lông · 10:30 CN (theo lịch)'}
                {s.kind === 'water' && `Mỗi ${(s.interval_min ?? 120) / 60} giờ, ${s.window_start?.slice(0, 5)}–${s.window_end?.slice(0, 5)}`}
                {s.kind === 'inbody' && '30 ngày sau lần đo gần nhất'}
                {s.kind === 'photos' && '14 ngày sau lần chụp gần nhất'}
                {s.kind === 'goal' && '7 ngày trước mỗi mốc'}
                {s.weekdays && s.weekdays.length > 0 && ` · ${s.weekdays.map((d) => WD[d - 1]).join(', ')}`}
              </div>
            </div>
            {s.time_of_day && (
              <Input type="time" aria-label={`Giờ ${s.kind}`} className="w-28" value={s.time_of_day.slice(0, 5)} onChange={(e) => void patch(s.id, { time_of_day: e.target.value })} />
            )}
            <Toggle label={`Bật ${s.kind}`} checked={s.enabled} onChange={(v) => void patch(s.id, { enabled: v })} />
          </div>
        </Card>
      ))}
    </Page>
  );
}
