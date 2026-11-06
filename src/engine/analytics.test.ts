import { describe, expect, it } from 'vitest';
import { averageMuscleSets, deloadOptions, e1rm, e1rmBySession, muscleSets, setTrend, stallCount, suspiciousSet, weeklyMuscleSets } from './analytics';
import type { SessionRow, SetRow } from './types';

const set = (kg: number | null, reps: number, o: Partial<SetRow> = {}): SetRow => ({
  id: crypto.randomUUID(), session_id: 's', session_item_id: 'i', exercise_id: 'e', set_index: 1, set_type: 'working',
  target_kg: null, target_rep_min: 10, target_rep_max: 12, reps, weight_kg: kg, seconds: null,
  kg_change_reason: null, kg_change_note: null, feel: null, note: null, completed: true, completed_at: null, ...o,
});
const s = (date: string, ...sets: SetRow[]) => ({ date, sets });

describe('e1RM', () => {
  it('Epley, capped at 15 reps, assisted = body weight − assistance', () => {
    expect(e1rm(27, 8)).toBe(34.2);
    expect(e1rm(27, 16)).toBeNull();
    expect(e1rm(21, 6, true, 80)).toBe(70.8);
    expect(e1rm(21, 6, true, null)).toBeNull();
  });
  it('best per session, warm-ups / empty kg ignored', () => {
    expect(e1rmBySession([s('2026-11-02', set(23, 12), set(27, 8), set(40, 1, { set_type: 'warmup' }), set(null, 12))])).toEqual([{ date: '2026-11-02', e1rm: 34.2 }]);
  });
});

describe('stallCount', () => {
  it('two misses at the same load without more reps → 2', () => {
    expect(stallCount([s('2026-10-26', set(27, 8), set(27, 8), set(27, 8)), s('2026-11-02', set(27, 8), set(27, 8), set(27, 7))])).toBe(2);
  });
  it('more total reps than last time → still progressing', () => {
    expect(stallCount([s('2026-10-26', set(27, 8), set(27, 8)), s('2026-11-02', set(27, 9), set(27, 9))])).toBe(0);
    expect(stallCount([s('a', set(27, 8), set(27, 8)), s('b', set(27, 9), set(27, 9)), s('c', set(27, 9), set(27, 8))])).toBe(1);
  });
  it('a hit or a load change ends the run', () => {
    expect(stallCount([s('a', set(27, 8)), s('b', set(27, 12), set(27, 12))])).toBe(0);
    expect(stallCount([s('a', set(23, 12), set(23, 12)), s('b', set(27, 8)), s('c', set(27, 8))])).toBe(2);
    expect(stallCount([s('a', set(27, 8)), s('b', set(23, 10)), s('c', set(23, 10))])).toBe(2);
  });
  it('target change ends the run; no target → 0', () => {
    expect(stallCount([s('a', set(27, 8, { target_kg: 23 })), s('b', set(27, 8, { target_kg: 27 }))])).toBe(1);
    expect(stallCount([s('a', set(27, 8, { target_rep_max: null }))])).toBe(0);
    expect(stallCount([s('a', set(27, 8, { target_rep_max: null }))], false, 12)).toBe(1);
  });
});

describe('deloadOptions', () => {
  it('lb stack 27×8 stuck (10–12 reps) → 23×10, then 23×11', () => {
    const o = deloadOptions({ sessions: [s('a', set(27, 8), set(27, 8)), s('b', set(27, 8), set(27, 7))], loadStepKg: 4.5, repMin: 10, repMax: 12 });
    expect(o).toEqual([{ kg: 23, reps: 10, e1rm: 30.7 }, { kg: 23, reps: 11, e1rm: 31.4 }]);
  });
  it('kg machine (step 5): stays on the 5 kg grid', () => {
    const o = deloadOptions({ sessions: [s('a', set(40, 8, { target_rep_max: 10 }))], loadStepKg: 5, repMin: 8, repMax: 10 });
    expect(o.every((x) => x.kg % 5 === 0 && x.kg <= 40)).toBe(true);
    expect(o[0]).toMatchObject({ kg: 35, reps: 9 });
  });
  it('assisted: more assistance, needs body weight', () => {
    const sessions = [s('a', set(21, 6, { target_rep_max: 8 }))];
    expect(deloadOptions({ sessions, loadStepKg: 4.5, repMin: 6, repMax: 8, assisted: true, bodyKg: null })).toEqual([]);
    const o = deloadOptions({ sessions, loadStepKg: 4.5, repMin: 6, repMax: 8, assisted: true, bodyKg: 80 });
    expect(o.length).toBe(2);
    expect(o.every((x) => x.kg >= 21)).toBe(true);
  });
});

