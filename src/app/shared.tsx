import type { PlanItem } from '@/engine/plan-schema';
import type { ExerciseRow } from '@/engine/types';
import { ExerciseImg } from '@/ui/components';

/** "2 + 3 × 8–10 · 35 kg" */
export function itemSummary(it: PlanItem): string {
  const reps = `${it.rep_min}–${it.rep_max}${it.unit === 'seconds' ? 's' : ''}`;
  const warm = it.warmup_sets.length ? `${it.warmup_sets.length} + ` : '';
  const kg = it.target_kg_per_set
    ? ` · ${it.target_kg_per_set.join('/')} kg`
    : it.target_kg !== null && it.unit === 'reps'
      ? ` · ${String(it.target_kg).replace('.', ',')} kg`
      : '';
  return `${warm}${it.sets} × ${reps}${kg}`;
}

export function ExerciseLine({ ex, item, right }: { ex: ExerciseRow | undefined; item: PlanItem; right?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <ExerciseImg svg={ex?.illustration_svg} name={ex?.name_vi ?? item.exercise} className="w-20 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {ex?.name_vi ?? item.exercise}
          {ex && !ex.available_at_gym && <span className="ml-1 text-xs text-warn">(không có máy)</span>}
        </div>
        <div className="tabular text-sm text-muted">{itemSummary(item)}</div>
      </div>
      {right}
    </div>
  );
}

export function fmtKg(v: number | null | undefined): string {
  return v === null || v === undefined ? '—' : String(Math.round(v * 100) / 100).replace('.', ',');
}
