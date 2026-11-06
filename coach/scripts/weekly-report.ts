import { addDays, diffDays, type IsoDate, todayVN, weekdayOf, weekStart } from '../../src/engine/dates';
import { goalProgress, type Goal } from '../../src/engine/goals';
import { compareInbody, inbodyDue, type InbodyLog, latestFfm } from '../../src/engine/inbody';
import { deloadOptions, e1rmBySession, stallCount } from '../../src/engine/analytics';
import { round } from '../../src/engine/math';
import { rejectedSummary } from '../../src/engine/plan-diff';
import { legsBadmintonAdjacency, parsePlanContent } from '../../src/engine/plan-schema';
import { planWeek, programStartOf } from '../../src/engine/plan-week';
import { actualLegsBadmintonConflicts } from '../../src/engine/schedule';
import { measurementDeltas, whr } from '../../src/engine/body';
import type { SessionItemRow, SessionRow, SetRow } from '../../src/engine/types';
import { lossTrendKgPerWeek, weeklyWeights, weeksWithoutLoss } from '../../src/engine/weight';
import { volumeKg, weeklyVolumeByExercise, weekSummary } from '../../src/engine/workout-summary';
import { arg, connect } from './db';

/**
 * Weekly report `coach-weekly/1` for Claude Code (§7.4). Reads only through the
 * coach_readonly role. Every number is computed with the app's own src/engine.
 *
 *   pnpm run report [--week 2026-10-26] > reports/2026-11-02.json
 */
const sql = connect();
const today = todayVN();
const ws: IsoDate = arg('week') ?? (weekdayOf(today) === 'mon' ? weekStart(addDays(today, -7)) : weekStart(today));
const we = addDays(ws, 6);
const from8w = addDays(ws, -49);

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

const [goals, plans, weights, meas, inbody, sessions, exercises] = await Promise.all([
  sql`select *, target_date::text as target_date_s from goals order by ordinal`,
  sql`select id, version_no, status, effective_from::text as effective_from, created_by, change_note, rejected_reason, content, based_on_version_id, created_at from plan_versions order by version_no`,
  sql`select log_date::text, weight_kg from weight_logs order by log_date, logged_at`,
  sql`select *, log_date::text as log_date_s from body_measurements order by log_date`,
  sql`select *, measured_on::text as measured_on_s from inbody_logs order by measured_on`,
  sql`select *, session_date::text as session_date_s from workout_sessions where session_date >= ${from8w} order by session_date`,
  sql`select id, slug, name_vi, primary_muscle, secondary_muscles, kind, equipment, load_step_kg::float as load_step_kg, is_assisted, available_at_gym, unavailable_note, is_provisional, archived,
             canonical_exercise_id, (illustration_svg is not null) as has_illustration, aliases
      from exercises order by slug`,
]);
const ids = sessions.map((s) => s.id as string);
const items = ids.length ? await sql`select * from workout_session_items where session_id = any(${ids}) order by position` : [];
const sets = ids.length ? await sql`select * from workout_sets where session_id = any(${ids}) order by set_index` : [];
await sql.end();

const active = plans.find((p) => p.status === 'active');
if (!active) throw new Error('Không có lộ trình active');
const content = parsePlanContent(active.content);
const exById = new Map(exercises.map((e) => [e.id as string, e]));
const exBySlug = new Map(exercises.map((e) => [e.slug as string, e]));
const slugOf = (id: string | null) => (id ? (exById.get(id)?.slug as string) : null);

const sRows = sessions.map(({ session_date_s, ...s }) => ({ ...s, session_date: session_date_s })) as unknown as SessionRow[];
const iRows = items as unknown as SessionItemRow[];
const setRows = (sets as unknown as SetRow[]).map((s) => ({ ...s, weight_kg: n(s.weight_kg), target_kg: n(s.target_kg) }));
const wLogs = weights.map((w) => ({ log_date: String(w.log_date), weight_kg: Number(w.weight_kg) }));
const ibLogs = inbody.map((r) => ({
  ...r, measured_on: r.measured_on_s, weight_kg: Number(r.weight_kg), smm_kg: n(r.smm_kg), pbf_pct: n(r.pbf_pct),
  visceral_fat_level: n(r.visceral_fat_level), whr: n(r.whr), ffm_kg: n(r.ffm_kg), bmr_kcal: n(r.bmr_kcal), inbody_score: n(r.inbody_score),
})) as unknown as InbodyLog[];

