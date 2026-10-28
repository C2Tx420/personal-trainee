import { useNavigate } from 'react-router';
import type { MeasurementRow, TrainingData } from '@/data/api';
import { formatVN } from '@/engine/dates';
import { formatNumberVN } from '@/engine/math';
import { bodyChange, strengthChanges } from '@/engine/progress';
import type { ExerciseRow } from '@/engine/types';
import type { WeightLog } from '@/engine/weight';
import { Card, cx, SectionTitle } from '@/ui/components';
import { fmtKg } from '../shared';

const signed = (n: number, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${formatNumberVN(Math.abs(n), digits)}`;

/** "Tiến độ từ 26/10": weekly-average weight, waist, and top-set changes of the lifts done twice or more. */
export function ProgressCard({
  weights,
  measurements,
  training,
  byId,
}: {
  weights: WeightLog[];
  measurements: MeasurementRow[];
  training: TrainingData;
  byId: Map<string, ExerciseRow>;
}) {
  const nav = useNavigate();
  const body = bodyChange(
    weights,
    measurements.map((m) => ({ log_date: m.log_date, waist_navel_cm: typeof m.waist_navel_cm === 'number' ? m.waist_navel_cm : null })),
  );
  const lifts = strengthChanges(training.sessions, training.sets, (id) => byId.get(id)?.canonical_exercise_id ?? id).slice(0, 4);
  const firstSession = training.sessions.filter((s) => s.status === 'completed').map((s) => s.session_date).sort()[0];
  const since = [weights[0]?.log_date, firstSession].filter(Boolean).sort()[0];
  if (!since) return null;

  const row = 'tabular flex items-baseline justify-between gap-3 py-1.5 text-sm';
  return (
    <>
      <SectionTitle>Tiến độ từ {formatVN(since)}</SectionTitle>
      <Card onClick={() => nav('/body')}>
        <div className="divide-y divide-line" data-testid="progress-card">
          <div className={row}>
            <span className="text-muted">Cân (TB tuần)</span>
            {body.weight ? (
              <span>
                {formatNumberVN(body.weight.firstAvg, 1)} → <b>{formatNumberVN(body.weight.lastAvg, 1)} kg</b>{' '}
                <span className={cx(body.weight.delta < 0 ? 'text-ok' : 'text-warn')}>{signed(body.weight.delta)}</span>
              </span>
            ) : (
              <span>
                {body.weightThisWeek !== null && <b>{formatNumberVN(body.weightThisWeek, 1)} kg</b>}
                <span className="text-muted"> · so được từ tuần 2</span>
              </span>
            )}
          </div>
          <div className={row}>
            <span className="text-muted">Vòng eo</span>
            {body.waist ? (
              <span>
                {formatNumberVN(body.waist.first, 1)} → <b>{formatNumberVN(body.waist.last, 1)} cm</b>{' '}
                <span className={cx(body.waist.delta < 0 ? 'text-ok' : 'text-muted')}>{signed(body.waist.delta)}</span>
              </span>
            ) : (
              <span className="text-muted">cần 2 lần đo (2 tuần/lần)</span>
            )}
          </div>
          {lifts.length === 0 ? (
            <div className={row}>
              <span className="text-muted">Sức mạnh</span>
              <span className="text-muted">mỗi bài tập 2 buổi là so được</span>
            </div>
          ) : (
            lifts.map((l) => (
              <div key={l.exerciseId} className={row}>
                <span className="min-w-0 truncate text-muted">{byId.get(l.exerciseId)?.name_vi ?? '?'}</span>
                <span className="shrink-0">
                  {l.first.kg === l.last.kg ? (
                    <>
                      {fmtKg(l.last.kg)} kg: {l.first.reps} → <b>{l.last.reps} lần</b>
                    </>
                  ) : (
                    <>
                      {fmtKg(l.first.kg)} → <b>{fmtKg(l.last.kg)} kg</b>{' '}
                      <span className={cx(l.pct > 0 ? 'text-ok' : 'text-warn')}>{signed(l.pct, 0)}%</span>
                    </>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </>
  );
}
