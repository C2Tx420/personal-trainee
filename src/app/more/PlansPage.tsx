import { useNavigate } from 'react-router';
import { usePlans } from '@/data/queries';
import { addDays, formatVN } from '@/engine/dates';
import { formatNumberVN } from '@/engine/math';
import { Card, Page, SectionTitle, Skeleton } from '@/ui/components';
import { CREATED_BY_LABEL, StatusBadge, usePlanLabels } from './plan-ui';

/** Plan history, grouped by goal phase; each plan is named by its week. */
export function PlansPage() {
  const nav = useNavigate();
  const plans = usePlans();
  const labels = usePlanLabels();
  if (plans.isLoading || labels.loading) return <Page title="Lộ trình" back="/more"><Skeleton /></Page>;

  const groups: { phase: string; items: NonNullable<typeof plans.data> }[] = [];
  for (const p of plans.data ?? []) {
    const l = labels.label(p.id);
    const phase = l?.goalName ? `Giai đoạn ${l.goalName} · ${l.totalWeeks} tuần` : 'Sau các mục tiêu';
    const g = groups.at(-1);
    if (g?.phase === phase) g.items.push(p);
    else groups.push({ phase, items: [p] });
  }

  return (
    <Page title="Lộ trình theo tuần" back="/more">
      <p className="mb-1 px-1 text-xs text-muted">Mỗi mục tiêu là một giai đoạn, tuần đếm lại từ 1. Tuần nào coach không đổi gì thì vẫn dùng lộ trình tuần trước.</p>
      {groups.map((g) => (
        <div key={g.phase}>
          <SectionTitle>{g.phase}</SectionTitle>
          {g.items.map((p) => {
            const l = labels.label(p.id);
            return (
              <Card key={p.id} onClick={() => nav(`/more/plans/${p.id}`)}>
                <div className="mb-0.5 flex items-center justify-between gap-2">
                  <div className="text-lg font-bold">{l?.title ?? 'Lộ trình'}</div>
                  <StatusBadge status={p.status} />
                </div>
                <div className="text-sm text-muted">
                  {l && `${formatVN(l.start)}–${formatVN(addDays(l.start, 6))} · `}
                  {CREATED_BY_LABEL[p.created_by]}
                  {p.effective_from && ` · từ ${formatVN(p.effective_from)}`} · {formatNumberVN(p.calories_kcal)} kcal
                </div>
                {p.change_note && <div className="mt-1 line-clamp-2 text-sm">{p.change_note}</div>}
              </Card>
            );
          })}
        </div>
      ))}
    </Page>
  );
}

