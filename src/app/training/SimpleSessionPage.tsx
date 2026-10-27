import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { logSimpleSession } from '@/data/api';
import { qk, useActivePlan, useInvalidate, useWeights } from '@/data/queries';
import { todayVN } from '@/engine/dates';
import { INTENSITIES, type Intensity } from '@/engine/plan-schema';
import { SESSION_KIND_LABEL, type SessionKind } from '@/engine/schedule';
import { estimateSessionKcal } from '@/engine/workout-summary';
import { Banner, Button, Card, Chip, ErrorBox, Field, Input, Page } from '@/ui/components';

const INTENSITY_LABEL: Record<Intensity, string> = { light: 'Nhẹ', moderate: 'Vừa', hard: 'Nặng' };
const DEFAULT_MIN: Record<string, number> = { badminton: 75, walk: 35, zone2: 30, core: 12 };

/** Ghi cầu lông / đi bộ / zone 2 / core: thời lượng + cường độ, calo ước tính. */
export function SimpleSessionPage() {
  const { kind = 'badminton' } = useParams();
  const k = kind as SessionKind;
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const plan = useActivePlan();
  const weights = useWeights();
  const [date, setDate] = useState(todayVN());
  const [minutes, setMinutes] = useState(DEFAULT_MIN[k] ?? 30);
  const [intensity, setIntensity] = useState<Intensity>('light');
  const [warmupDone, setWarmupDone] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const kcal = plan.data
    ? estimateSessionKcal({ kind: k, duration_min: minutes, badminton_intensity: k === 'badminton' ? intensity : null }, plan.data.content, weights.data?.at(-1)?.weight_kg ?? 81.7)
    : 0;

  async function save() {
    setBusy(true);
    try {
      await logSimpleSession({ date, kind: k, minutes, intensity: k === 'badminton' ? intensity : null, estKcal: kcal, note: note.trim() || null, warmupDone: k === 'badminton' ? warmupDone : null });
      await invalidate(qk.training);
      nav('/training', { replace: true });
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  }

  return (
    <Page title={`Ghi ${SESSION_KIND_LABEL[k]}`} back>
      <Card>
        <Field label="Ngày">
          <Input type="date" value={date} max={todayVN()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Thời lượng (phút)">
          <Input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} />
        </Field>
        {k === 'badminton' && (
          <>
            <span className="mb-1 block text-sm font-medium text-muted">Cường độ</span>
            <div className="mb-3 flex gap-2">
              {INTENSITIES.map((i) => (
                <Chip key={i} active={intensity === i} onClick={() => setIntensity(i)}>{INTENSITY_LABEL[i]}</Chip>
              ))}
            </div>
            <label className="mb-3 flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={warmupDone} onChange={(e) => setWarmupDone(e.target.checked)} />
              Đã khởi động khớp 8 phút
            </label>
          </>
        )}
        <Field label="Ghi chú">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="tabular text-lg font-semibold">≈ {kcal} kcal</div>
        <p className="text-xs text-muted">Calo tập ước tính — để tham khảo, không ăn bù.</p>
      </Card>
      {k === 'badminton' && <Banner tone="info">Nhớ: Legs và cầu lông cách nhau ít nhất 1 ngày.</Banner>}
      {error ? <ErrorBox error={error} /> : null}
      <Button variant="primary" size="lg" block disabled={busy || minutes <= 0} onClick={() => void save()}>
        {busy ? 'Đang lưu…' : 'Lưu'}
      </Button>
    </Page>
  );
}