// ── weight + goals
const lastW = wLogs.at(-1)?.weight_kg ?? 0;
// assisted machines: volume uses body weight − assistance (src/engine/load.ts)
const loads = { assisted: (id: string) => !!exById.get(id)?.is_assisted, bodyKg: lastW || null };
const trend = lossTrendKgPerWeek(wLogs, we);
const ffm = latestFfm(ibLogs);
const weekLogs = wLogs.filter((w) => w.log_date >= ws && w.log_date <= we);
const goalRows: Goal[] = goals.map((g) => ({
  ...g, target_date: g.target_date_s, target_weight_min: Number(g.target_weight_min), target_weight_max: Number(g.target_weight_max),
  target_body_fat_min: n(g.target_body_fat_min), target_body_fat_max: n(g.target_body_fat_max),
})) as unknown as Goal[];

// ── training
const weekSessions = sRows.filter((s) => s.session_date >= ws && s.session_date <= we && s.status === 'completed');
const weekIds = new Set(weekSessions.map((s) => s.id));
const ws4 = addDays(ws, -21);
const recent = sRows.filter((s) => s.session_date >= ws4 && s.session_date <= we && s.status === 'completed');
const recentIds = new Set(recent.map((s) => s.id));
const dateOf = new Map(sRows.map((s) => [s.id, s.session_date]));
const trainedEx = [...new Set(setRows.filter((s) => recentIds.has(s.session_id)).map((s) => s.exercise_id))];
const weekStarts8 = Array.from({ length: 8 }, (_, i) => addDays(ws, -7 * (7 - i)));

const plannedTarget = (slug: string) => {
  for (const t of content.templates) {
    const it = t.items.find((i) => i.exercise === slug);
    if (it) return { template: t.key, kg: it.target_kg, kg_per_set: it.target_kg_per_set, rep_min: it.rep_min, rep_max: it.rep_max, sets: it.sets, warmup_sets: it.warmup_sets.length };
  }
  return null;
};

const perSessionBySlug = new Map<string, { date: IsoDate; sets: SetRow[] }[]>();
const setsDetail = trainedEx.map((exId) => {
  const ex = exById.get(exId)!;
  const exSets = setRows.filter((s) => s.exercise_id === exId && recentIds.has(s.session_id) && s.completed);
  const bySession = [...new Set(exSets.map((s) => s.session_id))]
    .sort((a, b) => (dateOf.get(a)! < dateOf.get(b)! ? -1 : 1))
    .map((sid) => {
      const item = iRows.find((i) => i.session_id === sid && i.exercise_id === exId);
      return {
        date: dateOf.get(sid),
        exercise_note: item?.note ?? null,
        substituted_for: item?.substitution_reason ? slugOf(item.planned_exercise_id) : null,
        sets: exSets
          .filter((s) => s.session_id === sid)
          .sort((a, b) => (a.set_type === b.set_type ? a.set_index - b.set_index : a.set_type === 'warmup' ? -1 : 1))
          .map((s) => ({
            type: s.set_type, kg: s.weight_kg, reps: s.reps, seconds: s.seconds, feel: s.feel, target_kg: s.target_kg,
            kg_change_reason: s.kg_change_reason, kg_change_note: s.kg_change_note, note: s.note,
          })),
      };
    });
  const working = exSets.filter((s) => s.set_type === 'working');
  const assisted = !!ex.is_assisted;
  const perSession = [...new Set(exSets.map((s) => s.session_id))].map((sid) => ({ date: dateOf.get(sid) as IsoDate, sets: exSets.filter((s) => s.session_id === sid) }));
  perSessionBySlug.set(ex.slug as string, perSession);
  const withTarget = working.filter((s) => s.target_rep_min !== null);
  const hit = withTarget.filter((s) => s.reps !== null && s.target_rep_min !== null && s.reps >= s.target_rep_min && (s.target_kg === null || (s.weight_kg ?? 0) >= s.target_kg));
  const notes = [...exSets.map((s) => s.note ?? ''), ...iRows.filter((i) => i.exercise_id === exId).map((i) => i.note ?? '')];
  return {
    exercise: ex.slug,
    name: ex.name_vi,
    is_assisted: !!ex.is_assisted,
    target: plannedTarget(ex.slug as string),
    sessions: bySession,
    hit_target_pct: withTarget.length ? Math.round((hit.length / withTarget.length) * 100) : null,
    missing_kg_sets: working.filter((s) => s.weight_kg === null && s.seconds === null).length,
    pain_mentions: notes.filter((t) => /đau|dau/i.test(t)).length,
    // best e1RM per session (Epley, ≤ 15 reps; assisted = body weight − assistance) — trend only, not a real 1RM
    e1rm_by_session: e1rmBySession(perSession, assisted, lastW || null),
    // sessions in a row stuck at the same load (missed rep_max, no more total reps) — see coach/CLAUDE.md
    stall_sessions: stallCount(perSession, assisted, plannedTarget(ex.slug as string)?.rep_max ?? null),
  };
});

