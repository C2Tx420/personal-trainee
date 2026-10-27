import { addDays, diffDays, type IsoDate, weekStart } from './dates';
import { avg, round, slope } from './math';
import { CALORIES_FLOOR } from './plan-schema';

export type WeightLog = { log_date: IsoDate; weight_kg: number };

export type WeeklyWeight = { weekStart: IsoDate; first: number; last: number; avg: number; count: number };

export function weeklyWeights(logs: WeightLog[]): WeeklyWeight[] {
  const byWeek = new Map<IsoDate, WeightLog[]>();
  for (const l of [...logs].sort((a, b) => (a.log_date < b.log_date ? -1 : 1))) {
    const w = weekStart(l.log_date);
    byWeek.set(w, [...(byWeek.get(w) ?? []), l]);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([w, ls]) => ({
      weekStart: w,
      first: ls[0].weight_kg,
      last: ls[ls.length - 1].weight_kg,
      avg: round(avg(ls.map((l) => l.weight_kg)), 2),
      count: ls.length,
    }));
}

/** Loss rate (kg/week, positive = losing) via regression over the last `windowDays` days. */
export function lossTrendKgPerWeek(logs: WeightLog[], today: IsoDate, windowDays = 21): number | null {
  const from = addDays(today, -windowDays);
  const pts = logs.filter((l) => l.log_date >= from && l.log_date <= today);
  if (pts.length < 2) return null;
  const s = slope(pts.map((l) => ({ x: diffDays(from, l.log_date), y: l.weight_kg })));
  return round(-s * 7, 2);
}

export type LossRateVerdict = 'slow' | 'ok' | 'fast';

export function lossRateVerdict(deltaKg: number, minKg = 0.5, maxKg = 0.7): LossRateVerdict {
  const loss = -deltaKg;
  if (loss < minKg) return 'slow';
  if (loss > maxKg) return 'fast';
  return 'ok';
}

/**
 * Consecutive weeks (up to the latest week) whose weekly average did not drop compared
 * with the week before. ≥ 2 → plateau warning.
 */
export function weeksWithoutLoss(weeks: WeeklyWeight[]): number {
  let n = 0;
  for (let i = weeks.length - 1; i >= 1; i--) {
    if (weeks[i].avg >= weeks[i - 1].avg) n++;
    else break;
  }
  return n;
}

export type CalorieSuggestion = {
  newCalories: number;
  reduction: number;
  /** hit the 1,700 floor → only suggest more activity */
  atFloor: boolean;
  tips: string[];
};

/** Suggestion after a 2-week plateau: lower reference calories by 100–150 kcal, never below 1,700. */
export function stallSuggestion(currentCalories: number, reduction = 150): CalorieSuggestion {
  const target = Math.max(CALORIES_FLOOR, currentCalories - reduction);
  const atFloor = target === currentCalories;
  const tips = atFloor
    ? ['Calo tham khảo đã ở mức sàn 1.700 — tăng vận động: thêm ~2.000 bước/ngày']
    : [
        'Bớt ~⅓ chén cơm mỗi bữa chính',
        'Bỏ 1 ly nước ngọt / trà sữa mỗi ngày (≈ 100–150 kcal)',
        'Thêm ~2.000 bước/ngày',
      ];
  return { newCalories: target, reduction: currentCalories - target, atFloor, tips };
}