describe('muscleSets', () => {
  const ex = new Map([
    ['press', { primary_muscle: 'chest', secondary_muscles: ['front_delt', 'triceps'], kind: 'compound' }],
    ['walk', { primary_muscle: 'cardio', secondary_muscles: [], kind: 'cardio' }],
    ['dup', { primary_muscle: 'quads', secondary_muscles: [], kind: 'compound', canonical_exercise_id: 'press' }],
  ]);
  it('primary +1, secondary +0.5; warm-ups, cardio, unticked sets ignored; provisional → canonical', () => {
    const sets = [
      set(27, 10, { exercise_id: 'press' }), set(27, 10, { exercise_id: 'press' }), set(20, 10, { exercise_id: 'press', set_type: 'warmup' }),
      set(27, 10, { exercise_id: 'press', completed: false }), set(null, 0, { exercise_id: 'walk' }), set(30, 8, { exercise_id: 'dup' }),
    ];
    expect(muscleSets(sets, ex)).toEqual({ chest: 3, front_delt: 1.5, triceps: 1.5 });
  });
  it('weekly + 4-week average', () => {
    const sessions = [{ id: 'w1', session_date: '2026-10-27', status: 'completed' }, { id: 'w2', session_date: '2026-11-03', status: 'completed' }] as SessionRow[];
    const sets = [set(27, 10, { exercise_id: 'press', session_id: 'w1' }), set(27, 10, { exercise_id: 'press', session_id: 'w2' }), set(27, 10, { exercise_id: 'press', session_id: 'w2' })];
    const w1 = weeklyMuscleSets('2026-10-26', sessions, sets, ex);
    const w2 = weeklyMuscleSets('2026-11-02', sessions, sets, ex);
    expect(w1.chest).toBe(1);
    expect(w2.chest).toBe(2);
    expect(averageMuscleSets([w1, w2])).toMatchObject({ chest: 1.5, triceps: 0.8 });
  });
});

describe('setTrend', () => {
  it('load first, then reps; missing set last time → new', () => {
    const last = [set(27, 10, { set_index: 1 }), set(27, 10, { set_index: 2 }), set(27, 9, { set_index: 3 })];
    const cur = [set(32, 8, { set_index: 1 }), set(27, 10, { set_index: 2 }), set(27, 8, { set_index: 3 }), set(27, 8, { set_index: 4 })];
    expect(setTrend(cur, last).map((t) => t.trend)).toEqual(['up', 'same', 'down', 'new']);
    expect(setTrend(cur, null).map((t) => t.trend)).toEqual(['new', 'new', 'new', 'new']);
    // kg forgotten on one side → not comparable
    expect(setTrend([set(null, 12)], [set(27, 12)])[0].trend).toBe('new');
    expect(setTrend([set(null, 12)], [set(null, 10)])[0].trend).toBe('up');
  });
  it('assisted: less assistance = up', () => {
    expect(setTrend([set(21, 6)], [set(27, 6)], true)[0].trend).toBe('up');
  });
});

describe('suspiciousSet', () => {
  const hist = [set(40, 12), set(36, 10)];
  it('kg far above / below what he has done', () => {
    expect(suspiciousSet({ kg: 200, reps: 12 }, hist)).toContain('Nặng nhất từng tập 40');
    expect(suspiciousSet({ kg: 4, reps: 12 }, hist)).toContain('Thường tập tới 40');
    expect(suspiciousSet({ kg: 45, reps: 12 }, hist)).toBeNull();
    expect(suspiciousSet({ kg: 200, reps: 12 }, [])).toBeNull(); // first time: nothing to compare
  });
  it('reps typo; lb stack between pins', () => {
    expect(suspiciousSet({ kg: 40, reps: 120 }, hist, { repMax: 12 })).toContain('120 lần');
    expect(suspiciousSet({ kg: 40, reps: 15 }, hist, { repMax: 12 })).toBeNull();
    expect(suspiciousSet({ kg: 25, reps: 10 }, [], { loadStepKg: 4.5 })).toContain('nấc gần nhất 27');
    expect(suspiciousSet({ kg: 27, reps: 10 }, [], { loadStepKg: 4.5 })).toBeNull();
  });
});
