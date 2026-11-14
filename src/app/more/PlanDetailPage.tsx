import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { approvePlan, rejectPlan } from '@/data/api';
import { qk, useExerciseMaps, useInvalidate, usePlans } from '@/data/queries';
import { addDays, formatVN, todayVN, WEEKDAY_LABEL, WEEKDAYS } from '@/engine/dates';
import { validateDraft } from '@/engine/draft-validate';
import { formatNumberVN } from '@/engine/math';
import { diffPlans, draftWarnings, type SessionItemView, type SessionView, sessionChanges } from '@/engine/plan-diff';
import type { PlanContent } from '@/engine/plan-schema';
import { validatePlanRules } from '@/engine/plan-schema';
import type { ExerciseRow } from '@/engine/types';
import { t } from '@/i18n';
import { Badge, Banner, Button, Card, Chip, cx, Empty, ErrorBox, ExerciseImg, Field, Input, Page, SectionTitle, Segmented, Sheet, Skeleton } from '@/ui/components';
import { ExerciseLine, itemSummary } from '../shared';
import { CREATED_BY_LABEL, inlineTitle, NoteLines, noteToLines, StatusBadge, usePlanLabels } from './plan-ui';

/** View one plan version, diff against the previous one, Approve / Reject (§4.5–4.6). */
export function PlanDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const plans = usePlans();
  const ex = useExerciseMaps();
  const labels = usePlanLabels();
  const [libOpen, setLibOpen] = useState(false);
  const [tab, setTab] = useState<'diff' | 'content'>('diff');
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [when, setWhen] = useState<'today' | 'date'>('today');
  const [date, setDate] = useState(addDays(todayVN(), 1));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<string | null>(null);

  if (plans.isLoading || ex.loading || labels.loading) return <Page title={t('Lộ trình')} back="/more/plans"><Skeleton /></Page>;
  const p = plans.data?.find((x) => x.id === id);
  if (!p) return <Page title={t('Lộ trình')} back="/more/plans"><Empty>{t('Không tìm thấy')}</Empty></Page>;
  const active = plans.data!.find((x) => x.status === 'active');
  const warn = draftWarnings(p, plans.data!);
  // a draft built on an old plan is compared with the plan in use now — that is what approving replaces
  const base = (warn.staleBase ? active : plans.data!.find((x) => x.id === p.based_on_version_id)) ?? (p.status === 'draft' ? active : undefined);
  const newestDraft = warn.newest ? null : [...warn.otherDrafts].sort((a, b) => b.version_no - a.version_no)[0];
  const names = (s: string) => {
    const up = p.content.exercise_upserts.find((e) => e.slug === s);
    return ex.bySlug.get(s)?.name ?? up?.name ?? s;
  };
  // exercises that existed before this version was approved (ones created by this version still count as "new")
  const createdByThis = (e: { created_at?: string; updated_by_plan_version_id?: string | null }) =>
    e.updated_by_plan_version_id === p.id && !!p.approved_at && !!e.created_at && e.created_at >= new Date(new Date(p.approved_at).getTime() - 5_000).toISOString();
  const existing = new Set(ex.list.filter((e) => !createdByThis(e)).map((e) => e.slug));
  const diff = base && base.id !== p.id ? diffPlans(base.content, p.content, names, existing) : [];
  const issues = validatePlanRules(p.content, ex.bySlug.keys());
  // stricter checks (lb ladder, duplicates, ±1 step, > 6 changes) — shown, never blocking: he decides
  const checks = p.status === 'draft' ? validateDraft(p.content, active?.content ?? null, ex.bySlug, { names }) : [];
  const compare = base && base.id !== p.id ? base : undefined;
  const sessions = sessionChanges(compare?.content ?? null, p.content, names, (slug) => p.content.exercise_upserts.find((e) => e.slug === slug)?.is_assisted ?? !!ex.bySlug.get(slug)?.is_assisted);
  const library = diff.filter((d) => d.kind === 'exercise_new' || d.kind === 'exercise_edit');
  const general = diff.filter((d) => d.kind === 'schedule' || d.kind === 'nutrition');
  const me = labels.label(p.id);
  const baseLabel = labels.label(compare?.id);
  const activeLabel = labels.label(active?.id);
  const staleLabel = labels.label(warn.staleBase);
  const newestLabel = labels.label(newestDraft?.id);
  const title = me ? t('Lộ trình {week}', { week: inlineTitle(me.title) }) : t('Lộ trình');
  const approveTitle = me ? t('Duyệt lộ trình {week}', { week: inlineTitle(me.title) }) : t('Duyệt lộ trình');

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const r = await approvePlan(p!.id, when === 'today' ? todayVN() : date);
      setResult(r === 'active' ? t('Đã duyệt — áp dụng từ hôm nay') : t('Đã duyệt — áp dụng từ {date}', { date: formatVN(date, true) }));
      setApproveOpen(false);
      await invalidate(qk.plans, qk.activePlan, qk.exercises);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function rejectOlderDrafts() {
    setBusy(true);
    setError(null);
    try {
      for (const d of warn.otherDrafts) await rejectPlan(d.id, 'Có bản nháp mới hơn'); // i18n-ignore: saved to the database as the reject reason
      await invalidate(qk.plans);
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
    <Page title={title} back="/more/plans">
      <Card>
        {me && <div className="mb-1 text-sm font-medium">{me.sub}</div>}
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} />
          <span className="text-sm text-muted">{CREATED_BY_LABEL[p.created_by]} · {formatVN(p.created_at.slice(0, 10), true)}</span>
        </div>
        <div className="text-sm text-muted">
          {p.effective_from ? `${t('Hiệu lực từ {date}', { date: formatVN(p.effective_from, true) })} · ` : ''}{t('Calo tham khảo')} {formatNumberVN(p.calories_kcal)} kcal
        </div>
        {p.change_note && (
          <div className="mt-3 rounded-lg bg-card-2 p-3 text-sm">
            <div className="mb-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{t('Lý do thay đổi')}</div>
            <NoteLines lines={noteToLines(p.change_note)} />
          </div>
        )}
        {p.rejected_reason && <Banner tone="bad">{t('Lý do từ chối:')} {p.rejected_reason}</Banner>}
        {p.status === 'draft' && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={() => setRejectOpen(true)}>{t('Từ chối')}</Button>
            <Button variant="ok" onClick={() => setApproveOpen(true)} disabled={issues.some((i) => i.level === 'error')}>{t('Duyệt')}</Button>
          </div>
        )}
      </Card>
      {result && <Banner tone="ok">{result}</Banner>}
      {warn.staleBase && (
        <Banner tone="warn">
          {t('Bản nháp này soạn trên {old}, nhưng lộ trình đang dùng đã là {active}. Thay đổi bên dưới so với lộ trình đang dùng — duyệt sẽ thay luôn những gì đã đổi sau đó.', {
            old: staleLabel ? inlineTitle(staleLabel.title) : t('lộ trình cũ'),
            active: activeLabel ? inlineTitle(activeLabel.title) : t('bản mới hơn'),
          })}
        </Banner>
      )}
      {warn.otherDrafts.length > 0 && warn.newest && (
        <Banner
          tone="warn"
          action={
            <Button size="sm" variant="danger" disabled={busy} onClick={() => void rejectOlderDrafts()}>
              {t('Từ chối bản cũ')}
            </Button>
          }
        >
          {t('Còn {n} bản nháp cũ hơn đang chờ — duyệt bản mới nhất này và từ chối bản cũ.', { n: warn.otherDrafts.length })}
        </Banner>
      )}
      {newestDraft && (
        <Banner tone="warn" onClick={() => nav(`/more/plans/${newestDraft.id}`)} action={<b>{t('Xem ›')}</b>}>
          {t('Đã có bản nháp mới hơn ({name}) — nên từ chối bản này.', { name: newestLabel ? inlineTitle(newestLabel.title) : t('bản mới') })}
        </Banner>
      )}
      {issues.filter((i) => i.level === 'error').map((i) => <Banner key={i.message} tone="bad">{i.message}</Banner>)}
      {checks.map((i) => <Banner key={i.message} tone="warn">⚠ {i.message}</Banner>)}
      {error ? <ErrorBox error={error} /> : null}
      {p.status === 'active' && <Button block className="mb-3" onClick={() => nav(`/more/plans/${p.id}/edit`)}>{t('Sửa → tạo bản mới cho tuần này')}</Button>}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'diff', label: baseLabel ? t('So với {plan}', { plan: inlineTitle(baseLabel.title) }) : t('Thay đổi') },
          { value: 'content', label: t('Toàn bộ lộ trình') },
        ]}
      />

      {tab === 'diff' ? (
        !compare ? (
          <Empty>{t('Lộ trình đầu tiên — xem tab “Toàn bộ lộ trình”')}</Empty>
        ) : diff.length === 0 && !sessions.some((x) => x.changed) ? (
          <Empty>{t('Không có thay đổi')}</Empty>
        ) : (
          <>
            <ChangeSummary sessions={sessions} library={library.length} />
            {general.length > 0 && (
              <Card>
                {general.map((d, i) => (
                  <div key={i} className="flex justify-between gap-3 border-b border-line py-1.5 text-sm last:border-0">
                    <span className="text-muted">{d.scope}</span>
                    <span className="text-right font-medium">{d.text}{d.warning && <span className="block text-bad">{d.warning}</span>}</span>
                  </div>
                ))}
              </Card>
            )}
            {sessions.map((sv) => (
              <SessionChanges key={sv.key} sv={sv} ex={ex.bySlug} content={p.content} names={names} />
            ))}
            {library.length > 0 && (
              <Card>
                <button type="button" className="flex w-full items-center justify-between text-left" onClick={() => setLibOpen((v) => !v)}>
                  <span>
                    <span className="font-semibold">{t('Thư viện bài tập')}</span>
                    <span className="block text-sm text-muted">
                      {t('{added} bài mới · {edited} bài cập nhật', { added: library.filter((d) => d.kind === 'exercise_new').length, edited: library.filter((d) => d.kind === 'exercise_edit').length })}
                    </span>
                  </span>
                  <span className="text-sm text-accent">{libOpen ? t('Thu gọn') : t('Xem')}</span>
                </button>
                {libOpen && (
                  <div className="mt-3 divide-y divide-line">
                    {library.map((d) => (
                      <div key={d.slug} className="flex items-center gap-3 py-2 text-sm">
                        <ExerciseImg svg={p.content.exercise_upserts.find((e) => e.slug === d.slug)?.illustration_svg ?? ex.bySlug.get(d.slug ?? '')?.illustration_svg} name={d.text} className="w-16 shrink-0" />
                        <span className="min-w-0 flex-1">{names(d.slug ?? '')}</span>
                        <Badge tone={d.kind === 'exercise_new' ? 'accent' : 'muted'}>{d.kind === 'exercise_new' ? t('Mới') : t('Cập nhật')}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </>
        )
      ) : (
        <>
          <SectionTitle>{t('Lịch tuần')}</SectionTitle>
          <Card>
            {WEEKDAYS.map((d) => {
              const day = p.content.schedule[d];
              return (
                <div key={d} className="flex justify-between border-b border-line py-1.5 text-sm last:border-0">
                  <span className="text-muted">{WEEKDAY_LABEL[d]}</span>
                  <span className="font-medium">
                    {day.kind === 'session' ? p.content.templates.find((tpl) => tpl.key === day.template)?.name : day.kind === 'rest' ? t('Nghỉ') : day.kind === 'badminton' ? t('Cầu lông') : t('Tuỳ chọn')}
                  </span>
                </div>
              );
            })}
          </Card>
          {p.content.templates.map((tpl) => (
            <div key={tpl.key}>
              <SectionTitle>{tpl.name}</SectionTitle>
              <Card>
                {tpl.warmup.cardio && <p className="mb-1 text-sm text-muted">{t('Khởi động:')} {names(tpl.warmup.cardio.exercise)} {tpl.warmup.cardio.minutes}′ · {tpl.warmup.mobility.join(' · ')}</p>}
                <div className="divide-y divide-line">
                  {tpl.items.map((it) => (
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
            {t('Tham khảo:')} {formatNumberVN(p.content.nutrition.calories_kcal)} kcal · P {p.content.nutrition.protein_g}g · C {p.content.nutrition.carb_g}g · F {p.content.nutrition.fat_g}g
          </p>
        </>
      )}

      <Sheet open={approveOpen} onClose={() => setApproveOpen(false)} title={approveTitle}>
        <div className="mb-3 flex gap-2">
          <Chip active={when === 'today'} onClick={() => setWhen('today')}>{t('Áp dụng hôm nay')}</Chip>
          <Chip active={when === 'date'} onClick={() => setWhen('date')}>{t('Chọn ngày')}</Chip>
        </div>
        {when === 'date' && (
          <Field label={t('Áp dụng từ ngày')}>
            <Input type="date" min={addDays(todayVN(), 1)} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        )}
        <p className="mb-3 text-sm text-muted">
          {active ? `${t('Lộ trình đang dùng ({plan}) chuyển sang lưu trữ', { plan: activeLabel ? inlineTitle(activeLabel.title) : t('bản cũ') })} ` : ''}
          {when === 'today' ? t('ngay bây giờ.') : t('vào ngày đã chọn (tự động lúc 00:05).')}
          {p.content.exercise_upserts.length > 0 && <> {t('Thư viện được cập nhật {n} bài.', { n: p.content.exercise_upserts.length })}</>}
        </p>
        <Button variant="ok" size="lg" block disabled={busy} onClick={() => void approve()}>
          {busy ? t('Đang duyệt…') : t('Duyệt')}
        </Button>
      </Sheet>

      <Sheet open={rejectOpen} onClose={() => setRejectOpen(false)} title={t('Từ chối lộ trình')}>
        <Field label={t('Lý do (để Claude biết lần sau)')}>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('vd. chưa muốn đổi bài chính')} />
        </Field>
        <Badge tone="muted">{t('Bản bị từ chối vẫn được lưu để xem lại')}</Badge>
        <Button variant="danger" size="lg" block className="mt-3" disabled={busy} onClick={() => void reject()}>{t('Từ chối')}</Button>
      </Sheet>
    </Page>
  );
}

function ChangeSummary({ sessions, library }: { sessions: SessionView[]; library: number }) {
  const items = sessions.flatMap((x) => x.items);
  const kg = items.flatMap((i) => i.changes.filter((c) => c.kind === 'target_kg'));
  const added = items.filter((i) => i.status === 'new').length;
  const replaced = items.filter((i) => i.status === 'replaced').length;
  const removed = sessions.reduce((n, x) => n + x.removed.length, 0);
  const up = kg.filter((c) => c.dir === 'up').length;
  const down = kg.filter((c) => c.dir === 'down').length;
  const parts: [number, 'ok' | 'warn' | 'muted', string][] = [
    [added, 'muted', t('{n} bài mới', { n: added })],
    [replaced, 'muted', t('{n} bài thay', { n: replaced })],
    [removed, 'muted', t('{n} bài bỏ', { n: removed })],
    [up, 'ok', t('{n} tăng tạ', { n: up })],
    [down, 'warn', t('{n} giảm tạ', { n: down })],
    [library, 'muted', t('{n} cập nhật thư viện', { n: library })],
  ];
  return (
    <div className="mb-3 flex flex-wrap gap-1.5 px-1">
      {parts.filter(([n]) => n > 0).map(([, tone, text]) => (
        <Badge key={text} tone={tone}>{text}</Badge>
      ))}
    </div>
  );
}

const STATUS_TAG: Record<SessionItemView['status'], { label: string; tone: 'accent' | 'info' } | null> = {
  new: { label: t('Mới'), tone: 'accent' },
  replaced: { label: t('Thay'), tone: 'info' },
  kept: null,
};

/** One session: every exercise in order, what changed highlighted, unchanged ones dimmed. */
function SessionChanges({ sv, ex, content, names }: { sv: SessionView; ex: Map<string, ExerciseRow>; content: PlanContent; names: (s: string) => string }) {
  if (!sv.changed) {
    return <p className="mb-3 px-1 text-sm text-muted"><b className="text-fg">{sv.name}</b> · {t('giữ nguyên')}</p>;
  }
  return (
    <>
      <SectionTitle>{sv.name}</SectionTitle>
      <Card>
        {sv.warmup && <p className="mb-2 text-sm text-muted">{t('Khởi động mới:')} {sv.warmup}</p>}
        <div className="divide-y divide-line">
          {sv.items.map((v) => {
            const tag = STATUS_TAG[v.status];
            const touched = v.status !== 'kept' || v.changes.length > 0 || v.noteChanged;
            const e = ex.get(v.item.exercise);
            const svg = e?.illustration_svg ?? content.exercise_upserts.find((u) => u.slug === v.item.exercise)?.illustration_svg;
            return (
              <div key={v.item.exercise} className={cx('flex gap-3 py-2.5', !touched && 'opacity-55')}>
                {touched ? <ExerciseImg svg={svg} name={names(v.item.exercise)} className="w-16 shrink-0 self-start" /> : <span className="w-16 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <span className="min-w-0 flex-1 font-medium">{names(v.item.exercise)}</span>
                    {tag && <Badge tone={tag.tone}>{tag.label}</Badge>}
                  </div>
                  {v.from && <div className="text-xs text-muted">{t('thay {name}', { name: names(v.from) })}</div>}
                  <div className="tabular text-sm text-muted">{itemSummary(v.item)}{v.item.target_kg === null && v.item.unit === 'reps' ? ` · ${t('tự chọn mức')}` : ''}</div>
                  {v.changes.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {v.changes.map((c, i) => (
                        <Badge key={i} tone={c.dir === 'up' ? 'ok' : c.dir === 'down' ? 'warn' : 'muted'}>
                          {c.dir === 'up' ? '↑ ' : c.dir === 'down' ? '↓ ' : ''}{c.text}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {v.item.coach_note && touched && <p className="mt-1 text-xs text-info">“{v.item.coach_note}”</p>}
                </div>
              </div>
            );
          })}
        </div>
        {sv.removed.length > 0 && (
          <p className="mt-2 border-t border-line pt-2 text-sm text-muted">
            {t('Bỏ:')} {sv.removed.map((s, i) => <span key={s}>{i > 0 && ', '}<span className="line-through">{names(s)}</span></span>)}
          </p>
        )}
        {sv.reordered && <p className="mt-1 text-xs text-muted">{t('Đã đổi thứ tự bài')}</p>}
      </Card>
    </>
  );
}
