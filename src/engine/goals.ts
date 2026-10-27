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
  /** cân gần nhất − cận trên mục tiêu (dương = còn phải giảm). */
  gapKg: number;
  /** kg/tuần cần giảm để kịp, 0 nếu đã đạt. */
  requiredKgPerWeek: number;
  /** tốc độ cần > 0,7 kg/tuần. */
  unsafe: boolean;
  status: GoalStatus;
  /** % mỡ ước tính tại mốc nếu giữ được FFM. */
  estimatedBodyFatPct: number | null;
};

/** % mỡ ước tính tại cân nặng `weightKg` nếu giữ nguyên khối nạc `ffmKg`. */
export function estimateBodyFatPct(ffmKg: number, weightKg: number): number {
  return round((1 - ffmKg / weightKg) * 100, 1);
}

/**
 * @param trendKgPerWeek tốc độ giảm thực tế (số dương = đang giảm), null nếu chưa đủ dữ liệu.
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

/** Mốc chính trên trang Hôm nay: mốc đầu tiên (theo thứ tự) chưa đạt và chưa qua ngày. */
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
