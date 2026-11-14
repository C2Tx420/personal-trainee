import { round } from './math';
import { t } from '../i18n';

export const MEASUREMENT_FIELDS = [
  ['neck_cm', t('Vòng cổ')],
  ['chest_cm', t('Vòng ngực')],
  ['waist_navel_cm', t('Vòng eo (ngang rốn)')],
  ['abdomen_cm', t('Vòng bụng')],
  ['hip_cm', t('Vòng hông')],
  ['shoulder_cm', t('Vòng vai')],
  ['upper_arm_cm', t('Bắp tay trên')],
  ['forearm_cm', t('Bắp tay dưới')],
  ['thigh_cm', t('Vòng đùi')],
  ['calf_cm', t('Bắp chân')],
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number][0];

/**
 * The measurements logged each week: waist + hip (WHR), chest, upper arm, thigh.
 * The other columns stay readable for older entries but are no longer asked for.
 */
export const MAIN_MEASUREMENTS: readonly MeasurementKey[] = ['waist_navel_cm', 'hip_cm', 'chest_cm', 'upper_arm_cm', 'thigh_cm'];
export const MAIN_MEASUREMENT_FIELDS = MEASUREMENT_FIELDS.filter(([k]) => MAIN_MEASUREMENTS.includes(k));
export type Measurements = Partial<Record<MeasurementKey, number | null>>;

/** Waist-to-hip ratio — only when both numbers are present. */
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
