import type { ExerciseRow } from '@/engine/types';
import { Button, Card, Chip, cx, ExerciseImg, Input } from '@/ui/components';
import { ExercisePicker, type PickResult } from '../workout/ExercisePicker';

export type EditorSet = { key: string; set_type: 'warmup' | 'working'; kg: number | null; reps: number | null; seconds: number | null };
export type EditorItem = {
  key: string;
  /** text the user typed (quick log) — shown while no exercise matches */
  rawName: string | null;
  pick: PickResult | null;
  templateItemPosition: number | null;
  sets: EditorSet[];
  note: string;
};

export const newKey = () => Math.random().toString(36).slice(2);

const toNum = (s: string) => {
  const t = s.replace(',', '.').trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
};

/** Exercise + set editor shared by Backfill and the Quick log preview. */
export function SessionEditor({
  items,
  onChange,
  library,
}: {
  items: EditorItem[];
  onChange: (items: EditorItem[]) => void;
  library: ExerciseRow[];
}) {
  const update = (key: string, patch: Partial<EditorItem>) => onChange(items.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const updateSet = (ik: string, sk: string, patch: Partial<EditorSet>) =>
    onChange(items.map((i) => (i.key === ik ? { ...i, sets: i.sets.map((s) => (s.key === sk ? { ...s, ...patch } : s)) } : i)));

  return (
    <div>
      {items.map((it, idx) => {
        const ex = it.pick && 'exercise' in it.pick ? it.pick.exercise : null;
        const unmatched = !it.pick;
        const timeBased = ex?.is_time_based ?? false;
        return (
          <Card key={it.key} className={cx(unmatched && 'border-warn bg-warn-soft/40')}>
            <div className="mb-2 flex items-center gap-3">
              {ex && <ExerciseImg svg={ex.illustration_svg} name={ex.name_vi} className="w-20 shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-xs text-muted">Bài {idx + 1}{it.rawName ? ` · anh ghi “${it.rawName}”` : ''}</div>
                <div className="font-semibold">{ex?.name_vi ?? (it.pick && 'newName' in it.pick ? `${it.pick.newName} (bài tạm mới)` : 'Chưa khớp bài — chọn bên dưới')}</div>
              </div>
              <Button size="sm" variant="ghost" aria-label="Xoá bài" onClick={() => onChange(items.filter((x) => x.key !== it.key))}>✕</Button>
            </div>
            {(unmatched || !ex) && (
              <div className="mb-3">
                <ExercisePicker label="Chọn bài" library={library} quick={[]} value={it.pick} onChange={(p) => update(it.key, { pick: p })} />
              </div>
            )}
            <div className="space-y-2">
              {it.sets.map((s, si) => (
                <div key={s.key} className="flex items-center gap-2" data-index={si}>
                  <button
                    type="button"
                    onClick={() => updateSet(it.key, s.key, { set_type: s.set_type === 'warmup' ? 'working' : 'warmup' })}
                    className={cx('h-10 w-24 shrink-0 rounded-lg text-xs font-semibold', s.set_type === 'warmup' ? 'bg-card-2 text-muted' : 'bg-accent-soft text-accent')}
                  >
                    {s.set_type === 'warmup' ? 'Làm nóng' : 'Chính'} {it.sets.slice(0, si + 1).filter((x) => x.set_type === s.set_type).length}
                  </button>
                  {!timeBased && (
                    <Input aria-label="kg" inputMode="decimal" placeholder="kg" value={s.kg ?? ''} onChange={(e) => updateSet(it.key, s.key, { kg: toNum(e.target.value) })} />
                  )}
                  <Input
                    aria-label={timeBased ? 'giây' : 'lần'}
                    inputMode="numeric"
                    placeholder={timeBased ? 'giây' : 'lần'}
                    value={(timeBased ? s.seconds : s.reps) ?? ''}
                    onChange={(e) => updateSet(it.key, s.key, timeBased ? { seconds: toNum(e.target.value) } : { reps: toNum(e.target.value) })}
                  />
                  <button aria-label="Xoá hiệp" className="px-2 text-muted" onClick={() => update(it.key, { sets: it.sets.filter((x) => x.key !== s.key) })}>✕</button>
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Chip
                onClick={() => {
                  const last = it.sets.at(-1);
                  update(it.key, { sets: [...it.sets, { key: newKey(), set_type: 'working', kg: last?.kg ?? null, reps: last?.reps ?? null, seconds: last?.seconds ?? null }] });
                }}
              >
                + Hiệp
              </Chip>
            </div>
            <Input className="mt-2" placeholder="Ghi chú bài (tuỳ chọn)" value={it.note} onChange={(e) => update(it.key, { note: e.target.value })} />
          </Card>
        );
      })}
      <Button block onClick={() => onChange([...items, { key: newKey(), rawName: null, pick: null, templateItemPosition: null, sets: [{ key: newKey(), set_type: 'working', kg: null, reps: null, seconds: null }], note: '' }])}>
        + Thêm bài
      </Button>
    </div>
  );
}
