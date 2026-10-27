import { describe, expect, it } from 'vitest';
import { expandSets, parseQuickLog, suggestWarmup } from './quick-log-parser';

// The exact message the user sent on 27/10/2026 about the previous day's Push session (§5.4)
const MONDAY = `hôm qua anh tập push full máy

đẩy ngực
2 set x 12 20kg
3 set x 12 27kg

đẩy vai
3 set x 8 20kg

tay sau
3 set x 12 số kg a quên r

fly chest
3 set x 12 số kg anh cũng quên

warm up bằng 10p đi bộ tốc độ 3.5-5`;

describe('quick-log-parser', () => {
  const r = parseQuickLog(MONDAY, '2026-10-27');

  it('ngày + loại buổi', () => {
    expect(r.date).toBe('2026-10-26');
    expect(r.kind).toBe('push');
  });
  it('4 bài đúng thứ tự, đúng hiệp và kg', () => {
    expect(r.exercises.map((e) => e.name)).toEqual(['đẩy ngực', 'đẩy vai', 'tay sau', 'fly chest']);
    expect(r.exercises[0].sets).toEqual([
      { count: 2, reps: 12, seconds: null, kg: 20, warmup: false },
      { count: 3, reps: 12, seconds: null, kg: 27, warmup: false },
    ]);
    expect(expandSets(r.exercises[1])).toHaveLength(3);
    expect(r.exercises[2].sets[0]).toMatchObject({ count: 3, reps: 12, kg: null });
    expect(r.exercises[3].sets[0].kg).toBeNull();
  });
  it('khởi động 10 phút 3,5–5 km/h (dòng cuối vẫn nhận ra)', () => {
    expect(r.warmup).toMatchObject({ minutes: 10, speedMin: 3.5, speedMax: 5 });
  });
  it('2 hiệp nhẹ đầu + 3 hiệp nặng → gợi ý làm nóng', () => {
    expect(suggestWarmup(r.exercises[0])).toBe(true);
    expect(suggestWarmup(r.exercises[1])).toBe(false);
  });
  it('dòng "24/10 legs" → ngày + loại buổi, không thành tên bài', () => {
    const x = parseQuickLog('24/10 legs\nđạp đùi\n3x12x40', '2026-10-27');
    expect(x.date).toBe('2026-10-24');
    expect(x.kind).toBe('legs');
    expect(x.exercises.map((e) => e.name)).toEqual(['đạp đùi']);
  });
  it('các mẫu khác: 3x12x27, 45s, "w", 22,5kg', () => {
    const x = parseQuickLog('pull\nmáy kéo xô\nw 1x10 25kg\n3x10x35\nplank\n3 x 45s\ncurl\n3 hiệp 12 lần 22,5 kg', '2026-10-27');
    expect(x.kind).toBe('pull');
    expect(x.exercises[0].sets).toEqual([
      { count: 1, reps: 10, seconds: null, kg: 25, warmup: true },
      { count: 3, reps: 10, seconds: null, kg: 35, warmup: false },
    ]);
    expect(x.exercises[1].sets[0]).toMatchObject({ count: 3, seconds: 45 });
    expect(x.exercises[2].sets[0]).toMatchObject({ count: 3, reps: 12, kg: 22.5 });
  });
});
