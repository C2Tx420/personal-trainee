import { addDays, type IsoDate, WEEKDAYS } from './dates';
import { round, sum } from './math';
import type { PlanContent } from './plan-schema';
import type { ExerciseRow, KgChangeReason, SessionItemRow, SessionRow, SetRow, SubstitutionReason } from './types';

/** Volume = Σ kg × reps, only completed working sets with kg (excludes warm-ups, timed exercises, empty kg). */
export function volumeKg(sets: SetRow[]): number {
  return sum(
    sets
      .filter((s) => s.completed && s.set_type === 'working' && s.weight_kg !== null && s.reps !== null)
      .map((s) => (s.weight_kg as number) * (s.reps as number)),
  );
}

export type SessionSummary = {
  itemsTotal: number;
  itemsDone: number;
  itemsSkipped: number;
  itemsSubstituted: { planned: string | null; done: string; reason: SubstitutionReason; note: string | null }[];
  workingSetsDone: number;
  workingSetsPlanned: number;
  volumeKg: number;
  missingKgExercises: string[];
  kgChanges: { exercise: string; setIndex: number; targetKg: number | null; actualKg: number | null; reason: KgChangeReason; note: string | null }[];
  warmupDone: boolean | null;
  durationMin: number | null;
};

export function sessionSummary(
  session: Pick<SessionRow, 'warmup' | 'started_at' | 'ended_at' | 'duration_min'>,
  items: SessionItemRow[],
  sets: SetRow[],
  exercises: Map<string, Pick<ExerciseRow, 'name_vi' | 'is_time_based'>>,
  now: Date = new Date(),
): SessionSummary {
  const name = (id: string | null) => (id ? (exercises.get(id)?.name_vi ?? '?') : '—');
  const working = sets.filter((s) => s.set_type === 'working');
  const missing = new Set<string>();
  for (const s of working) {
    if (s.completed && s.weight_kg === null && !exercises.get(s.exercise_id)?.is_time_based) missing.add(name(s.exercise_id));
  }
  let durationMin = session.duration_min;
  if (durationMin === null && session.started_at) {
    const end = session.ended_at ? new Date(session.ended_at) : now;
    durationMin = Math.round((end.getTime() - new Date(session.started_at).getTime()) / 60_000);
  }
  return {
    itemsTotal: items.length,
    itemsDone: items.filter((i) => i.status === 'done' || i.status === 'partial').length,
    itemsSkipped: items.filter((i) => i.status === 'skipped').length,
    itemsSubstituted: items
      .filter((i) => i.substitution_reason)
      .map((i) => ({
        planned: name(i.planned_exercise_id),
        done: name(i.exercise_id),
        reason: i.substitution_reason as SubstitutionReason,
        note: i.substitution_note,
      })),
    workingSetsDone: working.filter((s) => s.completed).length,
    workingSetsPlanned: sum(items.filter((i) => i.status !== 'skipped').map((i) => i.target.sets)),
    volumeKg: volumeKg(sets),
    missingKgExercises: [...missing],
    kgChanges: working
      .filter((s) => s.completed && s.kg_change_reason)
      .map((s) => ({
        exercise: name(s.exercise_id),
        setIndex: s.set_index,
        targetKg: s.target_kg,
        actualKg: s.weight_kg,
        reason: s.kg_change_reason as KgChangeReason,
        note: s.kg_change_note,
      })),
    warmupDone: session.warmup ? !session.warmup.skipped : null,
    durationMin,
  };
}

const STRENGTH_KINDS = new Set(['push', 'pull', 'legs', 'push_light', 'pull_light']);

/** Planned sessions in a week: lifting + badminton (rest/optional days don't count). */
function plannedSessionsPerWeek(content: PlanContent): number {
  return WEEKDAYS.filter((d) => {
    const k = content.schedule[d].kind;
    return k === 'session' || k === 'badminton';
  }).length;
}

