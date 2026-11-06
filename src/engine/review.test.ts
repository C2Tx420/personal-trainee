import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import type { Goal } from './goals';
import { rejectedSummary, sessionChanges } from './plan-diff';
import { parsePlanContent } from './plan-schema';
import { planLabels, planWeek } from './plan-week';
import { canReflect, missingReflection, reflectionLocked, reviewedWeeks } from './reflection';
import { inlineBold, parseReviewNote } from './review-note';

const goal = (name: string, target_date: string, ordinal: number): Goal => ({
  id: name, name, ordinal, target_date, target_weight_min: 70, target_weight_max: 77,
  target_body_fat_min: null, target_body_fat_max: null, status: 'pending', achieved_at: null,
});
const GOALS = [goal('Noel', '2026-12-25', 1), goal('Tết', '2027-02-06', 2), goal('Hè', '2027-06-30', 3)];

describe('tuần lộ trình theo mục tiêu', () => {
  it('đếm tuần từ ngày bắt đầu, reset ở mỗi mục tiêu', () => {
    expect(planWeek('2026-10-27', GOALS, '2026-10-27')).toMatchObject({ goalName: 'Noel', week: 1, totalWeeks: 9, start: '2026-10-26' });
    expect(planWeek('2026-11-02', GOALS, '2026-10-27')).toMatchObject({ goalName: 'Noel', week: 2 });
    expect(planWeek('2026-12-25', GOALS, '2026-10-27')).toMatchObject({ goalName: 'Noel', week: 9 });
    expect(planWeek('2026-12-28', GOALS, '2026-10-27')).toMatchObject({ goalName: 'Tết', week: 1, totalWeeks: 6 });
    expect(planWeek('2027-02-08', GOALS, '2026-10-27')).toMatchObject({ goalName: 'Hè', week: 1, totalWeeks: 21 });
    expect(planWeek('2027-07-05', GOALS, '2026-10-27')).toMatchObject({ goalName: null, week: 1, totalWeeks: null });
  });
  it('nhiều bản trong cùng tuần → "bản 2"; bản nháp lấy theo ngày tạo', () => {
    const labels = planLabels(
      [
        { id: 'a', version_no: 1, effective_from: '2026-10-27', created_at: '2026-10-27T03:00:00Z' },
        { id: 'b', version_no: 2, effective_from: null, created_at: '2026-11-01T16:00:00Z' }, // 23:00 CN giờ VN
        { id: 'c', version_no: 3, effective_from: null, created_at: '2026-11-02T03:00:00Z' },
      ],
      GOALS,
    );
    expect(labels.get('a')?.title).toBe('Tuần 1 · bản 1');
    expect(labels.get('b')?.title).toBe('Tuần 1 · bản 2');
    expect(labels.get('c')?.title).toBe('Tuần 2');
    expect(labels.get('c')?.sub).toBe('Noel · tuần 2/9 · 02/11–08/11');
  });
});

describe('nhận xét coach', () => {
  it('tách tóm tắt, mục, gạch đầu dòng và dấu ✓/⚠', () => {
    const r = parseReviewNote(
      'Tuần đầu ổn, đủ 4/4 buổi.\n\n**Cân**: 80,0 kg · Noel cần −0,39 kg/tuần.\n**Tập luyện**:\n- ✓ kéo xô 35kg đủ 3×10\n- ⚠ kéo cáp ngồi hụt\n**Cần anh trả lời**:\n- Máy nào?',
    );
    expect(r.summary).toEqual(['Tuần đầu ổn, đủ 4/4 buổi.']);
    expect(r.sections.map((s) => s.key)).toEqual(['weight', 'training', 'questions']);
    expect(r.sections[0].lines[0]).toEqual({ kind: 'text', text: '80,0 kg · Noel cần −0,39 kg/tuần.' });
    expect(r.sections[1].lines.map((l) => l.tone)).toEqual(['good', 'warn']);
  });
  it('note kiểu cũ (**Tiến độ cân**: …) và chữ đậm giữa câu', () => {
    const r = parseReviewNote('**Tiến độ cân**: 81,2 kg\n**Đề xuất**: draft — **Smith squat** thay hack squat');
    expect(r.summary).toEqual([]);
    expect(r.sections.map((s) => s.key)).toEqual(['weight', 'proposal']);
    expect(inlineBold(r.sections[1].lines[0].text)).toEqual([
      { text: 'draft — ', bold: false }, { text: 'Smith squat', bold: true }, { text: ' thay hack squat', bold: false },
    ]);
  });
});

