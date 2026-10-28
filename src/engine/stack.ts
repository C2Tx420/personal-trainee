import { roundToStep } from './math';

/**
 * Pin-loaded machines whose stack is marked in lb (the gym's Matrix machines).
 * They are marked by `load_step_kg = 4.5` (one 10-lb pin) and logged as whole kg,
 * the way the plates read in kg: 40 lb = 18, 50 = 23, 60 = 27, 70 = 32, 80 = 36…
 */
export const LB_STACK_STEP_KG = 4.5;
const KG_PER_LB = 0.45359237;
const PIN_LB = 10;
const MAX_LB = 400;

export const isLbStack = (loadStepKg: number | null | undefined): boolean => loadStepKg === LB_STACK_STEP_KG;

export const lbToKg = (lb: number): number => Math.round(lb * KG_PER_LB);

/** Nearest pin (in lb) to a kg value, at least one pin. */
export function kgToLb(kg: number): number {
  return Math.max(PIN_LB, Math.round(kg / KG_PER_LB / PIN_LB) * PIN_LB);
}

/** Next pin up (+1) or down (−1) from a kg value that may sit between pins. */
export function stackStep(kg: number | null, dir: 1 | -1): number {
  if (kg === null) return lbToKg(PIN_LB * 4);
  const lb = kgToLb(kg);
  const onPin = lbToKg(lb) === kg;
  let next = onPin ? lb + dir * PIN_LB : lb;
  if (!onPin && Math.sign(lbToKg(lb) - kg) !== dir) next = lb + dir * PIN_LB;
  return lbToKg(Math.min(MAX_LB, Math.max(PIN_LB, next)));
}

/** `count` pins around a kg value (or around 40 lb when empty), for one-tap chips. */
export function pinsAround(kg: number | null, count = 5): { lb: number; kg: number }[] {
  const center = kg === null ? PIN_LB * 4 : kgToLb(kg);
  const first = Math.max(PIN_LB, center - PIN_LB * Math.floor(count / 2));
  return Array.from({ length: count }, (_, i) => first + i * PIN_LB).map((lb) => ({ lb, kg: lbToKg(lb) }));
}

/** Round a computed load (warm-up %, +1 step) onto the equipment: nearest pin for lb stacks, else the kg step. */
export function roundLoad(kg: number, loadStepKg: number): number {
  return isLbStack(loadStepKg) ? lbToKg(kgToLb(kg)) : roundToStep(kg, loadStepKg);
}
