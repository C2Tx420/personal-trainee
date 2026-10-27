import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { addExtraItem, createProvisionalExercise, finishSession, saveSet, type SetInput, updateItem } from '@/data/api';
import { qk, useActivePlan, useExerciseHistory, useExerciseMaps, useInvalidate, useSessionDetail, useWeights } from '@/data/queries';
import { lastPerformance, formatSet, prefillKg, progressionHint } from '@/engine/progression';
import { type FlowItem, type FlowStep, flowProgress, itemBadge, itemsToMarkDone, nextStep, orderedItems, plannedFor, remainingSets } from '@/engine/session-flow';
import { SESSION_KIND_LABEL } from '@/engine/schedule';
import type { TemplateWarmup } from '@/engine/plan-schema';
import { FEEL_LABEL, KG_CHANGE_LABEL, SUBSTITUTION_LABEL, type ExerciseRow, type SessionItemRow, type SetRow } from '@/engine/types';
import { setLabel } from '@/engine/warmup';
import { estimateSessionKcal, sessionSummary } from '@/engine/workout-summary';
import { useNow, useWakeLock } from '@/lib/hooks';
import { Badge, Banner, Button, Card, Chip, cx, ErrorBox, ExerciseImg, GLASS_HEADER, Input, ProgressBar, Sheet, Spinner, Stat } from '@/ui/components';
import { IconClose, IconList } from '@/ui/icons';
import { fmtKg, itemSummary } from '../shared';
import { ExercisePicker, type PickResult } from './ExercisePicker';
import { RestOverlay } from './RestOverlay';
import { SetCard } from './SetCard';
import { SubstituteSheet } from './SubstituteSheet';
import { WarmupStep } from './WarmupStep';

const SKIP_REASONS = ['Hết giờ', 'Máy bận lâu', 'Đau / mỏi', 'Không muốn tập'];

