import { addDays, type IsoDate } from './dates';
import { byHardest, effectiveLoad, sameLoad } from './load';
import { round } from './math';
import { isLbStack, stackStep } from './stack';
import type { SessionRow, SetRow } from './types';

/**
 * Training analytics shared by the weekly coach report and the app (plan v2.7 §16 B2–B4).
 * Only completed working sets with kg + reps count.
 */

type Loaded = SetRow & { weight_kg: number; reps: number };
const loaded = (sets: SetRow[]): Loaded[] =>
  sets.filter((s): s is Loaded => s.completed && s.set_type === 'working' && s.weight_kg !== null && s.reps !== null && s.reps > 0);

/** Above this many reps the estimate is too loose to be useful. */
export const E1RM_MAX_REPS = 15;

/**
 * Estimated 1-rep max (Epley: kg × (1 + reps/30)). Only to compare the SAME exercise over time —
 * never shown as a real 1RM. Assisted machines use body weight − assistance (null when unknown).
 */
export function e1rm(kg: number, reps: number, assisted = false, bodyKg: number | null = null): number | null {
  if (reps <= 0 || reps > E1RM_MAX_REPS) return null;
  const load = effectiveLoad(kg, assisted, bodyKg);
  if (load === null || load <= 0) return null;
  return round(load * (1 + reps / 30), 1);
}

/** Best e1RM of a set list (null when no set qualifies). */
export function bestE1rm(sets: SetRow[], assisted = false, bodyKg: number | null = null): number | null {
  const vals = loaded(sets)
    .map((s) => e1rm(s.weight_kg, s.reps, assisted, bodyKg))
    .filter((v): v is number => v !== null);
  return vals.length ? Math.max(...vals) : null;
}

export type ExerciseSession = { date: IsoDate; sets: SetRow[] };

/** Best e1RM per session (sessions without a qualifying set are left out). */
export function e1rmBySession(sessions: ExerciseSession[], assisted = false, bodyKg: number | null = null): { date: IsoDate; e1rm: number }[] {
  return [...sessions]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) => ({ date: s.date, e1rm: bestE1rm(s.sets, assisted, bodyKg) }))
    .filter((x): x is { date: IsoDate; e1rm: number } => x.e1rm !== null);
}

/** e1RM line for the exercise chart: one point per completed session of the exercise group. */
export function e1rmSeries(
  exerciseIds: Set<string>,
  sessions: SessionRow[],
  sets: SetRow[],
  assisted = false,
  bodyKg: number | null = null,
): { date: IsoDate; e1rm: number }[] {
  const done = sessions.filter((s) => s.status === 'completed');
  return e1rmBySession(
    done.map((s) => ({ date: s.session_date, sets: sets.filter((x) => x.session_id === s.id && exerciseIds.has(x.exercise_id)) })),
    assisted,
    bodyKg,
  );
}

/** Working load of a session = its hardest working set. */
function sessionLoad(sets: Loaded[], assisted: boolean): number {
  return sets.map((s) => s.weight_kg).sort(byHardest(assisted))[0];
}

const totalReps = (sets: Loaded[]) => sets.reduce((a, s) => a + s.reps, 0);

/**
 * Sessions in a row, most recent first, stuck at the same load: rep_max not reached on every working
 * set AND no more total reps than the previous session at that load. Stops at a load change, a
 * target change, a session that hit the target, or one that improved on the session before it.
 * The first session at a load counts when it missed. `repMax` = fallback when sets carry no target.
 */
export function stallCount(sessions: ExerciseSession[], assisted = false, repMax: number | null = null): number {
  const list = [...sessions]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((s) => loaded(s.sets))
    .filter((s) => s.length > 0);
  let count = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const cur = list[i];
    const load = sessionLoad(cur, assisted);
    const target = cur.find((s) => s.target_rep_max !== null)?.target_rep_max ?? repMax;
    if (target === null) break;
    if (cur.every((s) => s.reps >= target)) break;
    if (count > 0) {
      // the session after this one (already counted) must be at the same load and target
      const next = list[i + 1];
      if (!sameLoad(sessionLoad(next, assisted), load)) break;
      const nextTargetKg = next.find((s) => s.target_kg !== null)?.target_kg ?? null;
      const curTargetKg = cur.find((s) => s.target_kg !== null)?.target_kg ?? null;
      if (nextTargetKg !== curTargetKg) break;
    }
    // improved on the previous session at the same load → still progressing, not stuck
    const prev = list[i - 1];
    if (prev && sameLoad(sessionLoad(prev, assisted), load) && totalReps(cur) > totalReps(prev)) break;
    count++;
  }
  return count;
}

export type DeloadOption = { kg: number; reps: number; e1rm: number };

/**
 * Deload choices on the real load grid (plan v2.7 §16 B3): aim at ~90% of the best e1RM of the last
 * two sessions, try every (load, reps) with the load at or below the current one (lb pins or kg steps;
 * on assisted machines: at or above the current assistance) and reps in [repMin, repMax]; return the
 * `count` closest, preferring fewer rep changes, then the harder load.
 * Needs body weight on assisted machines (null → []).
 */
