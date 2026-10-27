import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { approvePlan, rejectPlan } from '@/data/api';
import { qk, useExerciseMaps, useInvalidate, usePlans } from '@/data/queries';
import { addDays, formatVN, todayVN, WEEKDAY_LABEL, WEEKDAYS } from '@/engine/dates';
import { formatNumberVN } from '@/engine/math';
import { diffPlans } from '@/engine/plan-diff';
import { validatePlanRules } from '@/engine/plan-schema';
import { Badge, Banner, Button, Card, Chip, Empty, ErrorBox, ExerciseImg, Field, Input, Page, SectionTitle, Segmented, Sheet, Spinner } from '@/ui/components';
import { ExerciseLine } from '../shared';
import { CREATED_BY_LABEL, StatusBadge } from './plan-ui';

const DIFF_LABEL: Record<string, string> = {
  added: 'Thêm', removed: 'Bớt', replaced: 'Thay', sets: 'Hiệp', reps: 'Lần', rest: 'Nghỉ', order: 'Thứ tự', target_kg: 'Tạ',
  warmup_sets: 'Làm nóng', coach_note: 'Coach', exercise_new: 'Bài mới', exercise_edit: 'Sửa bài', warmup: 'Khởi động', nutrition: 'Calo', schedule: 'Lịch',
};

