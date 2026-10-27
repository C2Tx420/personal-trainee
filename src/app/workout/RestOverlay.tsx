import { useEffect, useRef } from 'react';
import { beep, notifyLocal, useNow } from '@/lib/hooks';
import { Button } from '@/ui/components';

/**
 * Full-screen rest timer. Based on the end timestamp (not a plain setInterval
 * countdown), so it stays correct after locking and unlocking the screen. On finish: sound + notification.
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
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[rgba(9,12,19,0.72)] p-6 backdrop-blur-2xl backdrop-saturate-150" role="timer" aria-label="Đồng hồ nghỉ">
      <div className="mb-2 text-xs font-semibold tracking-[0.3em] text-muted uppercase">Nghỉ</div>
      <div className="tabular text-accent mb-6 text-[104px] leading-none font-bold tracking-tight">
        {Math.floor(s / 60)}:{String(s % 60).padStart(2, '0')}
      </div>
      <div className="glass-subtle mb-8 max-w-xs rounded-full px-4 py-2 text-center text-sm text-muted">Tiếp theo: {next}</div>
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
