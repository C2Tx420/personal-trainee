/**
 * Compute due reminders (§6.10). Pure TS with no dependencies — shared by the
 * `send-reminders` Edge Function (Deno) and the app/tests (re-exported from src/engine/reminders.ts).
 *
 * Push content is always generic and NEVER contains health data.
 */

export type ReminderKind =
  | 'workout'
  | 'water'
  | 'weigh_in'
  | 'measurements'
  | 'inbody'
  | 'photos'
  | 'goal'
  | 'weekly_review';

export type ReminderSetting = {
  kind: ReminderKind;
  enabled: boolean;
  time_of_day: string | null; // "HH:MM" or "HH:MM:SS"
  weekdays: number[] | null; // 1 = T2 … 7 = CN
  interval_min: number | null;
  window_start: string | null;
  window_end: string | null;
};

export type ReminderContext = {
  /** Current time in Vietnam time: ISO date + minute of the day. */
  date: string;
  minuteOfDay: number;
  /** 1 = T2 … 7 = CN */
  isoWeekday: number;
  /** Whether there is a scheduled session today (kind + its own reminder time, if any). */
  todaySession: { kind: string; time: string } | null;
  daysSinceInbody: number | null;
  daysSincePhotos: number | null;
  /** Days until each goal that is not yet reached. */
  goalDaysLeft: number[];
};

export type DueReminder = { kind: ReminderKind; title: string; body: string };

export const REMINDER_LABEL: Record<ReminderKind, string> = {
  workout: 'Buổi tập',
  water: 'Uống nước',
  weigh_in: 'Cân hằng tuần',
  measurements: 'Số đo cơ thể',
  inbody: 'Đo InBody',
  photos: 'Chụp ảnh tiến độ',
  goal: 'Sắp tới mốc mục tiêu',
  weekly_review: 'Review tuần với Claude Code',
};

const TEXT: Record<ReminderKind, { title: string; body: string }> = {
  workout: { title: 'Đến giờ tập 💪', body: 'Mở app để bắt đầu buổi tập hôm nay' },
  water: { title: 'Uống nước 💧', body: 'Uống một ly nước nhé' },
  weigh_in: { title: 'Cân tuần 🎯', body: 'Sau vệ sinh, trước khi ăn uống' },
  measurements: { title: 'Số đo tuần 📏', body: 'Nhập số đo cùng lúc với cân (tuỳ chọn)' },
  inbody: { title: 'Đến hạn đo InBody', body: 'Đã 30 ngày từ lần đo gần nhất' },
  photos: { title: 'Chụp ảnh tiến độ 📸', body: 'Đã 14 ngày từ lần chụp gần nhất' },
  goal: { title: 'Còn 7 ngày tới mốc', body: 'Xem tiến độ trong app' },
  weekly_review: { title: 'Review tuần', body: 'Đến giờ review tuần — chạy trên máy tính' },
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Cron window (15 minutes by default): a reminder is due if its time ∈ [now, now + window). */
function inWindow(target: number, now: number, windowMin: number): boolean {
  return target >= now && target < now + windowMin;
}

export function dueReminders(settings: ReminderSetting[], ctx: ReminderContext, windowMin = 15): DueReminder[] {
  const out: DueReminder[] = [];
  for (const s of settings) {
    if (!s.enabled) continue;
    if (s.weekdays && s.weekdays.length > 0 && !s.weekdays.includes(ctx.isoWeekday)) continue;
    const at = s.time_of_day ? toMinutes(s.time_of_day) : null;
    let due = false;
    switch (s.kind) {
      case 'workout':
        due = ctx.todaySession !== null && inWindow(toMinutes(ctx.todaySession.time), ctx.minuteOfDay, windowMin);
        break;
      case 'water': {
        const start = toMinutes(s.window_start ?? '08:00');
        const end = toMinutes(s.window_end ?? '20:00');
        const every = s.interval_min ?? 120;
        for (let t = start; t <= end; t += every) if (inWindow(t, ctx.minuteOfDay, windowMin)) due = true;
        break;
      }
      case 'inbody':
        due = at !== null && inWindow(at, ctx.minuteOfDay, windowMin) && (ctx.daysSinceInbody ?? 999) >= 30;
        break;
      case 'photos':
        due = at !== null && inWindow(at, ctx.minuteOfDay, windowMin) && (ctx.daysSincePhotos ?? 999) >= 14;
        break;
      case 'goal':
        due = at !== null && inWindow(at, ctx.minuteOfDay, windowMin) && ctx.goalDaysLeft.includes(7);
        break;
      default:
        due = at !== null && inWindow(at, ctx.minuteOfDay, windowMin);
    }
    if (due) out.push({ kind: s.kind, ...TEXT[s.kind] });
  }
  return out;
}

/** Default settings (§6.10, settled in v2.4). */
export const DEFAULT_REMINDERS: ReminderSetting[] = [
  { kind: 'workout', enabled: true, time_of_day: null, weekdays: null, interval_min: null, window_start: null, window_end: null },
  { kind: 'water', enabled: true, time_of_day: null, weekdays: null, interval_min: 120, window_start: '08:00', window_end: '20:00' },
  { kind: 'weigh_in', enabled: true, time_of_day: '06:30', weekdays: [1], interval_min: null, window_start: null, window_end: null },
  { kind: 'measurements', enabled: true, time_of_day: '06:35', weekdays: [1], interval_min: null, window_start: null, window_end: null },
  { kind: 'weekly_review', enabled: true, time_of_day: '10:00', weekdays: [1], interval_min: null, window_start: null, window_end: null },
  { kind: 'inbody', enabled: true, time_of_day: '09:00', weekdays: null, interval_min: null, window_start: null, window_end: null },
  { kind: 'photos', enabled: true, time_of_day: '07:00', weekdays: null, interval_min: null, window_start: null, window_end: null },
  { kind: 'goal', enabled: true, time_of_day: '09:00', weekdays: null, interval_min: null, window_start: null, window_end: null },
];

/** Workout reminder time per kind (settled: 17:30 lifting, 17:00 badminton, 10:30 Sunday). */
export function workoutReminderTime(kind: string): string {
  if (kind === 'badminton') return '17:00';
  if (kind === 'optional') return '10:30';
  return '17:30';
}
