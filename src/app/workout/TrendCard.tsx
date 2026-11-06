import { setTrend, TREND_ICON, type SetTrend } from '@/engine/analytics';
import type { ExerciseRow, SessionItemRow, SetRow } from '@/engine/types';
import { Card, cx } from '@/ui/components';

const TONE: Record<SetTrend, string> = { up: 'text-ok', same: 'text-muted', down: 'text-warn', new: 'text-muted' };

/** "So với lần trước" — one ↑ = ↓ per working set vs the same set last session (§16 B10). */
export function TrendCard({
  items,
  sets,
  byId,
  lastFor,
}: {
  items: SessionItemRow[];
  sets: SetRow[];
  byId: Map<string, ExerciseRow>;
  lastFor: (exerciseId: string) => SetRow[] | null;
}) {
  const rows = items
    .map((it) => {
      const e = byId.get(it.exercise_id);
      const t = setTrend(sets.filter((s) => s.session_item_id === it.id), lastFor(it.exercise_id), !!e?.is_assisted);
      return { it, e, t };
    })
    .filter((r) => r.t.some((x) => x.trend !== 'new'));
  if (rows.length === 0) return null;
  return (
    <Card>
      <div className="mb-1 font-semibold">So với lần trước</div>
      <p className="mb-2 text-xs text-muted">Từng hiệp chính so với đúng hiệp đó buổi trước: ↑ hơn · = bằng · ↓ kém</p>
      <div className="divide-y divide-line" data-testid="set-trends">
        {rows.map(({ it, e, t }) => (
          <div key={it.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 truncate">{e?.name ?? '?'}</span>
            <span className="tabular flex shrink-0 gap-1.5 font-bold" aria-label={t.map((x) => `hiệp ${x.setIndex}: ${x.trend}`).join(', ')}>
              {t.map((x) => (
                <span key={x.setId} className={cx('w-4 text-center', TONE[x.trend])}>{TREND_ICON[x.trend]}</span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
