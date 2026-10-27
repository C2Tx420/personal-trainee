/**
 * Tính nhắc nhở đến hạn (§6.10). TS thuần, không phụ thuộc gì — dùng chung cho
 * Edge Function `send-reminders` (Deno) và app/test (re-export ở src/engine/reminders.ts).
 *
 * Nội dung push luôn chung chung, KHÔNG chứa số liệu sức khỏe.
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
  time_of_day: string | null; // "HH:MM" hoặc "HH:MM:SS"
  weekdays: number[] | null; // 1 = T2 … 7 = CN
  interval_min: number | null;
  window_start: string | null;
  window_end: string | null;
};

export type ReminderContext = {
  /** Thời điểm hiện tại theo giờ VN: ngày ISO + phút trong ngày. */
  date: string;
  minuteOfDay: number;
  /** 1 = T2 … 7 = CN */
  isoWeekday: number;
  /** Có buổi tập theo lịch hôm nay không (kind + giờ nhắc riêng nếu có). */
  todaySession: { kind: string; time: string } | null;
  daysSinceInbody: number | null;
  daysSincePhotos: number | null;
  /** Số ngày tới các mốc goal chưa đạt. */
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

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Cửa sổ chạy cron (mặc định 15 phút): nhắc đến hạn nếu giờ hẹn ∈ [now, now + window). */
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

/** Cài đặt mặc định (§6.10, chốt ở v2.4). */
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

/** Giờ nhắc buổi tập theo loại (chốt: 17:30 tạ, 17:00 cầu lông, 10:30 CN). */
export function workoutReminderTime(kind: string): string {
  if (kind === 'badminton') return '17:00';
  if (kind === 'optional') return '10:30';
  return '17:30';
}
