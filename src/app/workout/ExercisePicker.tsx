import { useMemo, useState } from 'react';
import { exactMatch, searchExercises } from '@/engine/substitutions';
import type { ExerciseRow } from '@/engine/types';
import { cx, ExerciseImg, Input } from '@/ui/components';

export type PickResult = { exercise: ExerciseRow } | { newName: string };

/**
 * Ô gõ tên bài + gợi ý từ thư viện (không dấu, theo tên/alias). Gõ tên chưa có →
 * kết quả { newName } để tạo bài tạm.
 */
export function ExercisePicker({
  library,
  quick,
  value,
  onChange,
  label = 'Bài thay thế',
}: {
  library: ExerciseRow[];
  quick: ExerciseRow[];
  value: PickResult | null;
  onChange: (v: PickResult | null) => void;
  label?: string;
}) {
  const [text, setText] = useState(value && 'exercise' in value ? value.exercise.name_vi : value?.newName ?? '');
  const results = useMemo(() => searchExercises(text, library, 6), [text, library]);
  const selectedId = value && 'exercise' in value ? value.exercise.id : null;

  const pick = (e: ExerciseRow) => {
    setText(e.name_vi);
    onChange({ exercise: e });
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-muted" htmlFor="pick-exercise">
        {label}
      </label>
      <Input
        id="pick-exercise"
        placeholder="Gõ tên bài / máy anh sẽ tập…"
        value={text}
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          const exact = exactMatch(t, library);
          onChange(t.trim() ? (exact ? { exercise: exact } : { newName: t.trim() }) : null);
        }}
      />
      {quick.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {quick.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => pick(e)}
              className={cx('rounded-full border px-3 py-1.5 text-sm', selectedId === e.id ? 'border-accent bg-accent-soft text-accent' : 'border-line bg-card')}
            >
              {e.name_vi}
            </button>
          ))}
        </div>
      )}
      {text.trim() && (
        <div className="mt-2 divide-y divide-line rounded-xl border border-line bg-card">
          {results.map((e) => (
            <button key={e.id} type="button" onClick={() => pick(e)} className="flex w-full items-center gap-3 px-3 py-2 text-left active:bg-card-2">
              <ExerciseImg svg={e.illustration_svg} name={e.name_vi} className="w-16 shrink-0" />
              <span className={cx('flex-1 text-sm', selectedId === e.id && 'font-semibold text-accent')}>
                {e.name_vi}
                {!e.available_at_gym && <span className="ml-1 text-xs text-warn">(không có máy)</span>}
                {e.is_provisional && <span className="ml-1 text-xs text-muted">(bài tạm)</span>}
              </span>
            </button>
          ))}
          {!exactMatch(text, library) && (
            <div className="px-3 py-2 text-sm text-muted">
              ➕ Dùng tên mới “<b className="text-fg">{text.trim()}</b>” — tạo bài tạm, Claude sẽ bổ sung hình + kỹ thuật ở lần review
            </div>
          )}
        </div>
      )}
    </div>
  );
}
