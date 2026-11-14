import { averageMuscleSets, MUSCLE_SETS_BAND, weeklyMuscleSets } from '@/engine/analytics';
import { addDays, type IsoDate } from '@/engine/dates';
import { formatNumberVN } from '@/engine/math';
import { t } from '@/i18n';
import type { ExerciseRow, SessionRow, SetRow } from '@/engine/types';
import { Card, cx } from '@/ui/components';
import { MUSCLE_LABEL } from '../exercises/labels';

const SCALE = 25; // bar full width = 25 sets

/** "Hiệp theo nhóm cơ" — this week's working sets per muscle vs the 10–20 reference band (§16 B4). */
export function MuscleSetsCard({ weekStart, sessions, sets, byId }: { weekStart: IsoDate; sessions: SessionRow[]; sets: SetRow[]; byId: Map<string, ExerciseRow> }) {
  const week = weeklyMuscleSets(weekStart, sessions, sets, byId);
  const avg = averageMuscleSets([1, 2, 3, 4].map((i) => weeklyMuscleSets(addDays(weekStart, -7 * i), sessions, sets, byId)));
  const muscles = [...new Set([...Object.keys(week), ...Object.keys(avg)])].sort((a, b) => (week[b] ?? 0) - (week[a] ?? 0) || (avg[b] ?? 0) - (avg[a] ?? 0));
  if (muscles.length === 0) return null;
  const pct = (v: number) => `${Math.min(100, (v / SCALE) * 100)}%`;
  return (
    <Card>
      <div className="mb-1 font-semibold">{t('Hiệp theo nhóm cơ')}</div>
      <p className="mb-3 text-xs text-muted">
        {t('Tuần này · nhóm chính 1 hiệp, nhóm phụ 0,5 · vùng xanh {low}–{high} hiệp/tuần là tham khảo · số nhỏ = TB 4 tuần trước', { low: MUSCLE_SETS_BAND.low, high: MUSCLE_SETS_BAND.high })}
      </p>
      <div className="grid gap-2" data-testid="muscle-sets">
        {muscles.map((m) => {
          const v = week[m] ?? 0;
          return (
            <div key={m} className="tabular grid grid-cols-[5.5rem_1fr_3.5rem] items-center gap-2 text-sm">
              <span className="truncate text-muted">{MUSCLE_LABEL[m] ?? m}</span>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="absolute inset-y-0 bg-ok/15" style={{ left: pct(MUSCLE_SETS_BAND.low), width: `${((MUSCLE_SETS_BAND.high - MUSCLE_SETS_BAND.low) / SCALE) * 100}%` }} />
                <div className={cx('absolute inset-y-0 left-0 rounded-full', v >= MUSCLE_SETS_BAND.low && v <= MUSCLE_SETS_BAND.high ? 'bg-ok' : 'bg-accent')} style={{ width: pct(v) }} />
              </div>
              <span className="text-right">
                <b>{formatNumberVN(v, 1)}</b>
                {avg[m] !== undefined && <span className="ml-1 text-xs text-muted">{formatNumberVN(avg[m], 1)}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