describe('thay đổi theo buổi', () => {
  const a = parsePlanContent(PLAN_V1);
  it('gắn nhãn bài mới / thay / giữ + hướng tăng giảm tạ', () => {
    const b = structuredClone(a);
    const pull = b.templates[1].items;
    pull[0].exercise = 'assisted_pull_up';
    pull[1].target_kg = 35;
    pull[2].target_kg = 25;
    pull.push({ ...pull[4], exercise: 'reverse_pec_deck', coach_note: 'Mới' });
    const v = sessionChanges(a, b, (s) => s).find((s) => s.key === 'pull')!;
    expect(v.changed).toBe(true);
    expect(v.items.map((i) => i.status)).toEqual(['replaced', 'kept', 'kept', 'kept', 'kept', 'new']);
    expect(v.items[0].from).toBe('lat_pulldown');
    expect(v.items[1].changes[0]).toEqual({ kind: 'target_kg', text: '30 kg → 35 kg', dir: 'up' });
    expect(v.items[2].changes[0].dir).toBe('down');
    expect(sessionChanges(a, a, (s) => s).every((s) => !s.changed)).toBe(true);
  });
});

describe('cảm nhận sau buổi', () => {
  const reviewed = reviewedWeeks([{ week_start: '2026-10-26' }]);
  it('khoá cả tuần đã review (T2–CN), tuần chưa review vẫn ghi bù được', () => {
    expect(reflectionLocked('2026-10-26', reviewed)).toBe(true);
    expect(reflectionLocked('2026-11-01', reviewed)).toBe(true);
    expect(reflectionLocked('2026-11-02', reviewed)).toBe(false);
    expect(canReflect({ status: 'completed', session_date: '2026-10-31' }, reviewed)).toBe(false);
    expect(canReflect({ status: 'completed', session_date: '2026-11-03' }, reviewed)).toBe(true);
  });
  it('chỉ buổi đã xong; nhắc khi chưa ghi', () => {
    expect(canReflect({ status: 'skipped', session_date: '2026-11-03' }, reviewed)).toBe(false);
    expect(canReflect({ status: 'in_progress', session_date: '2026-11-03' }, reviewed)).toBe(false);
    expect(missingReflection({ status: 'completed', session_date: '2026-11-03', reflection: '  ' }, reviewed)).toBe(true);
    expect(missingReflection({ status: 'completed', session_date: '2026-11-03', reflection: 'Khoẻ' }, reviewed)).toBe(false);
    expect(missingReflection({ status: 'completed', session_date: '2026-10-28', reflection: null }, reviewed)).toBe(false);
  });
});

describe('rejectedSummary (coach report)', () => {
  it('lists what a rejected draft changed vs its base', () => {
    const base = { id: 'a', version_no: 1, status: 'active', change_note: '', content: PLAN_V1, based_on_version_id: null };
    const draft = structuredClone(PLAN_V1);
    draft.nutrition.calories_kcal = 1800;
    const rej = { id: 'b', version_no: 2, status: 'rejected', change_note: 'giảm calo', rejected_reason: 'chưa muốn', content: draft, based_on_version_id: 'a' };
    const out = rejectedSummary([base, rej], (s) => s);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ version_no: 2, rejected_reason: 'chưa muốn' });
    expect(out[0].changes?.some((c) => c.includes('1800'))).toBe(true);
    expect(rejectedSummary([{ ...rej, based_on_version_id: null }], (s) => s)[0].changes).toBeNull();
  });
});
