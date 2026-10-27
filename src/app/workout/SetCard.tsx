import { useState } from 'react';
import { type SetInput } from '@/data/api';
import { kgDeviates } from '@/engine/progression';
import { type ExerciseRow, type Feel, FEEL_LABEL, KG_CHANGE_LABEL, type KgChangeReason, type SessionItemRow, type SetRow } from '@/engine/types';
import { type PlannedSet, setLabel } from '@/engine/warmup';
import { Button, Chip, cx, Input, Stepper } from '@/ui/components';
import { fmtKg } from '../shared';

/**
 * Một hiệp đang tập: kg/lần (nút −/+), cảm giác, ghi chú, và — khi kg khác mục
 * tiêu — hàng chip lý do (④ §6.2). Dùng chung cho màn sửa hiệp đã ghi.
 */
export function SetCard({
  item,
  exercise,
  planned,
  workingTotal,
  initialKg,
  initialReason = null,
  existing,
  onSave,
  saveLabel = '✓ XONG HIỆP',
}: {
  item: SessionItemRow;
  exercise: ExerciseRow;
  planned: PlannedSet;
  workingTotal: number;
  initialKg: number | null;
  /** lý do đổi kg mang sang từ hiệp trước (khi kg cũng mang sang) */
  initialReason?: KgChangeReason | null;
  existing?: SetRow;
  onSave: (s: SetInput) => Promise<void>;
  saveLabel?: string;
}) {
  const timeBased = item.target.unit === 'seconds';
  const [kg, setKg] = useState<number | null>(existing?.weight_kg ?? initialKg);
  const [reps, setReps] = useState<number | null>(existing ? (timeBased ? existing.seconds : existing.reps) : planned.repMax);
  const [feel, setFeel] = useState<Feel | null>(existing?.feel ?? null);
  const [note, setNote] = useState(existing?.note ?? '');
  const [showNote, setShowNote] = useState(!!existing?.note);
  const [reason, setReason] = useState<KgChangeReason | null>(existing?.kg_change_reason ?? initialReason);
  const [reasonNote, setReasonNote] = useState(existing?.kg_change_note ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deviates = !timeBased && planned.setType === 'working' && kgDeviates(planned.targetKg, kg);
  const belowReps = !timeBased && reps !== null && reps < planned.repMin;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await onSave({
        id: existing?.id,
        session_id: item.session_id,
        session_item_id: item.id,
        exercise_id: item.exercise_id,
        set_type: planned.setType,
        set_index: planned.index,
        target_kg: planned.targetKg,
        target_rep_min: planned.repMin,
        target_rep_max: planned.repMax,
        reps: timeBased ? null : reps,
        seconds: timeBased ? reps : null,
        weight_kg: timeBased ? null : kg,
        kg_change_reason: deviates ? (reason ?? 'other') : null,
        kg_change_note: deviates ? reasonNote.trim() || null : null,
        feel,
        note: note.trim() || null,
        completed: true,
      });
    } catch (e) {
      setError(`Chưa lưu được — ${(e as Error).message}. Số đã nhập vẫn giữ, bấm lại để thử.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cx('rounded-2xl border-2 bg-card p-4', planned.setType === 'warmup' ? 'border-line' : 'border-accent')}>
      <div className="mb-3 flex items-baseline justify-between">
        <div className={cx('text-lg font-bold', planned.setType === 'warmup' && 'text-muted')}>
          {setLabel(planned, workingTotal)}
        </div>
        <div className="tabular text-sm text-muted">
          mục tiêu {planned.targetKg !== null && !timeBased ? `${fmtKg(planned.targetKg)}kg × ` : ''}
          {planned.repMin === planned.repMax ? planned.repMin : `${planned.repMin}–${planned.repMax}`}
          {timeBased ? ' giây' : ''}
        </div>
      </div>

      <div className="grid gap-3">
        {!timeBased && <Stepper label="kg" unit="kg" value={kg} onChange={setKg} step={exercise.load_step_kg || 2.5} allowEmpty />}
        <Stepper label={timeBased ? 'giây' : 'lần'} unit={timeBased ? 'giây' : 'lần'} value={reps} onChange={setReps} step={timeBased ? 5 : 1} />
      </div>

      {deviates && (
        <div className="mt-3 rounded-xl bg-warn-soft p-3" data-testid="kg-change">
          <div className="mb-2 text-sm font-semibold text-warn">
            Mục tiêu {fmtKg(planned.targetKg)}kg → thực tế {fmtKg(kg)}kg · vì sao?
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(KG_CHANGE_LABEL) as KgChangeReason[]).map((r) => (
              <Chip key={r} tone="warn" active={reason === r} onClick={() => setReason(r)}>
                {KG_CHANGE_LABEL[r]}
              </Chip>
            ))}
          </div>
          {(reason === 'other' || reasonNote) && (
            <Input className="mt-2" placeholder="Ghi thêm…" value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} />
          )}
        </div>
      )}
      {belowReps && <p className="mt-2 text-sm text-warn">Ít hơn {planned.repMin} lần mục tiêu</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {(Object.keys(FEEL_LABEL) as Feel[]).map((f) => (
          <Chip key={f} active={feel === f} tone={f === 'hard' ? 'bad' : f === 'easy' ? 'ok' : 'accent'} onClick={() => setFeel(feel === f ? null : f)}>
            {FEEL_LABEL[f]}
          </Chip>
        ))}
        <button type="button" aria-label="Ghi chú hiệp" onClick={() => setShowNote((v) => !v)} className="ml-auto grid size-10 place-items-center rounded-full bg-card-2">
          📝
        </button>
      </div>
      {showNote && <Input className="mt-2" placeholder="Ghi chú hiệp (vd. đau vai trái)" value={note} onChange={(e) => setNote(e.target.value)} />}
      {error && <p className="mt-2 rounded-lg bg-bad-soft p-2 text-sm text-bad">⚠️ {error}</p>}
      <Button variant={planned.setType === 'warmup' ? 'secondary' : 'primary'} size="xl" block className="mt-4" disabled={busy} onClick={() => void save()}>
        {busy ? 'Đang lưu…' : saveLabel}
      </Button>
    </div>
  );
}
