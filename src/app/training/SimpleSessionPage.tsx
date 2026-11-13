import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { logSimpleSession, skipScheduledDay } from '@/data/api';
import { qk, useActivePlan, useInvalidate, useTraining, useWeights } from '@/data/queries';
import { formatVN, type IsoDate, todayVN } from '@/engine/dates';
import { INTENSITIES, type Intensity } from '@/engine/plan-schema';
import { BADMINTON_SUBSTITUTES, type LightKind, replacedNote, scheduledOpenOn, SESSION_KIND_LABEL, type SessionKind } from '@/engine/schedule';
import { estimateSessionKcal } from '@/engine/workout-summary';
import { Banner, Button, Card, Chip, ErrorBox, Field, Input, Page } from '@/ui/components';

const INTENSITY_LABEL: Record<Intensity, string> = { light: 'Nhẹ', moderate: 'Vừa', hard: 'Nặng' };
const DEFAULT_MIN: Record<string, number> = { badminton: 75, walk: 35, zone2: 30, core: 12 };
/** Replacing a badminton session (?thay=badminton): similar length. */
const SUBSTITUTE_MIN: Record<string, number> = { walk: 50, zone2: 45 };

/** Log badminton / walk / zone 2 / core: duration + intensity, estimated calories. */
export function SimpleSessionPage() {
  const { kind = 'badminton' } = useParams();
  const k = kind as SessionKind;
  const [params] = useSearchParams();
  const replacesBadminton = params.get('thay') === 'badminton';
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const plan = useActivePlan();
  const weights = useWeights();
  const training = useTraining();
  const today = todayVN();
  const initialDate = params.get('ngay');
  const [date, setDate] = useState<IsoDate>(initialDate && initialDate <= today ? initialDate : today);
  const [minutes, setMinutes] = useState((replacesBadminton ? SUBSTITUTE_MIN[k] : undefined) ?? DEFAULT_MIN[k] ?? 30);
  const [replace, setReplace] = useState(replacesBadminton);
  const [intensity, setIntensity] = useState<Intensity>('light');
  const [warmupDone, setWarmupDone] = useState(true);
  const [note, setNote] = useState(replacesBadminton ? 'Thay buổi cầu lông' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const kcal = plan.data
    ? estimateSessionKcal({ kind: k, duration_min: minutes, badminton_intensity: k === 'badminton' ? intensity : null }, plan.data.content, weights.data?.at(-1)?.weight_kg ?? 81.7)
    : 0;

  const canReplace =
    BADMINTON_SUBSTITUTES.includes(k as LightKind) &&
    !!plan.data &&
    scheduledOpenOn(plan.data.content, date, (training.data?.sessions ?? []).map((s) => ({ date: s.session_date, kind: s.kind }))) === 'badminton';

  async function save() {
    setBusy(true);
    try {
      if (canReplace && replace) {
        await skipScheduledDay({ date, kind: 'badminton', note: replacedNote('badminton', k) });
      }
      await logSimpleSession({ date, kind: k, minutes, intensity: k === 'badminton' ? intensity : null, estKcal: kcal, note: note.trim() || null, warmupDone: k === 'badminton' ? warmupDone : null });
      await invalidate(qk.training);
      nav('/training', { replace: true });
    } catch (e) {
      await invalidate(qk.training);
      setError(e);
      setBusy(false);
    }
  }

  return (
    <Page title={`Ghi ${SESSION_KIND_LABEL[k]}`} back>
      <Card>
        <Field label="Ngày">
          <Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
        {canReplace && (
          <label className="mb-3 flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            Thay buổi cầu lông {date === today ? 'hôm nay' : formatVN(date)} (ghi cầu lông là nghỉ)
          </label>
        )}
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
