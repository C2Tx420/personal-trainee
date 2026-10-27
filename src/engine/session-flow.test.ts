import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import { parsePlanContent } from './plan-schema';
import { flowProgress, type FlowItem, itemsToMarkDone, nextStep } from './session-flow';
import type { SessionItemRow, SetRow } from './types';

const pull = parsePlanContent(PLAN_V1).templates.find((t) => t.key === 'pull')!;
const mkItem = (pos: number, o: Partial<SessionItemRow> = {}): SessionItemRow => ({
  id: `i${pos}`, session_id: 's', position: pos, template_item_position: pos, planned_exercise_id: `e${pos}`,
  exercise_id: `e${pos}`, status: 'pending', substitution_reason: null, substitution_note: null, skip_reason: null,
  deferred: false, target: pull.items[pos], note: null, started_at: null, finished_at: null, ...o,
});
const fi = (item: SessionItemRow): FlowItem => ({ item, loadStepKg: 5, fallbackWorkingKg: null });
const done = (itemId: string, setType: 'warmup' | 'working', idx: number, o: Partial<SetRow> = {}): SetRow => ({
  id: `${itemId}${setType}${idx}`, session_id: 's', session_item_id: itemId, exercise_id: 'x', set_index: idx, set_type: setType,
  target_kg: null, target_rep_min: null, target_rep_max: null, reps: 10, weight_kg: 30, seconds: null, kg_change_reason: null,
  kg_change_note: null, feel: null, note: null, completed: true, completed_at: null, ...o,
});
const session = { warmup: { cardio: null, mobility_done: true }, is_backfill: false };

describe('session-flow', () => {
  it('chưa khởi động → bước khởi động', () => {
    expect(nextStep({ warmup: null, is_backfill: false }, [fi(mkItem(0))], []).type).toBe('warmup');
  });
  it('bài chưa bắt đầu → màn giới thiệu; đang tập → hiệp làm nóng 1 trước', () => {
    expect(nextStep(session, [fi(mkItem(0))], [])).toMatchObject({ type: 'intro', order: 1, total: 1 });
    const s = nextStep(session, [fi(mkItem(0, { status: 'in_progress' }))], []);
    expect(s).toMatchObject({ type: 'set', planned: { setType: 'warmup', index: 1, targetKg: 25 } });
  });
  it('sau 2 làm nóng + 1 hiệp chính → hiệp chính 2', () => {
    const it0 = mkItem(0, { status: 'in_progress' });
    const s = nextStep(session, [fi(it0)], [done('i0', 'warmup', 1), done('i0', 'warmup', 2), done('i0', 'working', 1)]);
    expect(s).toMatchObject({ type: 'set', planned: { setType: 'working', index: 2 } });
  });
  it('xong hết hiệp → cần đánh dấu done, chuyển bài tiếp', () => {
    const it0 = mkItem(0, { status: 'in_progress' });
    const sets = [done('i0', 'warmup', 1), done('i0', 'warmup', 2), done('i0', 'working', 1), done('i0', 'working', 2), done('i0', 'working', 3)];
    expect(itemsToMarkDone([fi(it0)], sets)).toEqual(['i0']);
    const s = nextStep(session, [fi({ ...it0, status: 'done' }), fi(mkItem(1))], sets);
    expect(s).toMatchObject({ type: 'intro', order: 2 });
  });
  it('"Để sau" đưa bài xuống cuối; "Bỏ bài" bị loại khỏi luồng', () => {
    const items = [fi(mkItem(0, { deferred: true })), fi(mkItem(1)), fi(mkItem(2, { status: 'skipped' }))];
    const s = nextStep(session, items, []);
    expect(s).toMatchObject({ type: 'intro', item: { id: 'i1' }, order: 1, total: 2 });
  });
  it('tiếp tục từ dữ liệu DB: đúng bài, đúng hiệp; hết bài → tổng kết', () => {
    const items = [fi(mkItem(0, { status: 'done' })), fi(mkItem(1, { status: 'in_progress' }))];
    const sets = [done('i1', 'warmup', 1), done('i1', 'warmup', 2)];
    expect(nextStep(session, items, sets)).toMatchObject({ type: 'set', item: { id: 'i1' }, planned: { setType: 'working', index: 1 } });
    expect(nextStep(session, [fi(mkItem(0, { status: 'done' }))], [])).toEqual({ type: 'summary' });
  });
  it('tiến độ chỉ đếm hiệp chính, bỏ bài bị bỏ qua', () => {
    const items = [fi(mkItem(0, { status: 'in_progress' })), fi(mkItem(1, { status: 'skipped' }))];
    expect(flowProgress(items, [done('i0', 'warmup', 1), done('i0', 'working', 1)])).toEqual({ done: 1, total: 3 });
  });
});
