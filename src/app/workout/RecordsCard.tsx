import type { PersonalRecord } from '@/engine/progress';
import type { ExerciseRow } from '@/engine/types';
import { Card } from '@/ui/components';
import { fmtKg } from '../shared';

/** "🏆 Kỷ lục mới" — heaviest load ever, or more reps than ever at a load done before. */
export function RecordsCard({ records, byId }: { records: PersonalRecord[]; byId: Map<string, ExerciseRow> }) {
  if (records.length === 0) return null;
  return (
    <Card>
      <div className="mb-1 font-semibold text-ok">🏆 Kỷ lục mới</div>
      {records.map((r) => (
        <div key={r.setId} className="tabular text-sm" data-testid="record">
          {byId.get(r.exerciseId)?.name_vi ?? '?'}: <b>{fmtKg(r.kg)} kg × {r.reps}</b>
          <span className="text-muted">
            {r.kind === 'kg' ? ` · nặng nhất từ trước tới giờ (trước ${fmtKg(r.prevKg)} kg)` : ` · nhiều lần nhất ở mức ${fmtKg(r.kg)} kg (trước ${r.prevReps})`}
          </span>
        </div>
      ))}
    </Card>
  );
}
