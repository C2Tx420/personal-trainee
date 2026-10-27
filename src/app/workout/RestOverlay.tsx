import { useEffect, useRef } from 'react';
import { beep, notifyLocal, useNow } from '@/lib/hooks';
import { Button } from '@/ui/components';

/**
 * Đồng hồ nghỉ toàn màn. Tính theo thời điểm kết thúc (không đếm bằng setInterval
 * thuần) nên khoá màn hình rồi mở lại vẫn đúng. Hết giờ: âm báo + thông báo.
 */
export function RestOverlay({
  endsAt,
  next,
  onAdd30,
  onSkip,
}: {
  endsAt: number;
  next: string;
  onAdd30: () => void;
  onSkip: () => void;
}) {
  const now = useNow(250);
  const left = Math.max(0, endsAt - now);
  const fired = useRef(false);

  useEffect(() => {
    if (left === 0 && !fired.current) {
      fired.current = true;
      beep();
      void notifyLocal('Hết giờ nghỉ', next);
      onSkip();
    }
  }, [left, next, onSkip]);

  const s = Math.ceil(left / 1000);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-bg/97 p-6 backdrop-blur" role="timer" aria-label="Đồng hồ nghỉ">
      <div className="mb-2 text-sm font-semibold tracking-wide text-muted uppercase">Nghỉ</div>
      <div className="tabular mb-6 text-8xl font-bold">
        {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
      </div>
      <div className="mb-8 max-w-xs text-center text-sm text-muted">Tiếp theo: {next}</div>
      <div className="flex w-full max-w-xs gap-3">
        <Button size="lg" block onClick={onAdd30}>
          +30s
        </Button>
        <Button variant="primary" size="lg" block onClick={onSkip}>
          Bỏ qua
        </Button>
      </div>
    </div>
  );
}
