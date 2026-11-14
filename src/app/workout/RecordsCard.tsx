import type { PersonalRecord } from '@/engine/progress';
import type { ExerciseRow } from '@/engine/types';
import { t } from '@/i18n';
import { Card } from '@/ui/components';
import { fmtKg } from '../shared';

/** "🏆 Kỷ lục mới" — hardest load ever (least assistance on assisted machines), or more reps than ever at a load done before. */
export function RecordsCard({ records, byId }: { records: PersonalRecord[]; byId: Map<string, ExerciseRow> }) {
  if (records.length === 0) return null;
  return (
    <Card>
      <div className="mb-1 font-semibold text-ok">{t('🏆 Kỷ lục mới')}</div>
      {records.map((r) => (
        <div key={r.setId} className="tabular text-sm" data-testid="record">
          {byId.get(r.exerciseId)?.name ?? '?'}: <b>{fmtKg(r.kg)} kg × {r.reps}</b>
          <span className="text-muted">
            {r.kind === 'kg'
              ? byId.get(r.exerciseId)?.is_assisted
                ? ` · ${t('ít trợ lực nhất từ trước tới giờ (trước {kg} kg)', { kg: fmtKg(r.prevKg) })}`
                : ` · ${t('nặng nhất từ trước tới giờ (trước {kg} kg)', { kg: fmtKg(r.prevKg) })}`
              : ` · ${t('nhiều lần nhất ở mức {kg} kg (trước {reps})', { kg: fmtKg(r.kg), reps: r.prevReps ?? '' })}`}
          </span>
        </div>
      ))}
    </Card>
  );
}
