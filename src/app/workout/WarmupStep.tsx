import { useEffect, useRef, useState } from 'react';
import { saveWarmup } from '@/data/api';
import type { TemplateWarmup } from '@/engine/plan-schema';
import type { ExerciseRow } from '@/engine/types';
import { beep, useNow } from '@/lib/hooks';
import { Button, Card, ExerciseImg, Field, Input } from '@/ui/components';

/** ② Warm-up: light cardio timer + joint checklist (§4.8). */
export function WarmupStep({
  sessionId,
  warmup,
  cardioExercise,
  onDone,
}: {
  sessionId: string;
  warmup: TemplateWarmup | null;
  cardioExercise: ExerciseRow | undefined;
  onDone: () => void;
}) {
  const plannedMin = warmup?.cardio?.minutes ?? 10;
  const [endAt, setEndAt] = useState<number | null>(null);
  const [minutes, setMinutes] = useState(plannedMin);
  const [speed, setSpeed] = useState('');
  const [mobilityDone, setMobilityDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const now = useNow(500);
  const beeped = useRef(false);
  const left = endAt ? Math.max(0, endAt - now) : plannedMin * 60_000;

  useEffect(() => {
    if (endAt && left === 0 && !beeped.current) {
      beeped.current = true;
      beep();
    }
  }, [endAt, left]);

  async function finish(skipped: boolean) {
    setBusy(true);
    const sp = speed.replace(',', '.').split(/[-–]/).map(Number).filter((n) => !Number.isNaN(n) && n > 0);
    await saveWarmup(sessionId, {
      cardio: warmup?.cardio
        ? {
            exercise: warmup.cardio.exercise,
            minutes: skipped ? 0 : minutes,
            speed_kmh_min: sp[0] ?? warmup.cardio.speed_kmh_min,
            speed_kmh_max: sp[1] ?? sp[0] ?? warmup.cardio.speed_kmh_max,
            done: !skipped,
          }
        : null,
      mobility_done: skipped ? false : mobilityDone,
      skipped,
    });
    setBusy(false);
    onDone();
  }

  const mm = Math.floor(left / 60_000);
  const ss = Math.floor((left % 60_000) / 1000);

  return (
    <div>
      <h2 className="mb-3 text-[26px] font-bold tracking-tight">Khởi động</h2>
      {warmup?.cardio && (
        <Card>
          <ExerciseImg svg={cardioExercise?.illustration_svg} name={cardioExercise?.name_vi ?? ''} className="mb-3" />
          <div className="mb-1 font-semibold">{cardioExercise?.name_vi ?? warmup.cardio.exercise}</div>
          <div className="mb-3 text-sm text-muted">
            {plannedMin} phút · {String(warmup.cardio.speed_kmh_min).replace('.', ',')}–{warmup.cardio.speed_kmh_max} km/h
          </div>
          <div className="tabular text-accent mb-4 text-center text-7xl font-bold tracking-tight" aria-label="Đồng hồ khởi động">
            {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
          </div>
          {endAt === null ? (
            <Button variant="primary" block size="lg" onClick={() => setEndAt(Date.now() + plannedMin * 60_000)}>
              Bắt đầu đếm giờ
            </Button>
          ) : (
            <Button block onClick={() => setEndAt(null)}>
              Đặt lại
            </Button>
          )}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Số phút đã đi">
              <Input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} />
            </Field>
            <Field label="Tốc độ (km/h)">
              <Input inputMode="decimal" placeholder="3,5-5" value={speed} onChange={(e) => setSpeed(e.target.value)} />
            </Field>
          </div>
        </Card>
      )}
      {warmup && warmup.mobility.length > 0 && (
        <Card>
          <label className="flex items-start gap-3">
            <input type="checkbox" className="mt-1 size-6 accent-[var(--accent)]" checked={mobilityDone} onChange={(e) => setMobilityDone(e.target.checked)} />
            <span>
              <span className="block font-semibold">Khởi động khớp</span>
              <span className="text-sm text-muted">{warmup.mobility.join(' · ')}</span>
            </span>
          </label>
        </Card>
      )}
      <Button variant="primary" size="xl" block disabled={busy} onClick={() => void finish(false)}>
        Tiếp →
      </Button>
      <Button variant="ghost" block className="mt-2" disabled={busy} onClick={() => void finish(true)}>
        Bỏ qua khởi động
      </Button>
    </div>
  );
}
