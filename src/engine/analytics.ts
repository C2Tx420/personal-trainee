import type { IsoDate } from './dates';
import { byHardest, effectiveLoad, sameLoad } from './load';
import { round } from './math';
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
