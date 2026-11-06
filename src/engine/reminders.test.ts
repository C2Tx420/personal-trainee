import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import { DEFAULT_REMINDERS, dueReminders, liftingTodayContext } from './reminders';

const schedule = PLAN_V1.schedule as Record<string, { kind: string }>;
// plan v1: Mon Push · Tue Pull · Sat Legs (Thu badminton, Wed/Fri rest)
const base = { isoWeekday: 1, todaySession: null, daysSinceInbody: 7, daysSincePhotos: 3, goalDaysLeft: [53] };
const at = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

describe('nhắc bỏ buổi (21:00)', () => {
  it('lifting day context: logged today, misses in a row before today', () => {
    expect(liftingTodayContext(schedule, [], '2026-11-04')).toBeNull(); // Wed rest
    expect(liftingTodayContext(schedule, ['2026-11-02', '2026-10-31'], '2026-11-02')).toEqual({ logged: true, consecutiveMisses: 0 });
    // Tue 03/11: Mon 02/11 missed, Sat 31/10 logged
    expect(liftingTodayContext(schedule, ['2026-10-31'], '2026-11-03')).toEqual({ logged: false, consecutiveMisses: 1 });
    // Tue 10/11: Mon 9, Sat 7, Tue 3 missed; Mon 2 logged → 3
    expect(liftingTodayContext(schedule, ['2026-11-02'], '2026-11-10')).toEqual({ logged: false, consecutiveMisses: 3 });
  });
  it('due at 21:00 only when nothing is logged and fewer than 3 misses in a row', () => {
    const due = (lt: { logged: boolean; consecutiveMisses: number } | null, time = '21:00') =>
      dueReminders(DEFAULT_REMINDERS, { ...base, date: '2026-11-02', minuteOfDay: at(time), liftingToday: lt }).some((r) => r.kind === 'missed_workout');
    expect(due({ logged: false, consecutiveMisses: 0 })).toBe(true);
    expect(due({ logged: true, consecutiveMisses: 0 })).toBe(false);
    expect(due({ logged: false, consecutiveMisses: 3 })).toBe(false);
    expect(due(null)).toBe(false);
    expect(due({ logged: false, consecutiveMisses: 0 }, '20:00')).toBe(false);
  });
  it('never after 22:30, generic text without numbers', () => {
    const late = DEFAULT_REMINDERS.map((s) => (s.kind === 'missed_workout' ? { ...s, time_of_day: '23:00' } : s));
    expect(dueReminders(late, { ...base, date: '2026-11-02', minuteOfDay: at('23:00'), liftingToday: { logged: false, consecutiveMisses: 0 } }).some((r) => r.kind === 'missed_workout')).toBe(false);
    const msg = dueReminders(DEFAULT_REMINDERS, { ...base, date: '2026-11-02', minuteOfDay: at('21:00'), liftingToday: { logged: false, consecutiveMisses: 0 } }).find((r) => r.kind === 'missed_workout');
    expect(msg?.title).toBe('Hôm nay chưa ghi buổi tập');
    expect(JSON.stringify(msg)).not.toMatch(/\d/);
  });
});
