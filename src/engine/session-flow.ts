import type { SessionItemRow, SessionRow, SetRow } from './types';
import { plannedSets, type PlannedSet } from './warmup';

/**
 * Máy trạng thái của luồng tập "▶ Bắt đầu buổi tập".
 *
 * Không lưu trạng thái riêng: bước hiện tại luôn được **tính lại từ dữ liệu DB**
 * (buổi, các bài trong buổi, các hiệp đã ghi). Nhờ vậy thoát app / hết pin rồi
 * mở lại vẫn quay về đúng bài, đúng hiệp.
 */

export type FlowItem = {
  item: SessionItemRow;
  loadStepKg: number;
  /** kg hiệp chính lần trước — dùng tính tạ làm nóng khi chưa có target_kg. */
  fallbackWorkingKg: number | null;
};

export type FlowStep =
  | { type: 'warmup' }
  | { type: 'intro'; item: SessionItemRow; order: number; total: number }
  | {
      type: 'set';
      item: SessionItemRow;
      planned: PlannedSet;
      order: number;
      total: number;
      workingTotal: number;
    }
  | { type: 'summary' };

/** Thứ tự tập: bài chưa "để sau" theo vị trí, rồi bài "để sau" theo vị trí. */
export function orderedItems<T extends { item: SessionItemRow }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => Number(a.item.deferred) - Number(b.item.deferred) || a.item.position - b.item.position,
  );
}

export function plannedFor(fi: FlowItem): PlannedSet[] {
  return plannedSets(fi.item.target, fi.loadStepKg, fi.fallbackWorkingKg);
}

function isDone(p: PlannedSet, sets: SetRow[], itemId: string): boolean {
  return sets.some(
    (s) => s.session_item_id === itemId && s.set_type === p.setType && s.set_index === p.index && s.completed,
  );
}

/** Các hiệp dự kiến chưa xong của một bài. */
export function remainingSets(fi: FlowItem, sets: SetRow[]): PlannedSet[] {
  return plannedFor(fi).filter((p) => !isDone(p, sets, fi.item.id));
}

export function nextStep(session: Pick<SessionRow, 'warmup' | 'is_backfill'>, items: FlowItem[], sets: SetRow[]): FlowStep {
  if (!session.is_backfill && session.warmup === null) return { type: 'warmup' };
  const ordered = orderedItems(items).filter((fi) => fi.item.status !== 'skipped');
  const total = ordered.length;
  for (const [i, fi] of ordered.entries()) {
    if (fi.item.status === 'done' || fi.item.status === 'partial') continue;
    const remaining = remainingSets(fi, sets);
    if (remaining.length === 0) continue;
    if (fi.item.status === 'pending') return { type: 'intro', item: fi.item, order: i + 1, total };
    return {
      type: 'set',
      item: fi.item,
      planned: remaining[0],
      order: i + 1,
      total,
      workingTotal: fi.item.target.sets,
    };
  }
  return { type: 'summary' };
}

/** Bài đã xong hết hiệp nhưng status chưa cập nhật → cần đánh dấu done. */
export function itemsToMarkDone(items: FlowItem[], sets: SetRow[]): string[] {
  return items
    .filter((fi) => fi.item.status === 'in_progress' && remainingSets(fi, sets).length === 0)
    .map((fi) => fi.item.id);
}

export type ItemBadge = 'done' | 'current' | 'pending' | 'skipped' | 'substituted' | 'deferred';

export function itemBadge(item: SessionItemRow, current: SessionItemRow | null): ItemBadge {
  if (item.status === 'skipped') return 'skipped';
  if (item.status === 'done' || item.status === 'partial') return item.substitution_reason ? 'substituted' : 'done';
  if (current?.id === item.id) return 'current';
  if (item.deferred) return 'deferred';
  if (item.substitution_reason) return 'substituted';
  return 'pending';
}

export function flowProgress(items: FlowItem[], sets: SetRow[]): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const fi of items) {
    if (fi.item.status === 'skipped') continue;
    const planned = plannedFor(fi).filter((p) => p.setType === 'working');
    total += planned.length;
    done += planned.filter((p) => isDone(p, sets, fi.item.id)).length;
  }
  return { done, total };
}
