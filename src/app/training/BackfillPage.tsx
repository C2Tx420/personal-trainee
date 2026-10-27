import { useState } from 'react';
import { useNavigate } from 'react-router';
import { qk, useActivePlan, useExerciseMaps, useInvalidate } from '@/data/queries';
import { todayVN } from '@/engine/dates';
import { SESSION_KIND_LABEL, SESSION_KINDS, type SessionKind, templateForKind } from '@/engine/schedule';
import { plannedSets } from '@/engine/warmup';
import { Button, Card, ErrorBox, Field, Input, Page } from '@/ui/components';
import { type EditorItem, newKey, SessionEditor } from './SessionEditor';
import { saveEditor } from './save-editor';

/** + Ghi bù buổi đã tập: chọn ngày + loại buổi, điền hiệp, không có đồng hồ. */
export function BackfillPage() {
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const ex = useExerciseMaps();
  const plan = useActivePlan();
  const [date, setDate] = useState(todayVN());
  const [kind, setKind] = useState<SessionKind>('push');
  const [warmupMin, setWarmupMin] = useState('10');
  const [items, setItems] = useState<EditorItem[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

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
          sets: plannedSets(it, e?.load_step_kg ?? 2.5, null).map((p) => ({
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
      const id = await saveEditor({
        date,
        kind,
        items,
        warmup: mins > 0 ? { cardio: { exercise: 'treadmill_walk', minutes: mins, speed_kmh_min: null, speed_kmh_max: null, done: true }, mobility_done: null } : { cardio: null, mobility_done: false, skipped: true },
        note: 'Ghi bù',
        content: plan.data?.content ?? null,
        planVersionId: null,
      });
      await invalidate(qk.training, qk.exercises);
      nav(`/training/session/${id}`, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="+ Ghi bù buổi đã tập" back="/training">
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày">
            <Input type="date" value={date} max={todayVN()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Loại buổi">
            <select className="h-11 w-full rounded-xl border border-line bg-card px-3" value={kind} onChange={(e) => setKind(e.target.value as SessionKind)}>
              {SESSION_KINDS.filter((k) => !['badminton', 'walk', 'zone2', 'core'].includes(k)).map((k) => (
                <option key={k} value={k}>{SESSION_KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Khởi động (phút đi bộ, 0 = không)">
          <Input inputMode="numeric" value={warmupMin} onChange={(e) => setWarmupMin(e.target.value)} />
        </Field>
        <Button block onClick={fromTemplate}>Điền theo lộ trình {SESSION_KIND_LABEL[kind]}</Button>
      </Card>
      <SessionEditor items={items} onChange={setItems} library={ex.list} />
      {error ? <ErrorBox error={error} /> : null}
      <Button variant="primary" size="lg" block className="mt-3" disabled={busy || items.length === 0} onClick={() => void save()}>
        {busy ? 'Đang lưu…' : 'Lưu buổi ghi bù'}
      </Button>
    </Page>
  );
}
