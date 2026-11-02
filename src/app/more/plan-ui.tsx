import { useMemo } from 'react';
import type { PlanVersion } from '@/data/api';
import { useGoals, usePlans } from '@/data/queries';
import { type PlanLabel, planLabels, programStartOf, reviewWeekLabel } from '@/engine/plan-week';
import { inlineBold, type ReviewLine } from '@/engine/review-note';
import { Badge, cx } from '@/ui/components';

const STATUS_LABEL: Record<PlanVersion['status'], string> = {
  draft: 'Chờ duyệt',
  scheduled: 'Hẹn ngày',
  active: 'Đang dùng',
  archived: 'Lưu trữ',
  rejected: 'Từ chối',
};

export const CREATED_BY_LABEL: Record<PlanVersion['created_by'], string> = {
  user: 'Anh',
  claude_code: 'Claude Code',
  system: 'Tự động (cân đứng)',
};

export function StatusBadge({ status }: { status: PlanVersion['status'] }) {
  const tone = { draft: 'accent', scheduled: 'info', active: 'ok', archived: 'muted', rejected: 'bad' } as const;
  return <Badge tone={tone[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** Plans are named by training week ("Tuần 2 · Noel"), restarting at every goal — not by version number. */
export function usePlanLabels() {
  const plans = usePlans();
  const goals = useGoals();
  return useMemo(() => {
    const list = plans.data ?? [];
    const g = goals.data ?? [];
    const labels = planLabels(list, g);
    const start = programStartOf(list);
    const label = (id: string | null | undefined): PlanLabel | undefined => (id ? labels.get(id) : undefined);
    const review = (weekStart: string): PlanLabel | null => (start ? reviewWeekLabel(weekStart, g, start) : null);
    return { label, review, loading: plans.isLoading || goals.isLoading };
  }, [plans.data, plans.isLoading, goals.data, goals.isLoading]);
}

/** Text with **bold** spans. */
export function RichText({ text }: { text: string }) {
  return (
    <>
      {inlineBold(text).map((p, i) => (p.bold ? <b key={i} className="font-semibold text-fg">{p.text}</b> : <span key={i}>{p.text}</span>))}
    </>
  );
}

/** Lines of a coach note: paragraphs, bullets, ✓ / ⚠ marks. */
export function NoteLines({ lines }: { lines: ReviewLine[] }) {
  return (
    <div className="space-y-1">
      {lines.map((l, i) =>
        l.kind === 'bullet' || l.tone ? (
          <div key={i} className="flex gap-2">
            <span
              aria-hidden
              className={cx(
                'mt-[7px] size-1.5 shrink-0 rounded-full',
                l.tone === 'good' ? 'bg-ok' : l.tone === 'warn' ? 'bg-warn' : 'bg-muted/60',
              )}
            />
            <span className="min-w-0 flex-1"><RichText text={l.text} /></span>
          </div>
        ) : (
          <p key={i}><RichText text={l.text} /></p>
        ),
      )}
    </div>
  );
}

/** Coach's free text (change_note): split "- " lines / "; " clauses into a list. */
export function noteToLines(text: string): ReviewLine[] {
  const raw = text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const parts = raw.length > 1 ? raw : text.split(/;\s+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [{ kind: 'text', text: text.trim() }];
  return parts.map((t) => ({ kind: 'bullet', text: t.replace(/^[-*•]\s+/, '').replace(/\.$/, '') }));
}
