import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import { capBelow } from './stack';
import { plannedSets, suggestWarmup } from './warmup';

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
