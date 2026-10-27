import { roundToStep } from './math';
import type { PlanItem } from './plan-schema';

export type PlannedSet = {
  setType: 'warmup' | 'working';
  /** thứ tự trong nhóm (1-based): Làm nóng 1, 2 … / Hiệp chính 1, 2, 3 */
  index: number;
  targetKg: number | null;
  repMin: number;
  repMax: number;
};

/**
 * Danh sách hiệp dự kiến của một bài: hiệp làm nóng (theo `warmup_sets`) rồi hiệp chính.
 *
 * Tạ làm nóng: `kg` cố định nếu có, nếu không thì `pct`% của tạ chính
 * (`target_kg`, chưa có thì `fallbackWorkingKg` = kg hiệp chính lần trước),
 * làm tròn theo bước tạ. Không có số nào để tính → null (anh tự nhập).
 */
export function plannedSets(item: PlanItem, loadStepKg: number, fallbackWorkingKg: number | null): PlannedSet[] {
  const workingKg = item.target_kg ?? fallbackWorkingKg;
  const warmups: PlannedSet[] =
    item.unit === 'seconds'
      ? []
      : item.warmup_sets.map((w, i) => {
          const reps = w.reps === 'same' ? item.rep_max : w.reps;
          let kg: number | null = null;
          if (w.kg !== undefined) kg = w.kg;
          else if (w.pct !== undefined && workingKg !== null) kg = roundToStep((workingKg * w.pct) / 100, loadStepKg);
          return { setType: 'warmup', index: i + 1, targetKg: kg, repMin: reps, repMax: reps };
        });
  const working: PlannedSet[] = Array.from({ length: item.sets }, (_, i) => ({
    setType: 'working',
    index: i + 1,
    targetKg: item.target_kg_per_set?.[i] ?? item.target_kg,
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
