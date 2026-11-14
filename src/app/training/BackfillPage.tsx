import { useState } from 'react';
import { skipScheduledDay } from '@/data/api';
import { useNavigate } from 'react-router';
import { qk, useActivePlan, useExerciseMaps, useInvalidate, useTraining } from '@/data/queries';
import { formatVN, todayVN } from '@/engine/dates';
import { BADMINTON_SUBSTITUTES, liftOptionsFor, replacedNote, scheduledOpenOn, SESSION_KIND_LABEL, SESSION_KINDS, type SessionKind, templateForKind } from '@/engine/schedule';
import { plannedSets } from '@/engine/warmup';
import { Button, Card, ErrorBox, Field, Input, Page } from '@/ui/components';
import { type EditorItem, newKey, SessionEditor } from './SessionEditor';
import { saveEditor } from './save-editor';
import { t } from '@/i18n';

/** + Backfill a past session: pick date + session type, fill in sets, no timers. */
export function BackfillPage() {
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const ex = useExerciseMaps();
  const training = useTraining();
  const plan = useActivePlan();
  const [date, setDate] = useState(todayVN());
  const [kind, setKind] = useState<SessionKind>('push');
  const [warmupMin, setWarmupMin] = useState('10');
  const [items, setItems] = useState<EditorItem[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [replaceScheduled, setReplaceScheduled] = useState(true);

  const sessions = training.data?.sessions ?? [];
  const open = plan.data ? scheduledOpenOn(plan.data.content, date, sessions.map((s) => ({ date: s.session_date, kind: s.kind }))) : null;
  const scheduled = open !== kind ? open : null;
  const canReplace =
    !!scheduled &&
    liftOptionsFor(
      plan.data!.content,
      date,
      todayVN(),
      sessions.filter((s) => s.status === 'completed').map((s) => ({ date: s.session_date, kind: s.kind })),
    ).includes(kind);
  const replaces = canReplace && replaceScheduled;

  function fromTemplate() {
    if (!plan.data) return;
    const tmpl = templateForKind(plan.data.content, kind);
    if (!tmpl) return setItems([]);
    setItems(
      tmpl.items.map((it, i) => {
        const e = ex.bySlug.get(it.exercise);
        return {
          key: newKey(),
          rawName: null,
          pick: e ? { exercise: e } : null,
          templateItemPosition: i,
          note: '',
          sets: plannedSets(it, e?.load_step_kg ?? 2.5, null, !!e?.is_assisted).map((p) => ({
            key: newKey(),
            set_type: p.setType,
            kg: p.targetKg,
            reps: it.unit === 'seconds' ? null : p.repMax,
            seconds: it.unit === 'seconds' ? p.repMax : null,
          })),
        };
      }),
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const mins = Number(warmupMin) || 0;
      if (replaces && scheduled) await skipScheduledDay({ date, kind: scheduled, note: replacedNote(scheduled, kind) });
      const id = await saveEditor({
        date,
        kind,
        items,
        warmup: mins > 0 ? { cardio: { exercise: 'treadmill_walk', minutes: mins, speed_kmh_min: null, speed_kmh_max: null, done: true }, mobility_done: null } : { cardio: null, mobility_done: false, skipped: true },
        note: 'Ghi bù', // i18n-ignore: saved to the database
        content: plan.data?.content ?? null,
        planVersionId: null,
      });
      await invalidate(qk.training, qk.exercises);
      nav(`/training/session/${id}`, { replace: true });
    } catch (e) {
      await invalidate(qk.training);
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title={t('+ Ghi bù buổi đã tập')} back="/training">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('Ngày')}>
            <Input type="date" value={date} max={todayVN()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('Loại buổi')}>
            <select className="h-11 w-full rounded-xl border border-line bg-card px-3" value={kind} onChange={(e) => setKind(e.target.value as SessionKind)}>
              {SESSION_KINDS.filter((k) => !['badminton', 'walk', 'zone2', 'core'].includes(k)).map((k) => (
                <option key={k} value={k}>{SESSION_KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>
        </div>
        {scheduled && (
          <div className="glass-subtle rounded-ctl mb-3 p-3 text-sm" data-testid="backfill-replace">
            <p className="mb-2">
              {t('{date} theo lịch là {kind}, chưa ghi gì.', { date: formatVN(date), kind: SESSION_KIND_LABEL[scheduled] })}
              {scheduled === 'badminton' && ` ${t('Không đánh thì thay bằng cardio nhẹ:')}`}
            </p>
            {scheduled === 'badminton' && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                {BADMINTON_SUBSTITUTES.map((k) => (
                  <Button key={k} size="sm" onClick={() => nav(`/training/simple/${k}?thay=badminton&ngay=${date}`)}>{SESSION_KIND_LABEL[k]}</Button>
                ))}
              </div>
            )}
            {!canReplace ? (
              kind === 'legs' && <p className="text-xs text-muted">{t('Legs không thay được buổi ngày này (sát ngày cầu lông hoặc Chủ nhật) — buổi này ghi riêng.')}</p>
            ) : (
              <label className="flex items-center gap-2">
                <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={replaceScheduled} onChange={(e) => setReplaceScheduled(e.target.checked)} />
                {scheduled === 'badminton'
                  ? t('Hoặc: buổi {kind} này thay {scheduled} (ghi {scheduled} là nghỉ)', { kind: SESSION_KIND_LABEL[kind], scheduled: SESSION_KIND_LABEL[scheduled] })
                  : t('Buổi {kind} này thay {scheduled} (ghi {scheduled} là nghỉ)', { kind: SESSION_KIND_LABEL[kind], scheduled: SESSION_KIND_LABEL[scheduled] })}
              </label>
            )}
          </div>
        )}
        <Field label={t('Khởi động (phút đi bộ, 0 = không)')}>
          <Input inputMode="numeric" value={warmupMin} onChange={(e) => setWarmupMin(e.target.value)} />
        </Field>
        <Button block onClick={fromTemplate}>{t('Điền theo lộ trình {kind}', { kind: SESSION_KIND_LABEL[kind] })}</Button>
      </Card>
      <SessionEditor items={items} onChange={setItems} library={ex.list} history={training.data?.sets} />
      {error ? <ErrorBox error={error} /> : null}
      <Button variant="primary" size="lg" block className="mt-3" disabled={busy || items.length === 0} onClick={() => void save()}>
        {busy ? t('Đang lưu…') : t('Lưu buổi ghi bù')}
      </Button>
    </Page>
  );
}
