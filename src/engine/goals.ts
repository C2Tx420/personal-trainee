import { diffDays, type IsoDate } from './dates';
import { round } from './math';
import { MAX_SAFE_LOSS_KG_PER_WEEK } from './plan-schema';

export type Goal = {
  id: string;
  name: string;
  ordinal: number;
  target_date: IsoDate;
  target_weight_min: number;
  target_weight_max: number;
  target_body_fat_min: number | null;
  target_body_fat_max: number | null;
  status: 'pending' | 'active' | 'achieved' | 'missed';
  achieved_at: string | null;
};

export type GoalStatus = 'achieved' | 'on_track' | 'behind' | 'missed';

export type GoalProgress = {
  goal: Goal;
  daysLeft: number;
  weeksLeft: number;
  /** latest weight − upper bound of the goal (positive = still to lose). */
  gapKg: number;
  /** kg/week needed to make it, 0 if already reached. */
  requiredKgPerWeek: number;
  /** required rate > 0.7 kg/week. */
  unsafe: boolean;
  status: GoalStatus;
  /** estimated body fat % at the goal if FFM is kept. */
  estimatedBodyFatPct: number | null;
};

/** Estimated body fat % at `weightKg` if lean mass `ffmKg` stays the same. */
export function estimateBodyFatPct(ffmKg: number, weightKg: number): number {
  return round((1 - ffmKg / weightKg) * 100, 1);
}

/**
 * @param trendKgPerWeek actual loss rate (positive = losing), null if there isn't enough data.
 */
export function goalProgress(
  goal: Goal,
  latestWeightKg: number,
  today: IsoDate,
  trendKgPerWeek: number | null,
  ffmKg: number | null,
): GoalProgress {
  const daysLeft = diffDays(today, goal.target_date);
  const weeksLeft = round(daysLeft / 7, 1);
  const gapKg = round(latestWeightKg - goal.target_weight_max, 1);
  const midTarget = (goal.target_weight_min + goal.target_weight_max) / 2;
  const estimatedBodyFatPct = ffmKg ? estimateBodyFatPct(ffmKg, midTarget) : null;

  let status: GoalStatus;
  let requiredKgPerWeek = 0;
  if (gapKg <= 0 || goal.status === 'achieved') {
    status = 'achieved';
  } else if (daysLeft < 0) {
    status = 'missed';
  } else {
    requiredKgPerWeek = round(gapKg / Math.max(daysLeft / 7, 1 / 7), 2);
    status = trendKgPerWeek !== null && trendKgPerWeek >= requiredKgPerWeek * 0.9 ? 'on_track' : 'behind';
    if (trendKgPerWeek === null) status = 'on_track';
  }
  return {
    goal,
    daysLeft,
    weeksLeft,
    gapKg,
    requiredKgPerWeek,
    unsafe: requiredKgPerWeek > MAX_SAFE_LOSS_KG_PER_WEEK,
    status,
    estimatedBodyFatPct,
  };
}

/** Main goal on the Today screen: the first goal (in order) not yet reached and not yet past. */
export function activeGoal(progress: GoalProgress[]): GoalProgress | undefined {
  return [...progress]
    .sort((a, b) => a.goal.ordinal - b.goal.ordinal)
    .find((p) => p.status !== 'achieved' && p.status !== 'missed');
}

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  achieved: 'Đã đạt',
  on_track: 'Đúng hướng',
  behind: 'Chậm',
  missed: 'Lỡ mốc',
};