/** View one plan version, diff against the previous one, Approve / Reject (§4.5–4.6). */
export function PlanDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const plans = usePlans();
  const ex = useExerciseMaps();
  const [tab, setTab] = useState<'diff' | 'content'>('diff');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [when, setWhen] = useState<'today' | 'date'>('today');
  const [date, setDate] = useState(addDays(todayVN(), 1));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<string | null>(null);

  if (plans.isLoading || ex.loading) return <Page title="Lộ trình" back="/more/plans"><Spinner /></Page>;
  const p = plans.data?.find((x) => x.id === id);
  if (!p) return <Page title="Lộ trình" back="/more/plans"><Empty>Không tìm thấy</Empty></Page>;
  const active = plans.data!.find((x) => x.status === 'active');
  const base = plans.data!.find((x) => x.id === p.based_on_version_id) ?? (p.status === 'draft' ? active : undefined);
  const names = (s: string) => ex.bySlug.get(s)?.name_vi ?? p.content.exercise_upserts.find((e) => e.slug === s)?.name_vi ?? s;
  // exercises that existed before this version was approved (ones created by this version still count as "new")
  const createdByThis = (e: { created_at?: string; updated_by_plan_version_id?: string | null }) =>
    e.updated_by_plan_version_id === p.id && !!p.approved_at && !!e.created_at && e.created_at >= new Date(new Date(p.approved_at).getTime() - 5_000).toISOString();
  const existing = new Set(ex.list.filter((e) => !createdByThis(e)).map((e) => e.slug));
  const diff = base && base.id !== p.id ? diffPlans(base.content, p.content, names, existing) : [];
  const issues = validatePlanRules(p.content, ex.bySlug.keys());

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const r = await approvePlan(p!.id, when === 'today' ? todayVN() : date);
      setResult(r === 'active' ? 'Đã duyệt — áp dụng từ hôm nay' : `Đã duyệt — áp dụng từ ${formatVN(date, true)}`);
      setApproveOpen(false);
      await invalidate(qk.plans, qk.activePlan, qk.exercises);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await rejectPlan(p!.id, reason);
      setRejectOpen(false);
      await invalidate(qk.plans);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title={`Lộ trình v${p.version_no}`} back="/more/plans">
      <Card>
        <div className="mb-1 flex items-center gap-2">
          <StatusBadge status={p.status} />
          <span className="text-sm text-muted">{CREATED_BY_LABEL[p.created_by]} · {formatVN(p.created_at.slice(0, 10), true)}</span>
        </div>
        {p.effective_from && <div className="text-sm">Hiệu lực từ {formatVN(p.effective_from, true)}</div>}
        <div className="text-sm">Calo tham khảo {formatNumberVN(p.calories_kcal)} kcal</div>
        {p.change_note && <p className="mt-2 rounded-lg bg-card-2 p-2 text-sm whitespace-pre-wrap">{p.change_note}</p>}
        {p.rejected_reason && <Banner tone="bad">Lý do từ chối: {p.rejected_reason}</Banner>}
      </Card>
      {result && <Banner tone="ok">{result}</Banner>}
      {issues.filter((i) => i.level === 'error').map((i) => <Banner key={i.message} tone="bad">{i.message}</Banner>)}
      {error ? <ErrorBox error={error} /> : null}

      {p.status === 'draft' && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Button variant="danger" onClick={() => setRejectOpen(true)}>Từ chối</Button>
          <Button variant="ok" onClick={() => setApproveOpen(true)} disabled={issues.some((i) => i.level === 'error')}>Duyệt</Button>
        </div>
      )}
      {p.status === 'active' && <Button block className="mb-3" onClick={() => nav(`/more/plans/${p.id}/edit`)}>Sửa → tạo phiên bản mới</Button>}

      <Segmented value={tab} onChange={setTab} options={[{ value: 'diff', label: base ? `Thay đổi so với v${base.version_no}` : 'Thay đổi' }, { value: 'content', label: 'Nội dung đầy đủ' }]} />

      {tab === 'diff' ? (
        diff.length === 0 ? (
          <Empty>{base ? 'Không có thay đổi' : 'Phiên bản đầu tiên'}</Empty>
        ) : (
          <Card>
            {diff.map((d, i) => (
              <div key={i} className="flex gap-2 border-b border-line py-2 text-sm last:border-0">
                <span className="w-[68px] shrink-0"><Badge tone={d.kind === 'removed' ? 'bad' : d.kind === 'added' || d.kind === 'exercise_new' ? 'accent' : 'muted'}>{DIFF_LABEL[d.kind]}</Badge></span>
                <span className="min-w-0 flex-1">
                  <span className="text-muted">{d.scope}: </span>
                  {d.text}
                  {d.warning && <span className="block text-bad">{d.warning}</span>}
                  {(d.kind === 'exercise_new' || d.kind === 'exercise_edit') && d.slug && (
                    <span className="mt-2 grid grid-cols-2 gap-2">
                      {d.kind === 'exercise_edit' && p.status === 'draft' && <span><span className="text-xs text-muted">Hình cũ</span><ExerciseImg svg={ex.bySlug.get(d.slug)?.illustration_svg} name="cũ" /></span>}
                      <span><span className="text-xs text-muted">{d.kind === 'exercise_edit' ? 'Hình mới' : 'Hình'}</span><ExerciseImg svg={p.content.exercise_upserts.find((e) => e.slug === d.slug)?.illustration_svg} name="mới" /></span>
                    </span>
                  )}
                </span>
              </div>
            ))}
          </Card>
        )
      ) : (
        <>
          <SectionTitle>Lịch tuần</SectionTitle>
          <Card>
            {WEEKDAYS.map((d) => {
              const day = p.content.schedule[d];
              return (
                <div key={d} className="flex justify-between border-b border-line py-1.5 text-sm last:border-0">
                  <span className="text-muted">{WEEKDAY_LABEL[d]}</span>
                  <span className="font-medium">
                    {day.kind === 'session' ? p.content.templates.find((t) => t.key === day.template)?.name : day.kind === 'rest' ? 'Nghỉ' : day.kind === 'badminton' ? 'Cầu lông' : 'Tuỳ chọn'}
                  </span>
                </div>
              );
            })}
          </Card>
          {p.content.templates.map((t) => (
            <div key={t.key}>
              <SectionTitle>{t.name}</SectionTitle>
              <Card>
                {t.warmup.cardio && <p className="mb-1 text-sm text-muted">Khởi động: {names(t.warmup.cardio.exercise)} {t.warmup.cardio.minutes}′ · {t.warmup.mobility.join(' · ')}</p>}
                <div className="divide-y divide-line">
                  {t.items.map((it) => (
                    <div key={it.exercise}>
                      <ExerciseLine ex={ex.bySlug.get(it.exercise)} item={it} />
                      {it.coach_note && <p className="-mt-1 pb-2 text-xs text-info">Coach: “{it.coach_note}”</p>}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
          <p className="px-1 text-xs text-muted">
            Tham khảo: {formatNumberVN(p.content.nutrition.calories_kcal)} kcal · P {p.content.nutrition.protein_g}g · C {p.content.nutrition.carb_g}g · F {p.content.nutrition.fat_g}g
          </p>
        </>
      )}

      <Sheet open={approveOpen} onClose={() => setApproveOpen(false)} title={`Duyệt lộ trình v${p.version_no}`}>
        <div className="mb-3 flex gap-2">
          <Chip active={when === 'today'} onClick={() => setWhen('today')}>Áp dụng hôm nay</Chip>
          <Chip active={when === 'date'} onClick={() => setWhen('date')}>Chọn ngày</Chip>
        </div>
        {when === 'date' && (
          <Field label="Áp dụng từ ngày">
            <Input type="date" min={addDays(todayVN(), 1)} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        <p className="mb-3 text-sm text-muted">
          {active ? `Bản đang dùng v${active.version_no} chuyển sang lưu trữ ` : ''}
          {when === 'today' ? 'ngay bây giờ.' : 'vào ngày đã chọn (tự động lúc 00:05).'}
          {p.content.exercise_upserts.length > 0 && <> Thư viện được cập nhật {p.content.exercise_upserts.length} bài.</>}
        </p>
        <Button variant="ok" size="lg" block disabled={busy} onClick={() => void approve()}>
          {busy ? 'Đang duyệt…' : 'Duyệt'}
        </Button>
      </Sheet>

      <Sheet open={rejectOpen} onClose={() => setRejectOpen(false)} title="Từ chối lộ trình">
        <Field label="Lý do (để Claude biết lần sau)">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="vd. chưa muốn đổi bài chính" />
        </Field>
        <Badge tone="muted">Bản bị từ chối vẫn được lưu để xem lại</Badge>
        <Button variant="danger" size="lg" block className="mt-3" disabled={busy} onClick={() => void reject()}>Từ chối</Button>
      </Sheet>
    </Page>
  );
}
