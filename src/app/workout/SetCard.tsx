import { useState } from 'react';
import { type SetInput } from '@/data/api';
import { formatSet, kgDeviates } from '@/engine/progression';
import { isLbStack, kgToLb, pinsAround, stackStep } from '@/engine/stack';
import { type ExerciseRow, type Feel, FEEL_LABEL, KG_CHANGE_LABEL, type KgChangeReason, type SessionItemRow, type SetRow } from '@/engine/types';
import { type PlannedSet, setLabel } from '@/engine/warmup';
import { Button, Chip, cx, Input, Stepper } from '@/ui/components';
import { IconNote } from '@/ui/icons';
import { fmtKg } from '../shared';

/**
 * The set being performed: kg/reps (−/+ buttons), effort, note, and — when kg differs from
 * the target — a row of reason chips (④ §6.2). Also used to edit a logged set.
 * lb-stack machines step pin to pin and get one-tap pin chips; `lastSet` is the same set last session.
 */
export function SetCard({
  item,
  exercise,
  planned,
  workingTotal,
  initialKg,
  initialReason = null,
  existing,
  lastSet,
  onSave,
  saveLabel = 'Xong hiệp',
}: {
  item: SessionItemRow;
  exercise: ExerciseRow;
  planned: PlannedSet;
  workingTotal: number;
  initialKg: number | null;
  /** kg change reason carried over from the previous set (when the kg is carried over too) */
  initialReason?: KgChangeReason | null;
  existing?: SetRow;
  lastSet?: SetRow | null;
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
  const lb = !timeBased && isLbStack(exercise.load_step_kg);
  const beatsLast =
    !!lastSet && !timeBased && kg !== null && reps !== null && lastSet.weight_kg !== null && lastSet.reps !== null &&
    (kg > lastSet.weight_kg || (kg === lastSet.weight_kg && reps > lastSet.reps));

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
    <div className={cx('glass rounded-card p-4', planned.setType === 'working' && 'border-accent/45')}>
      <div className="mb-3 flex items-baseline justify-between">
        <div className={cx('text-lg font-bold tracking-tight', planned.setType === 'warmup' ? 'text-muted' : 'text-accent')}>
          {setLabel(planned, workingTotal)}
        </div>
        <div className="tabular text-sm text-muted">
          mục tiêu {planned.targetKg !== null && !timeBased ? `${fmtKg(planned.targetKg)}kg × ` : ''}
          {planned.repMin === planned.repMax ? planned.repMin : `${planned.repMin}–${planned.repMax}`}
          {timeBased ? ' giây' : ''}
        </div>
      </div>

      {lastSet && !existing && (
        <div className="tabular -mt-1 mb-3 flex items-center gap-2 text-sm" data-testid="last-set">
          <span className="min-w-0 flex-1 text-muted">
            Lần trước: <b className="text-fg">{formatSet(lastSet)}</b>
            {lastSet.feel && ` · ${FEEL_LABEL[lastSet.feel].toLowerCase()}`}
            {beatsLast && <span className="ml-1 text-ok">↑ hơn lần trước</span>}
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              if (!timeBased) setKg(lastSet.weight_kg);
              setReps(timeBased ? lastSet.seconds : lastSet.reps);
            }}
          >
            Lặp lại
          </Button>
        </div>
      )}

      <div className="grid gap-3">
        {!timeBased && (
          <Stepper
            label="kg"
            unit="kg"
            value={kg}
            onChange={setKg}
            step={exercise.load_step_kg || 2.5}
            onStep={lb ? (d) => setKg(stackStep(kg, d)) : undefined}
            allowEmpty
          />
        )}
        {lb && (
          <div data-testid="lb-pins">
            <div className="-mt-1 mb-1.5 text-xs text-muted">
              Máy chia nấc lb{kg !== null && ` · ${fmtKg(kg)} kg ≈ ${kgToLb(kg)} lb`}
            </div>
            <div className="flex gap-1.5">
              {pinsAround(kg).map((p) => (
                <button
                  key={p.lb}
                  type="button"
                  onClick={() => setKg(p.kg)}
                  className={cx(
                    'tabular flex-1 rounded-ctl border py-1.5 text-center leading-tight',
                    kg === p.kg ? 'border-accent/60 bg-accent-soft text-accent' : 'border-white/10 bg-white/[0.04]',
                  )}
                >
                  <span className="block text-sm font-semibold">{p.lb} lb</span>
                  <span className="block text-[11px] text-muted">{p.kg} kg</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <Stepper label={timeBased ? 'giây' : 'lần'} unit={timeBased ? 'giây' : 'lần'} value={reps} onChange={setReps} step={timeBased ? 5 : 1} />
      </div>

      {deviates && (
        <div className="mt-3 rounded-ctl border border-warn/25 bg-warn-soft p-3" data-testid="kg-change">
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
        <button type="button" aria-label="Ghi chú hiệp" onClick={() => setShowNote((v) => !v)} className="glass-subtle ml-auto grid size-10 place-items-center rounded-full">
          <IconNote className="size-[18px]" />
        </button>
      </div>
      {showNote && <Input className="mt-2" placeholder="Ghi chú hiệp (vd. đau vai trái)" value={note} onChange={(e) => setNote(e.target.value)} />}
      {error && <p className="mt-2 rounded-ctl border border-bad/25 bg-bad-soft p-2.5 text-sm text-bad">{error}</p>}
      <Button variant={planned.setType === 'warmup' ? 'secondary' : 'primary'} size="xl" block className="mt-4" disabled={busy} onClick={() => void save()}>
        {busy ? 'Đang lưu…' : saveLabel}
      </Button>
    </div>
  );
}
