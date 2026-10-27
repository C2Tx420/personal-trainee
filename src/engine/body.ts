import { round } from './math';

export const MEASUREMENT_FIELDS = [
  ['neck_cm', 'Vòng cổ'],
  ['chest_cm', 'Vòng ngực'],
  ['waist_navel_cm', 'Vòng eo (ngang rốn)'],
  ['abdomen_cm', 'Vòng bụng'],
  ['hip_cm', 'Vòng hông'],
  ['shoulder_cm', 'Vòng vai'],
  ['upper_arm_cm', 'Bắp tay trên'],
  ['forearm_cm', 'Bắp tay dưới'],
  ['thigh_cm', 'Vòng đùi'],
  ['calf_cm', 'Bắp chân'],
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number][0];
export type Measurements = Partial<Record<MeasurementKey, number | null>>;

/** Tỷ lệ eo/hông — chỉ khi có đủ cả hai số. */
export function whr(m: Measurements): number | null {
  if (!m.waist_navel_cm || !m.hip_cm) return null;
  return round(m.waist_navel_cm / m.hip_cm, 2);
}

export const WHR_MALE_THRESHOLD = 0.9;

export function measurementDeltas(prev: Measurements | null, cur: Measurements): Partial<Record<MeasurementKey, number>> {
  const out: Partial<Record<MeasurementKey, number>> = {};
  if (!prev) return out;
  for (const [k] of MEASUREMENT_FIELDS) {
    const a = prev[k];
    const b = cur[k];
    if (a != null && b != null) out[k] = round(b - a, 1);
  }
  return out;
}
