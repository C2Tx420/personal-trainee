import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import { capBelow } from './stack';
import { planItemSchema } from './plan-schema';
import { backoffKg, plannedSets, suggestWarmup } from './warmup';

const item = { ...PLAN_V1.templates[0].items[0], target_kg: 27, target_kg_per_set: null, unit: 'reps' as const };
const warm = (ws: typeof item.warmup_sets, step = 4.5) =>
  plannedSets({ ...item, warmup_sets: ws }, step, null).filter((p) => p.setType === 'warmup').map((p) => [p.targetKg, p.repMax]);

describe('làm nóng theo mức tạ (v2.7 B8)', () => {
  it('chest press 27 kg (lb stack): 50% × 8 → 14 (30 lb), 75% × 4 → 18 (40 lb)', () => {
    expect(warm(suggestWarmup({ kind: 'compound' }))).toEqual([[14, 8], [18, 4]]);
  });
  it('never as heavy as the working load (rounding up is capped one step below)', () => {
    expect(warm([{ pct: 100, reps: 3 }])).toEqual([[23, 3]]);
    expect(warm([{ pct: 95, reps: 3 }], 5)).toEqual([[25, 3]]);
    expect(capBelow(5, 5, 4.5)).toBe(0);
    expect(capBelow(18, 27, 4.5)).toBe(18);
  });
  it('defaults: compound ramp; light load → one set; isolation / assisted / timed → none', () => {
    expect(suggestWarmup({ kind: 'compound' })).toEqual([{ pct: 50, reps: 8 }, { pct: 75, reps: 4 }]);
    expect(suggestWarmup({ kind: 'compound', workingKg: 9, loadStepKg: 4.5 })).toEqual([{ pct: 75, reps: 5 }]);
    expect(suggestWarmup({ kind: 'isolation' })).toEqual([]);
    expect(suggestWarmup({ kind: 'compound', assisted: true })).toEqual([]);
    expect(suggestWarmup({ kind: 'compound', isTimeBased: true })).toEqual([]);
  });
});

describe('backoff_steps (v2.7 B9)', () => {
  const work = (o: Partial<typeof item>, step = 4.5, assisted = false) =>
    plannedSets({ ...item, warmup_sets: [], sets: 3, ...o }, step, null, assisted).map((p) => p.targetKg);
  it('sets 2+ one pin lighter; raising the top set carries the rest', () => {
    expect(work({ target_kg: 23, backoff_steps: 1 })).toEqual([23, 18, 18]);
    expect(work({ target_kg: 27, backoff_steps: 1 })).toEqual([27, 23, 23]);
    expect(work({ target_kg: 30, backoff_steps: 2 }, 2.5)).toEqual([30, 25, 25]);
    expect(work({ target_kg: 23 })).toEqual([23, 23, 23]);
  });
  it('assisted → more assistance on later sets', () => {
    expect(backoffKg(21, 1, 4.5, true)).toBe(23);
    expect(backoffKg(null, 1, 4.5)).toBeNull();
  });
  it('schema: not together with target_kg_per_set', () => {
    expect(() => planItemSchema.parse({ ...item, backoff_steps: 1, target_kg_per_set: [27, 23, 23], sets: 3 })).toThrow(/backoff_steps/);
    expect(planItemSchema.parse({ ...item, backoff_steps: 1 }).backoff_steps).toBe(1);
  });
});