/** ▶ Luồng tập từng bước (§6.2). Trạng thái luôn tính lại từ DB. */
export function WorkoutFlowPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const detail = useSessionDetail(id);
  const ex = useExerciseMaps();
  const plan = useActivePlan();
  const weights = useWeights();
  const items = useMemo(() => detail.data?.items ?? [], [detail.data]);
  const sets = useMemo(() => detail.data?.sets ?? [], [detail.data]);
  const exIds = useMemo(() => [...new Set(items.map((i) => i.exercise_id))].sort(), [items]);
  const history = useExerciseHistory(exIds);
  const now = useNow(1000);

  const [focusId, setFocusId] = useState<string | null>(null);
  const [restDismissed, setRestDismissed] = useState<string | null>(null);
  const [restExtra, setRestExtra] = useState(0);
  const [subItem, setSubItem] = useState<SessionItemRow | null>(null);
  const [skipItem, setSkipItem] = useState<SessionItemRow | null>(null);
  const [skipReason, setSkipReason] = useState('');
  const [editSet, setEditSet] = useState<SetRow | null>(null);
  const [overview, setOverview] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addPick, setAddPick] = useState<PickResult | null>(null);
  const [forceSummary, setForceSummary] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const session = detail.data?.session;
  useWakeLock(session?.status === 'in_progress');

  const refresh = useCallback(() => invalidate(qk.session(id), qk.training, qk.inProgress, qk.exercises, qk.history(exIds)), [invalidate, id, exIds]);

  const lastFor = useCallback(
    (exerciseId: string) =>
      lastPerformance(
        (history.data ?? [])
          .filter((h) => h.sessionId !== id)
          .map((h) => ({ date: h.date, sets: h.sets.filter((s) => s.exercise_id === exerciseId) })),
      ),
    [history.data, id],
  );

  const flowItems: FlowItem[] = useMemo(
    () =>
      items.map((item) => ({
        item,
        loadStepKg: ex.byId.get(item.exercise_id)?.load_step_kg ?? 2.5,
        fallbackWorkingKg: lastFor(item.exercise_id)?.sets.at(-1)?.weight_kg ?? null,
      })),
    [items, ex.byId, lastFor],
  );

  // Bài xong hết hiệp → đánh dấu done
  useEffect(() => {
    const ids = itemsToMarkDone(flowItems, sets);
    if (ids.length === 0) return;
    void Promise.all(ids.map((i) => updateItem(i, { status: 'done', finished_at: new Date().toISOString() }))).then(refresh);
    if (focusId && ids.includes(focusId)) setFocusId(null);
  }, [flowItems, sets, refresh, focusId]);

  if (detail.isLoading || ex.loading) return <Spinner label="Đang mở buổi tập…" />;
  if (detail.error || !session) return <div className="p-4"><ErrorBox error={detail.error ?? 'Không tìm thấy buổi tập'} /></div>;
  if (session.status !== 'in_progress') {
    nav(`/training/session/${session.id}`, { replace: true });
    return null;
  }

  // ── bước hiện tại (có thể bị "nhảy tới bài" ghi đè)
  let step: FlowStep = forceSummary ? { type: 'summary' } : nextStep(session, flowItems, sets);
  const ordered = orderedItems(flowItems).filter((f) => f.item.status !== 'skipped');
  if (!forceSummary && focusId && step.type !== 'warmup') {
    const fi = ordered.find((f) => f.item.id === focusId);
    const rem = fi ? remainingSets(fi, sets) : [];
    if (fi && fi.item.status !== 'done' && rem.length) {
      const order = ordered.indexOf(fi) + 1;
      step = fi.item.status === 'pending'
        ? { type: 'intro', item: fi.item, order, total: ordered.length }
        : { type: 'set', item: fi.item, planned: rem[0], order, total: ordered.length, workingTotal: fi.item.target.sets };
    }
  }

  const progress = flowProgress(flowItems, sets);
  const snapshot = session.template_snapshot as { name?: string; warmup?: TemplateWarmup } | null;

  // ── đồng hồ nghỉ: tính từ hiệp vừa xong gần nhất
  const lastDone = [...sets].filter((s) => s.completed && s.completed_at).sort((a, b) => (a.completed_at! < b.completed_at! ? 1 : -1))[0];
  const lastItem = lastDone ? items.find((i) => i.id === lastDone.session_item_id) : undefined;
  const restSec = lastItem ? (lastDone.set_type === 'warmup' ? Math.min(60, lastItem.target.rest_sec_min) : lastItem.target.rest_sec_min) : 0;
  const restEndsAt = lastDone ? new Date(lastDone.completed_at!).getTime() + restSec * 1000 + restExtra : 0;
  const showRest = !!lastDone && restDismissed !== lastDone.id && now < restEndsAt && (step.type === 'set' || step.type === 'intro');

  async function onSaveSet(s: SetInput, item: SessionItemRow) {
    await saveSet(s);
    if (item.status === 'pending') await updateItem(item.id, { status: 'in_progress', started_at: new Date().toISOString() });
    setRestExtra(0);
    await refresh();
  }

  async function startItem(item: SessionItemRow) {
    await updateItem(item.id, { status: 'in_progress', started_at: new Date().toISOString() });
    setFocusId(item.id);
    await refresh();
  }

  async function defer(item: SessionItemRow) {
    await updateItem(item.id, { deferred: true, status: sets.some((s) => s.session_item_id === item.id) ? 'in_progress' : 'pending' });
    if (focusId === item.id) setFocusId(null);
    await refresh();
  }

  async function skip() {
    if (!skipItem) return;
    const hasSets = sets.some((s) => s.session_item_id === skipItem.id && s.completed);
    await updateItem(skipItem.id, { status: hasSets ? 'partial' : 'skipped', skip_reason: skipReason.trim() || null, finished_at: new Date().toISOString() });
    setSkipItem(null);
    setSkipReason('');
    if (focusId === skipItem.id) setFocusId(null);
    await refresh();
  }

  async function addItem() {
    if (!addPick) return;
    const exercise: ExerciseRow = 'exercise' in addPick ? addPick.exercise : await createProvisionalExercise(addPick.newName, null, session!.id);
    await addExtraItem(session!.id, exercise, Math.max(-1, ...items.map((i) => i.position)) + 1);
    setAddOpen(false);
    setAddPick(null);
    await refresh();
  }

  async function finish() {
    setFinishing(true);
    try {
      const minutes = session!.started_at ? Math.round((Date.now() - new Date(session!.started_at).getTime()) / 60_000) : 60;
      const kcal = plan.data ? estimateSessionKcal({ ...session!, duration_min: minutes }, plan.data.content, weights.data?.at(-1)?.weight_kg ?? 81.7) : null;
      await finishSession(session!, kcal);
      await refresh();
      nav(`/training/session/${session!.id}`, { replace: true });
    } catch (e) {
      setError(e);
      setFinishing(false);
    }
  }

  // ── nội dung theo bước
  let body: React.ReactNode;
  if (step.type === 'warmup') {
    body = (
      <WarmupStep
        sessionId={session.id}
        warmup={snapshot?.warmup ?? null}
        cardioExercise={snapshot?.warmup?.cardio ? ex.bySlug.get(snapshot.warmup.cardio.exercise) : undefined}
        onDone={() => void refresh()}
      />
    );
  } else if (step.type === 'summary') {
    const sum = sessionSummary(session, items, sets, ex.byId);
    body = (
      <div>
        <h2 className="mb-3 text-[26px] font-bold tracking-tight">Tổng kết buổi</h2>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Stat label="Bài hoàn thành" value={`${sum.itemsDone}/${sum.itemsTotal}`} sub={sum.itemsSkipped ? `${sum.itemsSkipped} bài bỏ` : undefined} />
          <Stat label="Hiệp chính" value={`${sum.workingSetsDone}/${sum.workingSetsPlanned}`} />
          <Stat label="Khối lượng" value={`${sum.volumeKg.toLocaleString('vi-VN')} kg`} sub={sum.missingKgExercises.length ? `${sum.missingKgExercises.length} bài không có số kg` : undefined} />
          <Stat label="Thời gian" value={`${sum.durationMin ?? '—'} phút`} sub={sum.warmupDone === null ? undefined : sum.warmupDone ? 'Có khởi động' : 'Bỏ khởi động'} />
        </div>
        {sum.itemsSubstituted.length > 0 && (
          <Card>
            <div className="mb-1 font-semibold">Đổi bài</div>
            {sum.itemsSubstituted.map((s, i) => (
              <div key={i} className="text-sm">
                {s.planned} → <b>{s.done}</b> · {SUBSTITUTION_LABEL[s.reason]}
                {s.note && <span className="text-muted"> — {s.note}</span>}
              </div>
            ))}
          </Card>
        )}
        {sum.kgChanges.length > 0 && (
          <Card>
            <div className="mb-1 font-semibold">Kg khác kế hoạch</div>
            {sum.kgChanges.map((k, i) => (
              <div key={i} className="tabular text-sm">
                {k.exercise} · hiệp {k.setIndex}: kế hoạch {fmtKg(k.targetKg)}kg → thực tế <b>{fmtKg(k.actualKg)}kg</b> ({KG_CHANGE_LABEL[k.reason]}
                {k.note ? `: ${k.note}` : ''})
              </div>
            ))}
          </Card>
        )}
        {error ? <ErrorBox error={error} /> : null}
        <Button variant="primary" size="xl" block disabled={finishing} onClick={() => void finish()}>
          {finishing ? 'Đang lưu…' : 'Lưu & kết thúc'}
        </Button>
        {forceSummary && (
          <Button variant="ghost" block className="mt-2" onClick={() => setForceSummary(false)}>
            ← Quay lại tập tiếp
          </Button>
        )}
      </div>
    );
  } else {
    const item = step.item;
    const exercise = ex.byId.get(item.exercise_id);
    const planned = ex.byId.get(item.planned_exercise_id ?? '');
    const last = lastFor(item.exercise_id);
    const hint = progressionHint(item.target, last, exercise?.load_step_kg ?? 2.5);
    const doneHere = sets.filter((s) => s.session_item_id === item.id && s.completed);
    const fi = flowItems.find((f) => f.item.id === item.id)!;
    const allPlanned = plannedFor(fi);
    body = (
      <div>
        <ExerciseImg svg={exercise?.illustration_svg} name={exercise?.name_vi ?? ''} className={cx('mb-3', step.type === 'set' && 'mx-auto max-w-[260px]')} />
        <div className="mb-1 flex items-start justify-between gap-2">
          <h2 className="text-[26px] leading-tight font-bold tracking-tight">{exercise?.name_vi}</h2>
          {exercise?.is_provisional && <Badge tone="info">bài tạm</Badge>}
        </div>
        {item.substitution_reason && (
          <p className="mb-1 text-sm text-info">
            Thay cho {planned?.name_vi} · {SUBSTITUTION_LABEL[item.substitution_reason]}
            {item.substitution_note ? ` — ${item.substitution_note}` : ''}
          </p>
        )}
        <p className="tabular text-sm text-muted">{itemSummary(item.target)} · nghỉ {Math.round(item.target.rest_sec_min / 60 * 10) / 10}′</p>
        {last && (
          <p className="tabular mt-1 text-sm">
            Lần trước {last.date.slice(8)}/{last.date.slice(5, 7)}: {last.sets.map((s) => `${formatSet(s)}${s.feel ? ` (${FEEL_LABEL[s.feel].toLowerCase()})` : ''}`).join(' · ')}
          </p>
        )}
        {item.target.coach_note && <p className="mt-1 rounded-lg bg-info-soft px-2 py-1 text-sm text-info">Coach: “{item.target.coach_note}”</p>}
        {hint && <p className="mt-1 text-sm font-medium text-accent">{hint}</p>}
        {exercise && !exercise.available_at_gym && !item.substitution_reason && (
          <Banner tone="warn">Bài này đang đánh dấu “không có máy” — bấm ⇄ Đổi bài</Banner>
        )}
        {exercise && exercise.cues.length > 0 && (
          <details className="mt-3 rounded-ctl border border-white/[0.06] bg-white/[0.04] px-3.5 py-2.5 text-sm">
            <summary className="cursor-pointer font-medium">Điểm kỹ thuật</summary>
            <ul className="mt-1 list-disc pl-5">{exercise.cues.map((c) => <li key={c}>{c}</li>)}</ul>
            {exercise.common_mistakes.length > 0 && (
              <p className="mt-1 text-muted">Tránh: {exercise.common_mistakes.join(' · ')}</p>
            )}
          </details>
        )}

        <div className="mt-4">
          {step.type === 'intro' ? (
            <Button variant="primary" size="xl" block onClick={() => void startItem(item)}>
              Bắt đầu bài
            </Button>
          ) : (
            exercise && (
              <SetCard
                key={`${item.id}-${step.planned.setType}-${step.planned.index}-${item.exercise_id}`}
                item={item}
                exercise={exercise}
                planned={step.planned}
                workingTotal={step.workingTotal}
                initialKg={prefillKg(step.planned, doneHere, last)}
                initialReason={
                  step.planned.setType === 'working'
                    ? (doneHere.filter((s) => s.set_type === 'working').sort((a, b) => a.set_index - b.set_index).at(-1)?.kg_change_reason ?? null)
                    : null
                }
                onSave={(s) => onSaveSet(s, item)}
              />
            )
          )}
        </div>

        {doneHere.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Hiệp đã xong">
            {allPlanned
              .map((p) => doneHere.find((s) => s.set_type === p.setType && s.set_index === p.index))
              .filter((s): s is SetRow => !!s)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => setEditSet(s)}
                  className={cx('tabular rounded-full border px-3 py-1 text-sm', s.kg_change_reason ? 'border-warn/40 bg-warn-soft text-warn' : 'border-white/10 bg-white/[0.05]')}
                >
                  ✓ {setLabel({ setType: s.set_type, index: s.set_index })} · {formatSet(s)}
                </button>
              ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button size="sm" onClick={() => setSubItem(item)}>Đổi bài</Button>
          <Button size="sm" onClick={() => void defer(item)}>Để sau</Button>
          <Button size="sm" variant="danger" onClick={() => setSkipItem(item)}>Bỏ bài</Button>
        </div>
      </div>
    );
  }

  const currentItem = step.type === 'set' || step.type === 'intro' ? step.item : null;
  const editItem = editSet ? items.find((i) => i.id === editSet.session_item_id) : null;
  const editPlanned = editSet && editItem ? plannedFor(flowItems.find((f) => f.item.id === editItem.id)!).find((p) => p.setType === editSet.set_type && p.index === editSet.set_index) : null;
  const subOriginal = subItem ? ex.byId.get(subItem.exercise_id) : undefined;

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-10">
      <header className={cx(GLASS_HEADER, 'mb-4 px-4 pb-2.5')}>
        <div className="flex min-h-12 items-center gap-2">
          <button aria-label="Thoát (buổi vẫn được giữ)" onClick={() => nav('/')} className="glass-subtle -ml-1 grid size-9 place-items-center rounded-full text-muted">
            <IconClose className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[17px] font-bold tracking-tight">{snapshot?.name ?? SESSION_KIND_LABEL[session.kind]}</div>
            <div className="text-xs text-muted">
              {step.type === 'set' || step.type === 'intro' ? `Bài ${step.order}/${step.total}` : step.type === 'warmup' ? 'Khởi động' : 'Tổng kết'} · {progress.done}/
              {progress.total} hiệp chính
            </div>
          </div>
          <Button size="sm" aria-label="Danh sách bài" onClick={() => setOverview(true)}><IconList className="size-[18px]" /></Button>
        </div>
        <ProgressBar value={progress.done} max={progress.total} />
      </header>

      {body}

      {showRest && lastDone && (
        <RestOverlay
          endsAt={restEndsAt}
          next={step.type === 'set' ? `${ex.byId.get(step.item.exercise_id)?.name_vi} · ${setLabel(step.planned, step.workingTotal)}` : step.type === 'intro' ? `Bài tiếp: ${ex.byId.get(step.item.exercise_id)?.name_vi}` : ''}
          onAdd30={() => setRestExtra((x) => x + 30_000)}
          onSkip={() => setRestDismissed(lastDone.id)}
        />
      )}

      {subItem && subOriginal && (
        <SubstituteSheet open onClose={() => setSubItem(null)} item={subItem} original={subOriginal} library={ex.list} bySlug={ex.bySlug} onDone={() => void refresh()} />
      )}

      <Sheet open={!!skipItem} onClose={() => setSkipItem(null)} title="Bỏ bài này?">
        <div className="mb-3 flex flex-wrap gap-2">
          {SKIP_REASONS.map((r) => (
            <Chip key={r} active={skipReason === r} onClick={() => setSkipReason(r)}>{r}</Chip>
          ))}
        </div>
        <Input placeholder="Lý do khác…" value={skipReason} onChange={(e) => setSkipReason(e.target.value)} />
        <Button variant="danger" size="lg" block className="mt-3" onClick={() => void skip()}>
          Bỏ bài
        </Button>
      </Sheet>

      <Sheet open={!!editSet} onClose={() => setEditSet(null)} title="Sửa hiệp đã ghi">
        {editSet && editItem && editPlanned && ex.byId.get(editItem.exercise_id) && (
          <SetCard
            item={editItem}
            exercise={ex.byId.get(editItem.exercise_id)!}
            planned={editPlanned}
            workingTotal={editItem.target.sets}
            initialKg={editSet.weight_kg}
            existing={editSet}
            saveLabel="Lưu"
            onSave={async (s) => {
              await saveSet(s);
              setEditSet(null);
              setRestDismissed(lastDone?.id ?? null);
              await refresh();
            }}
          />
        )}
      </Sheet>

      <Sheet open={overview} onClose={() => setOverview(false)} title="Danh sách bài">
        <div className="glass mb-3 divide-y divide-white/[0.06] overflow-hidden rounded-card">
          {orderedItems(flowItems).map(({ item }) => {
            const badge = itemBadge(item, currentItem);
            const e = ex.byId.get(item.exercise_id);
            const label = { done: 'xong', current: 'đang tập', pending: 'chờ', skipped: 'bỏ', substituted: 'đã đổi', deferred: 'để sau' }[badge];
            return (
              <button
                key={item.id}
                disabled={item.status === 'done' || item.status === 'skipped'}
                onClick={() => {
                  setFocusId(item.id);
                  setForceSummary(false);
                  setOverview(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left disabled:opacity-60"
              >
                <ExerciseImg svg={e?.illustration_svg} name={e?.name_vi ?? ''} className="w-14 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{e?.name_vi}</span>
                  <span className="tabular text-xs text-muted">{itemSummary(item.target)}</span>
                </span>
                <Badge tone={badge === 'done' ? 'ok' : badge === 'current' ? 'accent' : badge === 'skipped' ? 'bad' : badge === 'substituted' ? 'info' : 'muted'}>{label}</Badge>
              </button>
            );
          })}
        </div>
        <div className="grid gap-2">
          <Button onClick={() => { setOverview(false); setAddOpen(true); }}>+ Thêm bài ngoài kế hoạch</Button>
          <Button variant="primary" onClick={() => { setOverview(false); setForceSummary(true); }}>Kết thúc buổi</Button>
        </div>
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Thêm bài">
        <ExercisePicker label="Bài muốn thêm" library={ex.list} quick={[]} value={addPick} onChange={setAddPick} />
        <Button variant="primary" size="lg" block className="mt-3" disabled={!addPick} onClick={() => void addItem()}>
          Thêm vào buổi
        </Button>
      </Sheet>
    </div>
  );
}
