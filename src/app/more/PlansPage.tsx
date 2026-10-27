import { useNavigate } from 'react-router';
import { usePlans } from '@/data/queries';
import { formatVN } from '@/engine/dates';
import { formatNumberVN } from '@/engine/math';
import { Card, Page, Skeleton } from '@/ui/components';
import { CREATED_BY_LABEL, StatusBadge } from './plan-ui';

export function PlansPage() {
  const nav = useNavigate();
  const plans = usePlans();
  if (plans.isLoading) return <Page title="Lộ trình" back="/more"><Skeleton /></Page>;
  return (
    <Page title="Lịch sử lộ trình" back="/more">
      {(plans.data ?? []).map((p) => (
        <Card key={p.id} onClick={() => nav(`/more/plans/${p.id}`)}>
          <div className="mb-1 flex items-center justify-between">
            <div className="text-lg font-bold">v{p.version_no}</div>
            <StatusBadge status={p.status} />
          </div>
          <div className="text-sm text-muted">
            {CREATED_BY_LABEL[p.created_by]} · tạo {formatVN(p.created_at.slice(0, 10), true)}
            {p.effective_from && ` · hiệu lực ${formatVN(p.effective_from, true)}`} · {formatNumberVN(p.calories_kcal)} kcal
          </div>
          {p.change_note && <div className="mt-1 line-clamp-2 text-sm">{p.change_note}</div>}
        </Card>
      ))}
    </Page>
  );
}
