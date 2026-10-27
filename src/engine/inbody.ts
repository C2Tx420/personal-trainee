import { diffDays, type IsoDate } from './dates';
import { round } from './math';

export type InbodyLog = {
  measured_on: IsoDate;
  weight_kg: number;
  smm_kg: number | null;
  pbf_pct: number | null;
  visceral_fat_level: number | null;
  whr: number | null;
  ffm_kg: number | null;
  bmr_kcal: number | null;
  inbody_score: number | null;
};

const INBODY_INTERVAL_DAYS = 30;

export type InbodyDelta = {
  weightKg: number;
  fatKg: number | null;
  pbfPct: number | null;
  smmKg: number | null;
  visceral: number | null;
};

export function fatMassKg(l: InbodyLog): number | null {
  return l.pbf_pct === null ? null : round((l.weight_kg * l.pbf_pct) / 100, 1);
}

export function compareInbody(prev: InbodyLog, cur: InbodyLog): InbodyDelta {
  const d = (a: number | null, b: number | null) => (a === null || b === null ? null : round(b - a, 1));
  return {
    weightKg: round(cur.weight_kg - prev.weight_kg, 1),
    fatKg: d(fatMassKg(prev), fatMassKg(cur)),
    pbfPct: d(prev.pbf_pct, cur.pbf_pct),
    smmKg: d(prev.smm_kg, cur.smm_kg),
    visceral: d(prev.visceral_fat_level, cur.visceral_fat_level),
  };
}

export function inbodyDue(latest: IsoDate | null, today: IsoDate): { due: boolean; daysSince: number | null } {
  if (!latest) return { due: true, daysSince: null };
  const daysSince = diffDays(latest, today);
  return { due: daysSince >= INBODY_INTERVAL_DAYS, daysSince };
}

/** Latest scan that has FFM. */
export function latestFfm(logs: InbodyLog[]): number | null {
  return [...logs].sort((a, b) => (a.measured_on < b.measured_on ? 1 : -1)).find((l) => l.ffm_kg !== null)?.ffm_kg ?? null;
}
