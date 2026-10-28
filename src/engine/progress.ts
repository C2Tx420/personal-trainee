import type { IsoDate } from './dates';
import { round } from './math';
import type { SessionRow, SetRow } from './types';
import { weeklyWeights, type WeightLog } from './weight';

/** Completed working sets that carry both kg and reps — the only ones records and progress compare. */
const loaded = (sets: SetRow[]) =>
  sets.filter((s) => s.completed && s.set_type === 'working' && s.weight_kg !== null && s.reps !== null) as (SetRow & {
    weight_kg: number;
    reps: number;
  })[];

export type PersonalRecord = {
  exerciseId: string;
  setId: string;
  /** kg = heaviest load ever; reps = at a load done before, more reps than ever at that load or heavier */
  kind: 'kg' | 'reps';
  kg: number;
  reps: number;
  prevKg: number | null;
  prevReps: number | null;
};

/**
 * New personal records in `current` (one session) against every earlier set of the same exercise.
 * One record per exercise, the heavier kind first. An exercise done for the first time has
 * nothing to beat, so it sets no record.
 */
export function personalRecords(current: SetRow[], previous: SetRow[], canonical: (exerciseId: string) => string = (id) => id): PersonalRecord[] {
  const before = new Map<string, ReturnType<typeof loaded>>();
  for (const s of loaded(previous)) before.set(canonical(s.exercise_id), [...(before.get(canonical(s.exercise_id)) ?? []), s]);
  const now = new Map<string, ReturnType<typeof loaded>>();
  for (const s of loaded(current)) now.set(canonical(s.exercise_id), [...(now.get(canonical(s.exercise_id)) ?? []), s]);

  const out: PersonalRecord[] = [];
  for (const [ex, sets] of now) {
    const prev = before.get(ex);
    if (!prev?.length) continue;
    const prevMax = Math.max(...prev.map((s) => s.weight_kg));
    const byLoad = [...sets].sort((a, b) => b.weight_kg - a.weight_kg || b.reps - a.reps);
    const top = byLoad[0];
    if (top.weight_kg > prevMax + 0.01) {
      out.push({ exerciseId: ex, setId: top.id, kind: 'kg', kg: top.weight_kg, reps: top.reps, prevKg: prevMax, prevReps: null });
      continue;
    }
    for (const s of byLoad) {
      if (!prev.some((p) => Math.abs(p.weight_kg - s.weight_kg) <= 0.01)) continue;
      const prevReps = Math.max(...prev.filter((p) => p.weight_kg >= s.weight_kg - 0.01).map((p) => p.reps));
      if (s.reps > prevReps) {
        out.push({ exerciseId: ex, setId: s.id, kind: 'reps', kg: s.weight_kg, reps: s.reps, prevKg: null, prevReps });
        break;
      }
    }
  }
  return out;
}

export type StrengthChange = {
  exerciseId: string;
  first: { date: IsoDate; kg: number; reps: number };
  last: { date: IsoDate; kg: number; reps: number };
  /** % change of the top-set load */
  pct: number;
};

/**
 * First vs latest top set (heaviest load, then most reps) of each exercise done in at least
 * two completed sessions. Sorted by load change, biggest first.
 */
export function strengthChanges(sessions: SessionRow[], sets: SetRow[], canonical: (exerciseId: string) => string = (id) => id): StrengthChange[] {
  const dateOf = new Map(sessions.filter((s) => s.status === 'completed').map((s) => [s.id, s.session_date]));
  const tops = new Map<string, Map<string, { date: IsoDate; kg: number; reps: number }>>();
  for (const s of loaded(sets)) {
    const date = dateOf.get(s.session_id);
    if (!date) continue;
    const ex = canonical(s.exercise_id);
    const perSession = tops.get(ex) ?? new Map();
    const cur = perSession.get(s.session_id);
    if (!cur || s.weight_kg > cur.kg || (s.weight_kg === cur.kg && s.reps > cur.reps)) perSession.set(s.session_id, { date, kg: s.weight_kg, reps: s.reps });
    tops.set(ex, perSession);
  }
  const out: StrengthChange[] = [];
  for (const [ex, perSession] of tops) {
    const series = [...perSession.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (series.length < 2) continue;
    const first = series[0];
    const last = series.at(-1)!;
    out.push({ exerciseId: ex, first, last, pct: first.kg > 0 ? round(((last.kg - first.kg) / first.kg) * 100, 0) : 0 });
  }
  return out.sort((a, b) => b.pct - a.pct || b.last.reps - b.first.reps - (a.last.reps - a.first.reps));
}

export type BodyChange = {
  /** first vs latest weekly average — null until there are two weeks of weigh-ins */
  weight: { firstWeek: IsoDate; firstAvg: number; lastAvg: number; delta: number; weeks: number } | null;
  /** latest weekly average while only one week is logged */
  weightThisWeek: number | null;
  waist: { firstDate: IsoDate; first: number; last: number; delta: number } | null;
};

export function bodyChange(weights: WeightLog[], waist: { log_date: IsoDate; waist_navel_cm: number | null }[]): BodyChange {
  const weeks = weeklyWeights(weights);
  const w = weeks.length >= 2
    ? { firstWeek: weeks[0].weekStart, firstAvg: weeks[0].avg, lastAvg: weeks.at(-1)!.avg, delta: round(weeks.at(-1)!.avg - weeks[0].avg, 1), weeks: weeks.length }
    : null;
  const ws = waist.filter((m) => m.waist_navel_cm !== null).sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
  const waistChange = ws.length >= 2
    ? { firstDate: ws[0].log_date, first: ws[0].waist_navel_cm!, last: ws.at(-1)!.waist_navel_cm!, delta: round(ws.at(-1)!.waist_navel_cm! - ws[0].waist_navel_cm!, 1) }
    : null;
  return { weight: w, weightThisWeek: w ? null : (weeks[0]?.avg ?? null), waist: waistChange };
}
