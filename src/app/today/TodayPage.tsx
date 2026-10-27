import { useState } from 'react';
import { useNavigate } from 'react-router';
import { startSession } from '@/data/api';
import { qk, useActivePlan, useExerciseMaps, useGoals, useInbody, useInProgress, useInvalidate, usePhotos, usePlans, useReviews, useTraining, useWeights } from '@/data/queries';
import { diffDays, formatVN, todayVN, WEEKDAY_LABEL, weekdayOf, weekStart } from '@/engine/dates';
import { activeGoal, GOAL_STATUS_LABEL, goalProgress } from '@/engine/goals';
import { inbodyDue, latestFfm } from '@/engine/inbody';
import { formatNumberVN } from '@/engine/math';
import type { SundayOption } from '@/engine/plan-schema';
import { dayPlanFor, type SessionKind, SESSION_KIND_LABEL, templateFor, templateForKind, todayConflictWarning } from '@/engine/schedule';
import { lossTrendKgPerWeek } from '@/engine/weight';
import { weekSummary } from '@/engine/workout-summary';
import { Badge, Banner, Button, Card, ErrorBox, Page, ProgressBar, SectionTitle, Spinner } from '@/ui/components';
import { ExerciseLine } from '../shared';

const SUNDAY_LABEL: Record<SundayOption, string> = {
  walk: 'Đi bộ 30–40 phút',
  zone2: 'Cardio zone 2',
  core: 'Core 10–15 phút',
  push_light: 'Push nhẹ',
  pull_light: 'Pull nhẹ',
};

