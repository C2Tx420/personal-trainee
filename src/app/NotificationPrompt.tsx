import { useEffect, useState } from 'react';
import { subscribePush } from '@/data/api';
import { Banner, Button, Sheet } from '@/ui/components';

/**
 * First run on a device: ask to turn on reminders right away instead of leaving it to
 * Thêm → Nhắc nhở. On iPhone outside the home-screen app, push isn't available at all →
 * explain "Thêm vào MH chính" instead. "Để sau" asks again after a week.
 */
const KEY = 'pt.push-prompt';
const ASK_AGAIN_MS = 7 * 24 * 3600_000;
let memory: string | null = null;

function snoozed(): boolean {
  let v: string | null = memory;
  try {
    v = localStorage.getItem(KEY) ?? memory;
  } catch {
    /* blocked storage → in-memory only */
  }
  return v !== null && Date.now() - Number(v) < ASK_AGAIN_MS;
}

function snooze(): void {
  memory = String(Date.now());
  try {
    localStorage.setItem(KEY, memory);
  } catch {
    /* in-memory covers this session */
  }
}

const pushSupported = () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

function mode(): 'ask' | 'install' | null {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return 'install';
  if (!pushSupported()) return null;
  return Notification.permission === 'default' ? 'ask' : null;
}

export function NotificationPrompt({ blocked }: { blocked: boolean }) {
  const [state, setState] = useState(() => (snoozed() ? null : mode()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Allowed earlier but this device has no subscription (new install, cleared data) → re-subscribe quietly
  useEffect(() => {
    if (!pushSupported() || Notification.permission !== 'granted') return;
    void navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => (sub ? undefined : subscribePush()))
      .catch(() => undefined);
  }, []);

  const later = () => {
    snooze();
    setState(null);
  };

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      await subscribePush();
      setState(null);
    } catch (e) {
      if (pushSupported() && Notification.permission === 'denied') {
        snooze();
        setError('Đã chặn thông báo — mở Cài đặt của máy → Thông báo → Personal Trainee để bật lại.');
      } else setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!state && !blocked} onClose={later} title={state === 'install' ? 'Thêm app vào màn hình chính' : 'Bật nhắc nhở'}>
      {state === 'install' ? (
        <>
          <p className="mb-3 text-sm text-muted">
            iPhone chỉ nhận thông báo nhắc tập khi app được mở từ icon trên màn hình chính (iOS 16.4+):
          </p>
          <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">
            <li>Trong Safari, bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên lên).</li>
            <li>Chọn <b>Thêm vào MH chính</b> → Thêm.</li>
            <li>Mở Personal Trainee từ icon mới, app sẽ hỏi bật thông báo.</li>
          </ol>
          <Button variant="primary" block onClick={later}>Đã hiểu</Button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted">
            Nhắc giờ tập theo lịch, cân sáng thứ Hai, chụp ảnh 2 tuần/lần và review tuần. Nội dung nhắc luôn chung chung, không có số liệu sức khỏe.
            Chỉnh giờ hoặc tắt từng loại ở Thêm → Nhắc nhở.
          </p>
          {error && <Banner tone="bad">{error}</Banner>}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={later}>Để sau</Button>
            <Button variant="primary" disabled={busy} onClick={() => void enable()}>
              {busy ? 'Đang bật…' : 'Bật thông báo'}
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
