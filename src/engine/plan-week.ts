import { addDays, diffDays, formatVN, type IsoDate, todayVN, weekStart } from './dates';
import type { Goal } from './goals';
import { t } from '../i18n';

/** Training week inside a goal phase: "Noel · tuần 2/9". */
export type PlanWeek = {
  /** goal of the phase, null after the last goal */
  goalName: string | null;
  /** 1-based, restarts at every goal */
  week: number;
  /** weeks in the phase, null after the last goal */
  totalWeeks: number | null;
  /** Monday of that week */
  start: IsoDate;
};

/**
 * Which phase week `date` falls in. Every goal is a phase: it starts the week after the
 * previous goal's week (the first one at `programStart`) and ends with the week of its target date.
 */
export function planWeek(date: IsoDate, goals: Goal[], programStart: IsoDate): PlanWeek {
  const start = weekStart(date);
  const sorted = [...goals].sort((a, b) => a.target_date.localeCompare(b.target_date));
  let phaseStart = weekStart(programStart);
  for (const g of sorted) {
    const end = weekStart(g.target_date);
    if (end < phaseStart) continue;
    if (start <= end) {
      const from = start < phaseStart ? start : phaseStart;
      return { goalName: g.name, week: diffDays(from, start) / 7 + 1, totalWeeks: diffDays(from, end) / 7 + 1, start };
    }
    phaseStart = addDays(end, 7);
  }
  const from = start < phaseStart ? start : phaseStart;
  return { goalName: null, week: diffDays(from, start) / 7 + 1, totalWeeks: null, start };
}

export type PlanLabel = PlanWeek & {
  /** "Tuần 2" or "Tuần 2 · bản 2" when one week has several plans */
  title: string;
  /** "Noel · tuần 2/9 · 02/11–08/11" */
  sub: string;
};

type PlanLike = { id: string; version_no: number; effective_from: IsoDate | null; created_at: string };

/** Week a plan belongs to: the day it takes effect, or the day it was created (draft, rejected). */
export function planDate(p: PlanLike): IsoDate {
  return p.effective_from ?? todayVN(new Date(p.created_at));
}

/** Day the program started = week 1 of the first goal. */
export function programStartOf(plans: PlanLike[]): IsoDate | null {
  return plans.map(planDate).sort()[0] ?? null;
}

/** Label every plan by its training week instead of its version number. */
export function planLabels(plans: PlanLike[], goals: Goal[]): Map<string, PlanLabel> {
  const out = new Map<string, PlanLabel>();
  const programStart = programStartOf(plans);
  if (!programStart) return out;
  const byWeek = new Map<string, PlanLike[]>();
  for (const p of [...plans].sort((a, b) => a.version_no - b.version_no)) {
    const w = weekStart(planDate(p));
    byWeek.set(w, [...(byWeek.get(w) ?? []), p]);
  }
  for (const list of byWeek.values()) {
    list.forEach((p, i) => {
      const w = planWeek(planDate(p), goals, programStart);
      out.set(p.id, { ...w, title: list.length > 1 ? t('Tuần {week} · bản {n}', { week: w.week, n: i + 1 }) : t('Tuần {week}', { week: w.week }), sub: weekSub(w) });
    });
  }
  return out;
}

/** Label for a review note's week (`week_start` = the week that was reviewed). */
export function reviewWeekLabel(weekStartDate: IsoDate, goals: Goal[], programStart: IsoDate): PlanLabel {
  const w = planWeek(weekStartDate, goals, programStart);
  return { ...w, title: t('Tuần {week}', { week: w.week }), sub: weekSub(w) };
}

function weekSub(w: PlanWeek): string {
  const phase = w.goalName ? t('{goal} · tuần {week}/{total}', { goal: w.goalName, week: w.week, total: String(w.totalWeeks) }) : t('tuần {week}', { week: w.week });
  return `${phase} · ${formatVN(w.start)}–${formatVN(addDays(w.start, 6))}`;
}
