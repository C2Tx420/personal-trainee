import type { PlanItem, WarmupSet } from './plan-schema';
import { capBelow, isLbStack, roundLoad, stackStep } from './stack';

export type PlannedSet = {
  setType: 'warmup' | 'working';
  /** order within its group (1-based): Làm nóng 1, 2 … / Hiệp chính 1, 2, 3 */
  index: number;
  targetKg: number | null;
  repMin: number;
  repMax: number;
};

/**
 * Planned sets of an exercise: warm-up sets (from `warmup_sets`), then working sets.
 *
 * Warm-up load: fixed `kg` if set, otherwise `pct`% of the working load
 * (`target_kg`, or `fallbackWorkingKg` = previous working-set kg when absent),
 * rounded to the load step (nearest pin on lb stacks) and kept ≥ 1 step below the working load.
 * Nothing to compute from → null (entered manually).
 * Assisted machines: a % of the assistance means nothing, so `pct` warm-ups are dropped (fixed `kg` ones stay).
 */
export function plannedSets(item: PlanItem, loadStepKg: number, fallbackWorkingKg: number | null, assisted = false): PlannedSet[] {
  const workingKg = item.target_kg ?? fallbackWorkingKg;
  const warmups: PlannedSet[] =
    item.unit === 'seconds'
      ? []
      : item.warmup_sets.filter((w) => !assisted || w.kg !== undefined).map((w, i) => {
          const reps = w.reps === 'same' ? item.rep_max : w.reps;
          let kg: number | null = null;
          if (w.kg !== undefined) kg = w.kg;
          else if (w.pct !== undefined && workingKg !== null) kg = capBelow(roundLoad((workingKg * w.pct) / 100, loadStepKg), workingKg, loadStepKg);
          return { setType: 'warmup', index: i + 1, targetKg: kg, repMin: reps, repMax: reps };
        });
  const working: PlannedSet[] = Array.from({ length: item.sets }, (_, i) => ({
    setType: 'working',
    index: i + 1,
    targetKg: item.target_kg_per_set?.[i] ?? (i > 0 ? backoffKg(item.target_kg, item.backoff_steps ?? 0, loadStepKg, assisted) : item.target_kg),
    repMin: item.rep_min,
    repMax: item.rep_max,
  }));
  return [...warmups, ...working];
}

export function setLabel(s: Pick<PlannedSet, 'setType' | 'index'>, totalWorking?: number): string {
  return s.setType === 'warmup'
    ? `Làm nóng ${s.index}`
    : `Hiệp chính ${s.index}${totalWorking ? `/${totalWorking}` : ''}`;
}

/**
 * Default warm-up for a new plan item (plan v2.7 §16 B8): compound lifts 50% × 8 then 75% × 4 — two
 * ramp sets with fewer reps each, so they don't tire him before the work sets; if both round to the
 * same load (light work load), one set 75% × 5. Isolation / core / cardio / assisted / timed: none.
 */
export function suggestWarmup(args: { kind: string; isTimeBased?: boolean; assisted?: boolean; workingKg?: number | null; loadStepKg?: number }): WarmupSet[] {
  if (args.kind !== 'compound' || args.isTimeBased || args.assisted) return [];
  const ramp: WarmupSet[] = [{ pct: 50, reps: 8 }, { pct: 75, reps: 4 }];
  const w = args.workingKg ?? null;
  if (w === null || !args.loadStepKg) return ramp;
  const at = (pct: number) => capBelow(roundLoad((w * pct) / 100, args.loadStepKg!), w, args.loadStepKg!);
  return Math.abs(at(50) - at(75)) < 0.01 ? [{ pct: 75, reps: 5 }] : ramp;
}

/** Load of a back-off set: `steps` lighter than the top set (pins on lb stacks; more assistance if assisted). */
export function backoffKg(topKg: number | null, steps: number, loadStepKg: number, assisted = false): number | null {
  if (topKg === null || steps <= 0) return topKg;
  const dir = assisted ? 1 : -1;
  let kg = topKg;
  for (let i = 0; i < steps; i++) kg = isLbStack(loadStepKg) ? stackStep(kg, dir) : Math.max(0, Math.round((kg + dir * (loadStepKg || 2.5)) * 100) / 100);
  return kg;
}
