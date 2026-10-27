import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useActivePlan, useExerciseMaps, useTraining, useWeights } from '@/data/queries';
import { addDays, formatVN, todayVN, WEEKDAY_LABEL, weekdayOf, weekStart } from '@/engine/dates';
import { formatNumberVN } from '@/engine/math';
import { SESSION_KIND_LABEL } from '@/engine/schedule';
import { topSetSeries, volumeKg, weeklyVolumeByExercise, weekSummary } from '@/engine/workout-summary';
import { SimpleBars, SimpleLine } from '@/ui/charts';
import { Badge, Button, Card, Empty, ErrorBox, Page, ProgressBar, SectionTitle, Segmented, Skeleton, Stat } from '@/ui/components';

export function TrainingPage() {
  const nav = useNavigate();
  const training = useTraining();
  const plan = useActivePlan();
  const weights = useWeights();
  const ex = useExerciseMaps();
  const today = todayVN();
  const [weeks, setWeeks] = useState<'4' | '8'>('4');
  const [exId, setExId] = useState<string>('');

  const data = training.data;
  const trainedExercises = useMemo(() => {
    const ids = new Set((data?.sets ?? []).filter((s) => s.set_type === 'working' && s.weight_kg !== null).map((s) => s.exercise_id));
    return [...ids].map((i) => ex.byId.get(i)).filter(Boolean).sort((a, b) => a!.name_vi.localeCompare(b!.name_vi));
  }, [data, ex.byId]);

  if (training.isLoading || plan.isLoading) return <Page title="Tập"><Skeleton /></Page>;
  if (training.error) return <Page title="Tập"><ErrorBox error={training.error} /></Page>;
  const sessions = data?.sessions ?? [];
  const content = plan.data?.content;
  const ws = weekStart(today);
  const week = content && data ? weekSummary(ws, sessions, data.items, data.sets, content, weights.data?.at(-1)?.weight_kg ?? 81.7) : null;

  const selected = exId || trainedExercises[0]?.id || '';
  const group = new Set([selected, ...ex.list.filter((e) => e.canonical_exercise_id === selected).map((e) => e.id)]);
  const weekStarts = Array.from({ length: Number(weeks) }, (_, i) => addDays(ws, -7 * (Number(weeks) - 1 - i)));
  const vol = data ? weeklyVolumeByExercise(group, sessions, data.sets, weekStarts).map((v) => ({ label: formatVN(v.week), volume: v.volume })) : [];
  const top = data
    ? topSetSeries(group, sessions.filter((s) => s.session_date >= weekStarts[0]), data.sets).map((t) => ({ label: formatVN(t.date), top: t.topKg, target: t.targetKg }))
    : [];

  return (
    <Page title="Tập">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button onClick={() => nav('/training/backfill')}>+ Ghi bù</Button>
        <Button onClick={() => nav('/training/quick')}>Ghi nhanh</Button>
      </div>

      {week && (
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <div className="font-semibold">Tuần {formatVN(ws)} – {formatVN(addDays(ws, 6))}</div>
            <Badge tone={week.doneSessions >= week.plannedSessions ? 'ok' : 'muted'}>
              {week.doneSessions}/{week.plannedSessions} buổi
            </Badge>
          </div>
          <ProgressBar value={week.doneSessions} max={week.plannedSessions} tone="ok" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Hoàn thành hiệp" value={week.setCompletionPct === null ? '—' : `${week.setCompletionPct}%`} />
            <Stat label="Cầu lông" value={`${week.badmintonSessions} buổi`} />
            <Stat label="Có khởi động" value={`${week.sessionsWithWarmup}/${week.strengthSessions}`} />
            <Stat label="Calo tập ước tính" value={`${formatNumberVN(week.estKcal)} kcal`} sub="tham khảo, không ăn bù" />
          </div>
        </Card>
      )}

      <SectionTitle>Biểu đồ theo bài</SectionTitle>
      <Card>
        {trainedExercises.length === 0 ? (
          <Empty>Chưa có dữ liệu tạ</Empty>
        ) : (
          <>
            <select aria-label="Chọn bài" className="mb-3 h-11 w-full rounded-xl border border-line bg-card px-3" value={selected} onChange={(e) => setExId(e.target.value)}>
              {trainedExercises.map((e) => (
                <option key={e!.id} value={e!.id}>{e!.name_vi}</option>
              ))}
            </select>
            <Segmented value={weeks} onChange={setWeeks} options={[{ value: '4', label: '4 tuần' }, { value: '8', label: '8 tuần' }]} />
            <div className="mb-1 text-sm font-medium">Khối lượng mỗi tuần (kg)</div>
            <SimpleBars data={vol} dataKey="volume" name="Khối lượng" />
            <div className="mt-3 mb-1 text-sm font-medium">Tạ hiệp chính nặng nhất vs mục tiêu</div>
            {top.length ? (
              <SimpleLine data={top} lines={[{ key: 'top', name: 'Thực tế' }, { key: 'target', name: 'Mục tiêu', color: 'var(--ok)', dashed: true }]} unit="kg" />
            ) : (
              <Empty>Chưa có buổi trong khoảng này</Empty>
            )}
          </>
        )}
      </Card>

      <SectionTitle>Lịch sử</SectionTitle>
      {sessions.length === 0 && <Empty>Chưa có buổi tập nào</Empty>}
      {sessions.map((s) => {
        const sets = data!.sets.filter((x) => x.session_id === s.id);
        const items = data!.items.filter((x) => x.session_id === s.id);
        const v = volumeKg(sets);
        return (
          <Card key={s.id} onClick={() => nav(s.status === 'in_progress' ? `/workout/${s.id}` : `/training/session/${s.id}`)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {SESSION_KIND_LABEL[s.kind]} {s.is_backfill && <Badge>ghi bù</Badge>} {s.status === 'in_progress' && <Badge tone="accent">đang tập</Badge>}{' '}
                  {s.status === 'skipped' && <Badge tone="warn">nghỉ</Badge>}
                </div>
                <div className="text-sm text-muted">
                  {WEEKDAY_LABEL[weekdayOf(s.session_date)]}, {formatVN(s.session_date, true)}
                  {s.duration_min ? ` · ${s.duration_min} phút` : ''}
                  {s.status === 'skipped' && s.note ? ` · ${s.note}` : ''}
                </div>
              </div>
              <div className="tabular text-right text-sm">
                {items.length > 0 ? <div>{items.filter((i) => i.status === 'done' || i.status === 'partial').length}/{items.length} bài</div> : null}
                {v > 0 && <div className="text-muted">{formatNumberVN(v)} kg</div>}
                {s.kind === 'badminton' && s.est_kcal ? <div className="text-muted">≈ {s.est_kcal} kcal</div> : null}
              </div>
            </div>
          </Card>
        );
      })}
    </Page>
  );
}
