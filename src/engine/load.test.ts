import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import { effectiveLoad, harder, hardestLoad } from './load';
import { sessionChanges } from './plan-diff';
import { parsePlanContent } from './plan-schema';
import { progressionHint } from './progression';
import { personalRecords, strengthChanges } from './progress';
import type { SessionRow, SetRow } from './types';
import { plannedSets } from './warmup';
import { topSetSeries, volumeKg } from './workout-summary';

const set = (o: Partial<SetRow>): SetRow => ({
  id: crypto.randomUUID(), session_id: 's', session_item_id: 'i', exercise_id: 'a', set_index: 1, set_type: 'working',
  target_kg: null, target_rep_min: null, target_rep_max: null, reps: 8, weight_kg: 27, seconds: null,
  kg_change_reason: null, kg_change_note: null, feel: null, note: null, completed: true, completed_at: null, ...o,
});
const isA = (id: string) => id === 'a';

describe('máy trợ lực (kg = trợ lực, thấp hơn = nặng hơn)', () => {
  it('direction helpers', () => {
    expect(harder(21, 27, true)).toBe(true);
    expect(harder(21, 27, false)).toBe(false);
    expect(hardestLoad([27, 21, 23], true)).toBe(21);
    expect(effectiveLoad(21, true, 80)).toBe(59);
    expect(effectiveLoad(21, true, null)).toBeNull();
    expect(effectiveLoad(21, false, null)).toBe(21);
  });

  it('less assistance → kg record; more assistance is not a record', () => {
    const prev = [set({ weight_kg: 27, reps: 8 }), set({ weight_kg: 21, reps: 5 })];
    expect(personalRecords([set({ id: 'k', weight_kg: 18, reps: 4 })], prev, undefined, isA)).toMatchObject([{ setId: 'k', kind: 'kg', kg: 18, prevKg: 21 }]);
    expect(personalRecords([set({ weight_kg: 32, reps: 10 })], prev, undefined, isA)).toEqual([]);
    // more reps at 21 kg assistance, counting sets done with less assistance too
    expect(personalRecords([set({ id: 'r', weight_kg: 21, reps: 6 })], prev, undefined, isA)).toMatchObject([{ setId: 'r', kind: 'reps', prevReps: 5 }]);
    // the old direction would have called 32 kg a record
    expect(personalRecords([set({ weight_kg: 32, reps: 10 })], prev)).toMatchObject([{ kind: 'kg' }]);
  });

  it('progress card + chart pick the least assistance', () => {
    const sessions = [{ id: 's1', session_date: '2026-10-28', status: 'completed' }, { id: 's2', session_date: '2026-11-04', status: 'completed' }] as SessionRow[];
    const sets = [set({ session_id: 's1', weight_kg: 27 }), set({ session_id: 's1', weight_kg: 21 }), set({ session_id: 's2', weight_kg: 18 })];
    expect(strengthChanges(sessions, sets, undefined, isA)).toMatchObject([{ first: { kg: 21 }, last: { kg: 18 }, pct: 14, assisted: true }]);
    expect(topSetSeries(new Set(['a']), sessions, sets, true).map((t) => t.topKg)).toEqual([21, 18]);
  });

  it('hint: hit rep_max → one step LESS assistance (pin on lb stacks)', () => {
    const item = { ...PLAN_V1.templates[1].items[0], target_kg: null, rep_max: 8, unit: 'reps' as const };
    const last = { date: '2026-11-04', sets: [set({ weight_kg: 27, reps: 8 })] };
    expect(progressionHint(item, last, 4.5, true)).toContain('23 kg trợ lực');
    expect(progressionHint(item, last, 5, true)).toContain('22 kg trợ lực');
    expect(progressionHint(item, { date: '2026-11-04', sets: [set({ weight_kg: 5, reps: 8 })] }, 5, true)).toContain('bớt trợ lực');
  });

  it('volume uses body weight − assistance; unknown body weight → left out', () => {
    const sets = [set({ weight_kg: 21, reps: 6 }), set({ exercise_id: 'b', weight_kg: 30, reps: 10 })];
    expect(volumeKg(sets, { assisted: isA, bodyKg: 80 })).toBe(59 * 6 + 300);
    expect(volumeKg(sets, { assisted: isA, bodyKg: null })).toBe(300);
  });

  it('no % warm-ups on assisted machines (fixed kg ones stay)', () => {
    const item = { ...PLAN_V1.templates[0].items[0], target_kg: 27, warmup_sets: [{ pct: 75, reps: 8 }, { kg: 32, reps: 5 }] };
    expect(plannedSets(item, 4.5, null, true).filter((p) => p.setType === 'warmup').map((p) => p.targetKg)).toEqual([32]);
    expect(plannedSets(item, 4.5, null, false).filter((p) => p.setType === 'warmup')).toHaveLength(2);
  });

  it('plan review: lower assistance shows as ↑', () => {
    const a = parsePlanContent(PLAN_V1);
    const b = structuredClone(a);
    const ia = a.templates[1].items[0];
    ia.target_kg = 27;
    b.templates[1].items[0].target_kg = 23;
    const slug = ia.exercise;
    const view = (assisted: boolean) => sessionChanges(a, b, (s) => s, (s) => assisted && s === slug)[1].items[0].changes.find((c) => c.kind === 'target_kg')?.dir;
    expect(view(true)).toBe('up');
    expect(view(false)).toBe('down');
  });
});
