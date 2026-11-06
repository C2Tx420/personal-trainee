/**
 * Load direction. On assisted machines (assisted pull-up / dip, `is_assisted`) the kg on the stack is
 * ASSISTANCE: a lower kg is harder. Every "heavier / better / record" comparison goes through here.
 */

const EPS = 0.01;

/** Load `a` is harder than load `b`. */
export function harder(a: number, b: number, assisted: boolean): boolean {
  return assisted ? a < b - EPS : a > b + EPS;
}

/** Same load (to the gram). */
export const sameLoad = (a: number, b: number): boolean => Math.abs(a - b) <= EPS;

/** Sort comparator: hardest load first. */
export function byHardest(assisted: boolean) {
  return (a: number, b: number): number => (assisted ? a - b : b - a);
}

/** Hardest of several loads (min kg on assisted machines). */
export function hardestLoad(loads: number[], assisted: boolean): number {
  return assisted ? Math.min(...loads) : Math.max(...loads);
}

/**
 * Load that actually moves: the kg itself, or body weight − assistance on assisted machines
 * (null when the body weight is unknown or the assistance is not below it).
 */
export function effectiveLoad(kg: number, assisted: boolean, bodyKg: number | null): number | null {
  if (!assisted) return kg;
  if (bodyKg === null || bodyKg - kg <= 0) return null;
  return bodyKg - kg;
}

/** Per-exercise lookup of the assisted flag + the body weight used for effective loads. */
export type LoadContext = { assisted: (exerciseId: string) => boolean; bodyKg: number | null };
export const PLAIN_LOADS: LoadContext = { assisted: () => false, bodyKg: null };

/** Build a LoadContext from the exercise library. */
export function loadContext(byId: Map<string, { is_assisted?: boolean }>, bodyKg: number | null = null): LoadContext {
  return { assisted: (id) => !!byId.get(id)?.is_assisted, bodyKg };
}
