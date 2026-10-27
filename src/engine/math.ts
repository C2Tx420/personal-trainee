export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

export function avg(xs: number[]): number {
  return xs.length === 0 ? 0 : sum(xs) / xs.length;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function round(v: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/** Round to the load step (2.5kg, 5kg…), never negative. */
export function roundToStep(kg: number, step: number): number {
  if (step <= 0) return round(kg, 1);
  return Math.max(0, Math.round(kg / step) * step);
}

/** Epley: 1RM ≈ kg × (1 + reps/30). */
export function e1rm(kg: number, reps: number): number {
  return kg * (1 + reps / 30);
}

/** Linear regression y = a + b·x, returns the slope b (units of y / units of x). */
export function slope(points: { x: number; y: number }[]): number {
  if (points.length < 2) return 0;
  const mx = avg(points.map((p) => p.x));
  const my = avg(points.map((p) => p.y));
  const num = sum(points.map((p) => (p.x - mx) * (p.y - my)));
  const den = sum(points.map((p) => (p.x - mx) ** 2));
  return den === 0 ? 0 : num / den;
}

/** "1.452" — dot as thousands separator, comma as decimal separator. */
export function formatNumberVN(n: number, digits = 0): string {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n);
}