const progressionReady = setsDetail
  .filter((d) => {
    const last = d.sessions.at(-1);
    const w = last?.sets.filter((s) => s.type === 'working') ?? [];
    return d.target && w.length >= d.target.sets && w.every((s) => (s.reps ?? 0) >= d.target!.rep_max && s.feel !== 'hard' && !s.kg_change_reason);
  })
  .map((d) => d.exercise);

const week = weekSummary(ws, sRows, iRows, setRows, content, lastW || 81.7);
const lastMeas = meas.at(-1) ?? null;
const meas4 = meas.filter((m) => m.log_date_s <= addDays(ws, -21)).at(-1) ?? null;
const latestIb = ibLogs.at(-1) ?? null;
const prevIb = ibLogs.at(-2) ?? null;

// app names plans by week inside each goal phase ("Tuần 2 · Noel"), restarting at every goal
const programStart = programStartOf(plans.map((p) => ({ id: p.id as string, version_no: p.version_no as number, effective_from: p.effective_from as string | null, created_at: new Date(p.created_at as string).toISOString() }))) ?? ws;
const phaseWeek = (d: IsoDate) => {
  const w = planWeek(d, goalRows, programStart);
  return { goal: w.goalName, week: w.week, total_weeks: w.totalWeeks, label: `Tuần ${w.week}${w.goalName ? ` · ${w.goalName}` : ''}` };
};

