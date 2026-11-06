import { describe, expect, it } from 'vitest';
import { e1rm, e1rmBySession, stallCount } from './analytics';
import type { SetRow } from './types';

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