export function deloadOptions(args: {
  sessions: ExerciseSession[];
  loadStepKg: number;
  repMin: number;
  repMax: number;
  assisted?: boolean;
  bodyKg?: number | null;
  pct?: number;
  count?: number;
}): DeloadOption[] {
  const { loadStepKg, repMin, repMax, assisted = false, bodyKg = null, pct = 0.9, count = 2 } = args;
  const recent = [...args.sessions].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-2);
  const best = Math.max(...recent.map((s) => bestE1rm(s.sets, assisted, bodyKg) ?? 0));
  const last = loaded(recent.at(-1)?.sets ?? []);
  if (!best || !last.length) return [];
  const current = sessionLoad(last, assisted);
  const lastReps = Math.max(...last.filter((s) => sameLoad(s.weight_kg, current)).map((s) => s.reps));
  const target = best * pct;

  // candidate loads: the current one and up to 4 steps easier
  const loads: number[] = [];
  for (let i = 0; i <= 4; i++) {
    const kg = isLbStack(loadStepKg) ? stackSteps(current, assisted ? i : -i) : round(current + (assisted ? i : -i) * loadStepKg, 2);
    if (kg > 0 && !loads.some((l) => sameLoad(l, kg))) loads.push(kg);
  }
  const options: (DeloadOption & { score: number })[] = [];
  for (const kg of loads) {
    for (let reps = repMin; reps <= repMax; reps++) {
      const est = e1rm(kg, reps, assisted, bodyKg);
      if (est === null || (sameLoad(kg, current) && reps >= lastReps)) continue; // same load, same or more reps is not a deload
      options.push({ kg, reps, e1rm: est, score: Math.abs(est - target) });
    }
  }
  return options
    .sort((a, b) => a.score - b.score || Math.abs(a.reps - lastReps) - Math.abs(b.reps - lastReps) || byHardest(assisted)(a.kg, b.kg))
    .slice(0, count)
    .map(({ kg, reps, e1rm: v }) => ({ kg, reps, e1rm: v }));
}

/** `n` pins away from a kg value on an lb stack (n < 0 = lighter). */
function stackSteps(kg: number, n: number): number {
  let out = kg;
  for (let i = 0; i < Math.abs(n); i++) out = stackStep(out, n > 0 ? 1 : -1);
  return out;
}

// ───────────────────────── Sets per muscle (§16 B4)

/** Weekly sets per muscle, reference band (10–20 hard sets / week per muscle). */
export const MUSCLE_SETS_BAND = { low: 10, high: 20 } as const;
export const SECONDARY_SET_WEIGHT = 0.5;

type MuscleInfo = { primary_muscle: string; secondary_muscles: string[]; kind?: string };

/**
 * Completed working sets per muscle: the primary muscle +1, each secondary +0.5. Warm-ups and
 * cardio exercises don't count; timed sets (plank) do. Provisional exercises count as their canonical one.
 */
export function muscleSets(
  sets: SetRow[],
  exercises: Map<string, MuscleInfo & { canonical_exercise_id?: string | null }>,
  secondaryWeight = SECONDARY_SET_WEIGHT,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sets) {
    if (!s.completed || s.set_type !== 'working') continue;
    const own = exercises.get(s.exercise_id);
    const e = (own?.canonical_exercise_id && exercises.get(own.canonical_exercise_id)) || own;
    if (!e || e.kind === 'cardio' || e.primary_muscle === 'cardio') continue;
    out[e.primary_muscle] = (out[e.primary_muscle] ?? 0) + 1;
    for (const m of e.secondary_muscles) if (m !== e.primary_muscle) out[m] = (out[m] ?? 0) + secondaryWeight;
  }
  for (const k of Object.keys(out)) out[k] = round(out[k], 1);
  return out;
}

/** Sets per muscle for the week starting `weekStartDate` (completed sessions only). */
export function weeklyMuscleSets(
  weekStartDate: IsoDate,
  sessions: SessionRow[],
  sets: SetRow[],
  exercises: Map<string, MuscleInfo & { canonical_exercise_id?: string | null }>,
): Record<string, number> {
  const end = addDays(weekStartDate, 6);
  const ids = new Set(sessions.filter((s) => s.status === 'completed' && s.session_date >= weekStartDate && s.session_date <= end).map((s) => s.id));
  return muscleSets(sets.filter((s) => ids.has(s.session_id)), exercises);
}

/** Average of several weekly muscle-set maps (missing = 0); weeks with no training are left out. */
export function averageMuscleSets(all: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  const weeks = all.filter((w) => Object.keys(w).length > 0);
  if (!weeks.length) return out;
  for (const w of weeks) for (const [k, v] of Object.entries(w)) out[k] = (out[k] ?? 0) + v;
  for (const k of Object.keys(out)) out[k] = round(out[k] / weeks.length, 1);
  return out;
}