export function TodayPage() {
  const today = todayVN();
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const plan = useActivePlan();
  const plans = usePlans();
  const ex = useExerciseMaps();
  const goals = useGoals();
  const weights = useWeights();
  const inbody = useInbody();
  const photos = usePhotos();
  const reviews = useReviews();
  const training = useTraining();
  const inProgress = useInProgress();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (plan.isLoading || ex.loading || training.isLoading) return <Page title="Hôm nay"><Spinner /></Page>;
  if (plan.error) return <Page title="Hôm nay"><ErrorBox error={plan.error} /></Page>;
  if (!plan.data) return <Page title="Hôm nay"><Banner tone="warn">Chưa có lộ trình active</Banner></Page>;

  const content = plan.data.content;
  const day = dayPlanFor(content, today);
  const sessions = training.data?.sessions ?? [];
  const doneToday = sessions.filter((s) => s.session_date === today && s.status === 'completed');
  const lastWeight = weights.data?.at(-1);
  const trend = weights.data ? lossTrendKgPerWeek(weights.data, today) : null;
  const ffm = inbody.data ? latestFfm(inbody.data) : null;
  const progress = lastWeight && goals.data ? goals.data.map((g) => goalProgress(g, lastWeight.weight_kg, today, trend, ffm)) : [];
  const goal = activeGoal(progress);
  const drafts = (plans.data ?? []).filter((p) => p.status === 'draft');
  const unread = (reviews.data ?? []).filter((r) => !r.is_read);
  const conflict = todayConflictWarning(content, today, sessions.map((s) => ({ date: s.session_date, kind: s.kind })));
  const inb = inbodyDue(inbody.data?.at(-1)?.measured_on ?? null, today);
  const lastPhoto = photos.data?.[0]?.taken_on ?? null;
  const photoDue = !lastPhoto || diffDays(lastPhoto, today) >= 14;
  const isMonday = weekdayOf(today) === 'mon';
  const reviewedThisWeek = (plans.data ?? []).some((p) => p.approved_at && p.approved_at.slice(0, 10) >= weekStart(today));
  const week = training.data
    ? weekSummary(weekStart(today), sessions, training.data.items, training.data.sets, content, lastWeight?.weight_kg ?? 81.7)
    : null;

  async function start(kind: SessionKind) {
    const tmpl = templateForKind(content, kind);
    const key = kind.startsWith('push') ? 'push' : kind.startsWith('pull') ? 'pull' : 'legs';
    if (!tmpl || !plan.data) return;
    setStarting(true);
    setError(null);
    try {
      const id = await startSession({ kind, date: today, plan: plan.data, items: tmpl.items, templateKey: key, exercises: ex.list });
      await invalidate(qk.inProgress, qk.training);
      nav(`/workout/${id}`);
    } catch (e) {
      setError(e);
    } finally {
      setStarting(false);
    }
  }

  const startButton = (kind: SessionKind) =>
    inProgress.data ? (
      <Button variant="primary" size="lg" block onClick={() => nav(`/workout/${inProgress.data!.id}`)}>
        ▶ Tiếp tục buổi tập
      </Button>
    ) : (
      <Button variant="primary" size="lg" block disabled={starting} onClick={() => void start(kind)}>
        {starting ? 'Đang tạo buổi…' : '▶ Bắt đầu buổi tập'}
      </Button>
    );

  return (
    <Page title={`Hôm nay · ${WEEKDAY_LABEL[weekdayOf(today)]}, ${formatVN(today)}`}>
      {drafts.length > 0 && (
        <Banner tone="accent" onClick={() => nav(`/more/plans/${drafts[0].id}`)} action={<b>Xem ›</b>}>
          Có {drafts.length} lộ trình mới chờ duyệt
        </Banner>
      )}
      {unread.length > 0 && (
        <Banner tone="info" onClick={() => nav('/more/reviews')} action={<b>Đọc ›</b>}>
          Nhận xét tuần mới từ coach
        </Banner>
      )}
      {isMonday && !reviewedThisWeek && drafts.length === 0 && new Date().getHours() >= 10 && (
        <Banner tone="warn">Chưa review tuần này — chạy review với Claude Code trên máy tính</Banner>
      )}
      {conflict && <Banner tone="warn">⚠️ {conflict}</Banner>}
      {inb.due && <Banner tone="info" onClick={() => nav('/body/inbody')}>Đến hạn đo InBody (đã {inb.daysSince ?? '—'} ngày)</Banner>}
      {photoDue && <Banner tone="info" onClick={() => nav('/body/photos/capture')}>Đến lượt chụp ảnh tiến độ (2 tuần/lần)</Banner>}
      {error ? <ErrorBox error={error} /> : null}

      {goal && (
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <div className="font-semibold">🎯 {goal.goal.name} · {formatVN(goal.goal.target_date)}</div>
            <Badge tone={goal.status === 'behind' ? 'warn' : 'ok'}>{GOAL_STATUS_LABEL[goal.status]}</Badge>
          </div>
          <div className="tabular mb-2 text-sm text-muted">
            Còn {goal.daysLeft} ngày ({formatNumberVN(goal.weeksLeft, 1)} tuần) · cần −{formatNumberVN(goal.requiredKgPerWeek, 2)} kg/tuần
            · còn {formatNumberVN(goal.gapKg, 1)} kg
          </div>
          <ProgressBar value={81.7 - (lastWeight?.weight_kg ?? 81.7)} max={81.7 - goal.goal.target_weight_max} />
          <div className="tabular mt-1 flex justify-between text-xs text-muted">
            <span>{formatNumberVN(lastWeight?.weight_kg ?? 0, 1)} kg</span>
            <span>
              mục tiêu {formatNumberVN(goal.goal.target_weight_min, 0)}
              {goal.goal.target_weight_min !== goal.goal.target_weight_max && `–${formatNumberVN(goal.goal.target_weight_max, 0)}`} kg
              {goal.estimatedBodyFatPct !== null && ` · mỡ ~${formatNumberVN(goal.estimatedBodyFatPct, 1)}%`}
            </span>
          </div>
          {goal.unsafe && <Banner tone="bad">Mốc này cần giảm nhanh hơn 0,7 kg/tuần — cân nhắc dời mốc, không giảm calo dưới 1.700</Banner>}
        </Card>
      )}

      <SectionTitle>Buổi hôm nay</SectionTitle>
      {day.kind === 'session' && (() => {
        const tmpl = templateFor(content, day.template)!;
        const done = doneToday.find((s) => s.kind === day.template);
        return (
          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-xl font-bold">{tmpl.name}</h3>
              {done && <Badge tone="ok">Đã tập ✓</Badge>}
            </div>
            {tmpl.warmup.cardio && (
              <p className="mb-2 text-sm text-muted">
                🔥 Khởi động: {ex.bySlug.get(tmpl.warmup.cardio.exercise)?.name_vi} {tmpl.warmup.cardio.minutes}' · {String(tmpl.warmup.cardio.speed_kmh_min).replace('.', ',')}–
                {tmpl.warmup.cardio.speed_kmh_max} km/h
              </p>
            )}
            <div className="mb-3 divide-y divide-line">
              {tmpl.items.map((it) => (
                <ExerciseLine key={it.exercise} ex={ex.bySlug.get(it.exercise)} item={it} />
              ))}
            </div>
            {done ? (
              <Button block onClick={() => nav(`/training/session/${done.id}`)}>Xem buổi đã tập</Button>
            ) : (
              startButton(day.template)
            )}
          </Card>
        );
      })()}

      {day.kind === 'badminton' && (
        <Card>
          <h3 className="mb-1 text-xl font-bold">🏸 Cầu lông</h3>
          <p className="mb-2 text-sm text-muted">{day.minutes_min}–{day.minutes_max} phút, nhẹ nhàng</p>
          {day.warmup && <p className="mb-3 text-sm">🔥 Khởi động {day.warmup.minutes}': {day.warmup.mobility.join(' · ')}</p>}
          {doneToday.some((s) => s.kind === 'badminton') ? (
            <Badge tone="ok">Đã ghi ✓</Badge>
          ) : (
            <Button variant="primary" size="lg" block onClick={() => nav('/training/simple/badminton')}>Ghi buổi cầu lông</Button>
          )}
        </Card>
      )}

      {day.kind === 'rest' && (
        <Card>
          <h3 className="mb-1 text-xl font-bold">😌 Nghỉ</h3>
          <p className="mb-3 text-sm text-muted">Gợi ý: đi bộ 20–30 phút, mục tiêu ≥ {formatNumberVN(content.activity.rest_day_steps_max)} bước.</p>
          <Button block onClick={() => nav('/training/simple/walk')}>Ghi đi bộ</Button>
        </Card>
      )}

      {day.kind === 'optional' && (
        <Card>
          <h3 className="mb-1 text-xl font-bold">☀️ Chủ nhật — tuỳ chọn (trưa, nhẹ)</h3>
          <p className="mb-3 text-sm text-muted">Chọn một: Push/Pull nhẹ = mỗi bài bớt 1 hiệp. Không gán Legs.</p>
          <div className="grid gap-2">
            {day.options.map((o) =>
              o === 'push_light' || o === 'pull_light' ? (
                <Button key={o} variant="secondary" disabled={starting || !!inProgress.data} onClick={() => void start(o)}>
                  ▶ {SUNDAY_LABEL[o]}
                </Button>
              ) : (
                <Button key={o} variant="secondary" onClick={() => nav(`/training/simple/${o}`)}>
                  {SUNDAY_LABEL[o]}
                </Button>
              ),
            )}
          </div>
        </Card>
      )}

      {week && (
        <>
          <SectionTitle>Tuần này</SectionTitle>
          <Card onClick={() => nav('/training')}>
            <div className="tabular flex justify-between text-sm">
              <span>Buổi đã tập</span>
              <b>{week.doneSessions}/{week.plannedSessions}</b>
            </div>
            <div className="mt-2"><ProgressBar value={week.doneSessions} max={week.plannedSessions} tone="ok" /></div>
            <div className="mt-2 text-xs text-muted">
              Khởi động {week.sessionsWithWarmup}/{week.strengthSessions} buổi tạ · {sessions.filter((s) => s.session_date === today).map((s) => SESSION_KIND_LABEL[s.kind]).join(', ') || 'chưa tập hôm nay'}
            </div>
          </Card>
        </>
      )}

      <p className="mt-4 px-1 text-xs text-muted">
        Tham khảo (không ghi): ăn ~{formatNumberVN(content.nutrition.calories_kcal)} kcal · đạm ~{content.nutrition.protein_g}g · nước{' '}
        {content.hydration.water_ml_min / 1000}–{content.hydration.water_ml_max / 1000}L · {content.activity.steps_min / 1000}–{content.activity.steps_max / 1000}k bước · ngủ {content.sleep.hours_min}–{content.sleep.hours_max}h
      </p>
    </Page>
  );
}
