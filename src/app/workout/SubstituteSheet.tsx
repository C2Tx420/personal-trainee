import { useState } from 'react';
import { createProvisionalExercise, substituteItem } from '@/data/api';
import { suggestSubstitutes } from '@/engine/substitutions';
import { type ExerciseRow, type SessionItemRow, SUBSTITUTION_LABEL, type SubstitutionReason } from '@/engine/types';
import { Banner, Button, Chip, Field, Input, Sheet } from '@/ui/components';
import { ExercisePicker, type PickResult } from './ExercisePicker';

/** ⑤ Swap an exercise when the machine is missing / busy — the user types what they will do instead (§6.2). */
export function SubstituteSheet({
  open,
  onClose,
  item,
  original,
  library,
  bySlug,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  item: SessionItemRow;
  original: ExerciseRow;
  library: ExerciseRow[];
  bySlug: Map<string, ExerciseRow>;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<SubstitutionReason>('unavailable');
  const [pick, setPick] = useState<PickResult | null>(null);
  const [note, setNote] = useState('');
  const [markUnavailable, setMarkUnavailable] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quick = suggestSubstitutes(original, item.target.alternatives, library, 4);

  async function submit() {
    if (!pick) return setError('Gõ hoặc chọn bài sẽ tập thay');
    setBusy(true);
    setError(null);
    try {
      const ex = 'exercise' in pick ? pick.exercise : await createProvisionalExercise(pick.newName, original, item.session_id);
      await substituteItem({
        item,
        newExerciseId: ex.id,
        reason,
        note: note.trim() || null,
        markUnavailable: reason === 'unavailable' && markUnavailable,
      });
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Đổi “${original.name_vi}”`}>
      <div className="mb-3">
        <span className="mb-1 block text-sm font-medium text-muted">Lý do</span>
        <div className="flex flex-wrap gap-2">
          {(['unavailable', 'busy', 'pain'] as const).map((r) => (
            <Chip key={r} active={reason === r} onClick={() => setReason(r)}>
              {SUBSTITUTION_LABEL[r]}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <ExercisePicker library={library} exclude={original} quick={quick} value={pick} onChange={setPick} />
      </div>
      <Field label="Ghi chú (tuỳ chọn)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd. máy hỏng, đổi sang tạ đơn" />
      </Field>
      {reason === 'unavailable' && (
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={markUnavailable} onChange={(e) => setMarkUnavailable(e.target.checked)} className="size-5 accent-[var(--accent)]" />
          Phòng tập không có máy này — Claude sẽ không chọn lại
        </label>
      )}
      <p className="mb-3 text-xs text-muted">
        Giữ nguyên số hiệp, khoảng lần, làm nóng. Kg lấy theo lần gần nhất tập chính bài thay thế (không quy đổi giữa các máy).
        {bySlug.size === 0 && ''}
      </p>
      {error && <Banner tone="bad">{error}</Banner>}
      <Button variant="primary" size="lg" block disabled={busy} onClick={() => void submit()}>
        {busy ? 'Đang đổi…' : 'Đổi & tập'}
      </Button>
    </Sheet>
  );
}