/** Estimated workout calories — reference only, not to be eaten back. */
export function estimateSessionKcal(
  session: Pick<SessionRow, 'kind' | 'duration_min' | 'badminton_intensity'>,
  content: PlanContent,
  bodyWeightKg: number,
): number {
  if (session.kind === 'badminton') {
    const minutes = session.duration_min ?? 60;
    const per30 = content.badminton.kcal_per_30min[session.badminton_intensity ?? 'light'];
    return Math.round((minutes / 30) * per30);
  }
  const hours = (session.duration_min ?? 60) / 60;
  const met = STRENGTH_KINDS.has(session.kind) ? 3.5 : session.kind === 'core' ? 3 : 3.5;
  return Math.round(met * bodyWeightKg * hours);
}

export type WeekSummary = {
  weekStart: IsoDate;
  plannedSessions: number;
  doneSessions: number;
  badmintonSessions: number;
  sessionsWithWarmup: number;
  strengthSessions: number;
  setCompletionPct: number | null;
  estKcal: number;
};

export function weekSummary(
  weekStartDate: IsoDate,
  sessions: SessionRow[],
  items: SessionItemRow[],
  sets: SetRow[],
  content: PlanContent,
  bodyWeightKg: number,
): WeekSummary {
  const end = addDays(weekStartDate, 6);
  const inWeek = sessions.filter(
    (s) => s.status === 'completed' && s.session_date >= weekStartDate && s.session_date <= end,
  );
  const ids = new Set(inWeek.map((s) => s.id));
  const strength = inWeek.filter((s) => STRENGTH_KINDS.has(s.kind));
  const weekItems = items.filter((i) => ids.has(i.session_id) && i.template_item_position !== null);
  const planned = sum(weekItems.map((i) => i.target.sets));
  const weekItemIds = new Set(weekItems.map((i) => i.id));
  const done = sets.filter((s) => weekItemIds.has(s.session_item_id) && s.set_type === 'working' && s.completed).length;
  return {
    weekStart: weekStartDate,
    plannedSessions: plannedSessionsPerWeek(content),
    doneSessions: inWeek.filter((s) => STRENGTH_KINDS.has(s.kind) || s.kind === 'badminton').length,
    badmintonSessions: inWeek.filter((s) => s.kind === 'badminton').length,
    sessionsWithWarmup: strength.filter((s) => s.warmup && !s.warmup.skipped).length,
    strengthSessions: strength.length,
    setCompletionPct: planned === 0 ? null : Math.round((Math.min(done, planned) / planned) * 100),
    estKcal: sum(inWeek.map((s) => s.est_kcal ?? estimateSessionKcal(s, content, bodyWeightKg))),
  };
}

/** Weekly volume of one exercise (merged by canonical id if present). */
export function weeklyVolumeByExercise(
  exerciseIds: Set<string>,
  sessions: SessionRow[],
  sets: SetRow[],
  weekStarts: IsoDate[],
): { week: IsoDate; volume: number }[] {
  const dateOf = new Map(sessions.map((s) => [s.id, s.session_date]));
  return weekStarts.map((w) => {
    const end = addDays(w, 6);
    const inWeek = sets.filter((s) => {
      const d = dateOf.get(s.session_id);
      return exerciseIds.has(s.exercise_id) && d !== undefined && d >= w && d <= end;
    });
    return { week: w, volume: round(volumeKg(inWeek), 0) };
  });
}

/** Heaviest working-set load per session of one exercise + the target load at the time. */
export function topSetSeries(
  exerciseIds: Set<string>,
  sessions: SessionRow[],
  sets: SetRow[],
): { date: IsoDate; topKg: number; targetKg: number | null }[] {
  const out: { date: IsoDate; topKg: number; targetKg: number | null }[] = [];
  for (const s of [...sessions].sort((a, b) => (a.session_date < b.session_date ? -1 : 1))) {
    const work = sets.filter(
      (x) => x.session_id === s.id && exerciseIds.has(x.exercise_id) && x.set_type === 'working' && x.completed && x.weight_kg !== null,
    );
    if (work.length === 0) continue;
    out.push({
      date: s.session_date,
      topKg: Math.max(...work.map((x) => x.weight_kg as number)),
      targetKg: work.find((x) => x.target_kg !== null)?.target_kg ?? null,
    });
  }
  return out;
}
