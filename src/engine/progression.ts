import type { IsoDate } from './dates';
import type { PlanItem } from './plan-schema';
import { isLbStack, stackStep } from './stack';
import type { SetRow } from './types';
import type { PlannedSet } from './warmup';

export type PastSession = { date: IsoDate; sets: SetRow[] };

/** Most recent session with completed working sets of this exercise (excluding the current one). */
export function lastPerformance(history: PastSession[]): PastSession | null {
  const withWork = history
    .map((h) => ({ ...h, sets: h.sets.filter((s) => s.completed && s.set_type === 'working') }))
    .filter((h) => h.sets.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  return withWork[0] ?? null;
}

export function formatSet(s: Pick<SetRow, 'weight_kg' | 'reps' | 'seconds'>): string {
  if (s.seconds !== null && s.seconds !== undefined && s.reps === null) return `${s.seconds}s`;
  const kg = s.weight_kg === null ? '?' : String(s.weight_kg).replace('.', ',');
  return `${kg}×${s.reps ?? '?'}`;
}

/**
 * Pre-filled kg for the upcoming set.
 *
 * Working sets: if an earlier working set of this exercise **changed kg from the target**,
 * keep the new kg; otherwise: target kg → previous working set's kg → last working
 * set of the previous session. Warm-up sets: planned kg only.
 */
export function prefillKg(planned: PlannedSet, doneThisItem: SetRow[], last: PastSession | null): number | null {
  if (planned.setType === 'warmup') return planned.targetKg;
  const prevWorking = doneThisItem
    .filter((s) => s.set_type === 'working' && s.completed)
    .sort((a, b) => a.set_index - b.set_index)
    .at(-1);
  if (prevWorking && prevWorking.kg_change_reason && prevWorking.weight_kg !== null) return prevWorking.weight_kg;
  if (planned.targetKg !== null) return planned.targetKg;
  if (prevWorking?.weight_kg != null) return prevWorking.weight_kg;
  const lastSet = last?.sets.filter((s) => s.weight_kg !== null).at(-1);
  return lastSet?.weight_kg ?? null;
}

export function kgDeviates(targetKg: number | null, actualKg: number | null): boolean {
  return targetKg !== null && actualKg !== null && Math.abs(targetKg - actualKg) > 0.01;
}

/**
 * Load increase suggestion — only when the plan has no `target_kg` for the exercise.
 * Last working set of the previous session hit `rep_max` → +1 load step / next pin on lb stacks (timed exercises: +5 seconds).
 */
export function progressionHint(item: PlanItem, last: PastSession | null, loadStepKg: number): string | null {
  if (item.target_kg !== null || !last) return null;
  const lastSet = [...last.sets].sort((a, b) => a.set_index - b.set_index).at(-1);
  if (!lastSet) return null;
  if (item.unit === 'seconds') {
    return (lastSet.seconds ?? 0) >= item.rep_max ? `Thử ${item.rep_max + 5} giây` : null;
  }
  if (lastSet.weight_kg === null || (lastSet.reps ?? 0) < item.rep_max) return null;
  const next = isLbStack(loadStepKg) ? stackStep(lastSet.weight_kg, 1) : lastSet.weight_kg + loadStepKg;
  return `Lần trước đủ ${item.rep_max} lần — thử ${String(next).replace('.', ',')} kg`;
}