const report = {
  schema: 'coach-weekly/1',
  generated_at: new Date().toISOString(),
  week: { start: ws, end: we, reviewed: phaseWeek(ws), next_plan: phaseWeek(addDays(ws, 7)) },
  active_plan: { id: active.id, version_no: active.version_no, effective_from: active.effective_from, calories_kcal: content.nutrition.calories_kcal, content },
  pending_drafts: plans.filter((p) => p.status === 'draft').map((p) => ({ id: p.id, version_no: p.version_no, created_by: p.created_by, change_note: p.change_note })),
  rejected_recent: rejectedSummary(plans as never, (s) => (exBySlug.get(s)?.name_vi as string) ?? s),
  goals: goalRows.map((g) => {
    const p = goalProgress(g, lastW, we, trend, ffm);
    return { name: g.name, target_date: g.target_date, target_kg: [g.target_weight_min, g.target_weight_max], days_left: p.daysLeft, weeks_left: p.weeksLeft, gap_kg: p.gapKg, required_kg_per_week: p.requiredKgPerWeek, status: p.status, unsafe: p.unsafe, est_body_fat_pct: p.estimatedBodyFatPct };
  }),
  weight: {
    series_8w: wLogs.filter((w) => w.log_date >= from8w),
    week_first: weekLogs[0]?.weight_kg ?? null,
    week_last: weekLogs.at(-1)?.weight_kg ?? null,
    delta_kg: weekLogs.length >= 1 && wLogs.filter((w) => w.log_date < ws).at(-1) ? round(weekLogs.at(-1)!.weight_kg - wLogs.filter((w) => w.log_date < ws).at(-1)!.weight_kg, 1) : null,
    trend_kg_per_week: trend,
    weeks_without_loss: weeksWithoutLoss(weeklyWeights(wLogs)),
  },
  measurements: {
    latest: lastMeas,
    delta_4w: lastMeas ? measurementDeltas(meas4 as never, lastMeas as never) : {},
    whr: lastMeas ? whr(lastMeas as never) : null,
  },
  inbody: {
    latest: latestIb,
    previous: prevIb,
    delta: latestIb && prevIb ? compareInbody(prevIb, latestIb) : null,
    days_since_last: inbodyDue(latestIb?.measured_on ?? null, today).daysSince,
    new_this_week: !!latestIb && latestIb.measured_on >= ws && latestIb.measured_on <= we,
  },
  training: {
    planned_sessions: week.plannedSessions,
    done_sessions: week.doneSessions,
    badminton_sessions: week.badmintonSessions,
    set_completion_pct: week.setCompletionPct,
    warmup: {
      sessions_with_warmup: week.sessionsWithWarmup,
      sessions_total: week.strengthSessions,
      by_session: weekSessions.map((s) => ({ date: s.session_date, kind: s.kind, cardio: s.warmup?.cardio?.exercise ?? null, minutes: s.warmup?.cardio?.minutes ?? null, skipped: s.warmup?.skipped ?? null, mobility_done: s.warmup?.mobility_done ?? null })),
    },
    backfilled_sessions: weekSessions.filter((s) => s.is_backfill).map((s) => s.session_date),
    skipped_days: sRows.filter((s) => s.session_date >= ws && s.session_date <= we && s.status === 'skipped').map((s) => ({ date: s.session_date, kind: s.kind, note: s.note })),
    sessions: weekSessions.map((s) => ({ date: s.session_date, kind: s.kind, duration_min: s.duration_min, volume_kg: volumeKg(setRows.filter((x) => x.session_id === s.id), loads), note: s.note?.startsWith('Ghi nhanh') ? 'ghi nhanh' : s.note, reflection: s.reflection })),
    substitutions: iRows.filter((i) => weekIds.has(i.session_id) && i.substitution_reason).map((i) => ({ date: dateOf.get(i.session_id), planned: slugOf(i.planned_exercise_id), done: slugOf(i.exercise_id), reason: i.substitution_reason, note: i.substitution_note })),
    skipped_items: iRows.filter((i) => weekIds.has(i.session_id) && (i.status === 'skipped' || i.status === 'partial')).map((i) => ({ date: dateOf.get(i.session_id), exercise: slugOf(i.exercise_id), status: i.status, reason: i.skip_reason })),
    kg_changes: setRows.filter((s) => weekIds.has(s.session_id) && s.kg_change_reason).map((s) => ({ date: dateOf.get(s.session_id), exercise: slugOf(s.exercise_id), set: s.set_index, target_kg: s.target_kg, actual_kg: s.weight_kg, reason: s.kg_change_reason, note: s.kg_change_note })),
    sets_missing_kg: setsDetail.filter((d) => d.missing_kg_sets > 0).map((d) => ({ exercise: d.exercise, sets: d.missing_kg_sets })),
    volume_by_exercise_8w: trainedEx.map((id) => ({ exercise: slugOf(id), weekly_kg: weeklyVolumeByExercise(new Set([id]), sRows, setRows, weekStarts8, loads).map((v) => v.volume) })),
    sets_detail_4w: setsDetail,
    progression_ready: progressionReady,
    stalled: setsDetail
      .filter((d) => d.stall_sessions >= 2)
      .map((d) => {
        const ex = exBySlug.get(d.exercise as string);
        const t = d.target;
        return {
          exercise: d.exercise,
          sessions: d.stall_sessions,
          // ~90% of the recent best e1RM on the real load grid (lb pins / kg steps) — pick one, or explain why not
          deload_options: t
            ? deloadOptions({ sessions: perSessionBySlug.get(d.exercise as string) ?? [], loadStepKg: Number(ex?.load_step_kg ?? 2.5), repMin: t.rep_min, repMax: t.rep_max, assisted: d.is_assisted, bodyKg: lastW || null })
            : [],
        };
      }),
    schedule_violations: actualLegsBadmintonConflicts(weekSessions.map((s) => ({ date: s.session_date, kind: s.kind }))),
  },
  exercises: exercises.map((e) => ({
    slug: e.slug, name_vi: e.name_vi, in_templates: content.templates.filter((t) => t.items.some((i) => i.exercise === e.slug)).map((t) => t.key),
    has_illustration: e.has_illustration, available_at_gym: e.available_at_gym, unavailable_note: e.unavailable_note, is_provisional: e.is_provisional, archived: e.archived,
  })),
  provisional_exercises: exercises.filter((e) => e.is_provisional).map((e) => ({ slug: e.slug, name_vi: e.name_vi, aliases: e.aliases })),
  constraint_checks: {
    calories_floor_ok: content.nutrition.calories_kcal >= 1700,
    legs_badminton_gap_ok: legsBadmintonAdjacency(content.schedule).length === 0,
    loss_rate_ok: trend === null || trend <= 0.7,
  },
  days_until_next_monday: diffDays(today, addDays(weekStart(today), 7)),
};

process.stdout.write(JSON.stringify(report, null, 2) + '\n');
