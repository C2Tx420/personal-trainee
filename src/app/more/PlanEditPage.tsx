import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { approvePlan, createDraft } from '@/data/api';
import { qk, useExerciseMaps, useInvalidate, usePlans } from '@/data/queries';
import { todayVN } from '@/engine/dates';
import { type PlanContent, planContentSchema, validatePlanRules } from '@/engine/plan-schema';
import { Banner, Button, Card, ErrorBox, ExerciseImg, Field, Input, Page, SectionTitle, Spinner } from '@/ui/components';
import { ExercisePicker, type PickResult } from '../workout/ExercisePicker';

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

/** Self-edit the plan → "Lưu & áp dụng" creates a new version (§4.5). */
export function PlanEditPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const plans = usePlans();
  const ex = useExerciseMaps();
  const base = plans.data?.find((p) => p.id === id);
  const [content, setContent] = useState<PlanContent | null>(null);
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState<{ t: number; pick: PickResult | null } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (plans.isLoading || ex.loading) return <Page title="Sửa lộ trình" back={`/more/plans/${id}`}><Spinner /></Page>;
  if (!base) return <Page title="Sửa lộ trình" back="/more/plans"><ErrorBox error="Không tìm thấy" /></Page>;
  const c = content ?? structuredClone(base.content);
  const set = (fn: (d: PlanContent) => void) => {
    const d = structuredClone(c);
    fn(d);
    setContent(d);
  };
  const issues = validatePlanRules(c, ex.bySlug.keys());

  async function save(apply: boolean) {
    setBusy(true);
    setError(null);
    try {
      const parsed = planContentSchema.parse(c);
      if (note.trim().length < 5) throw new Error('Ghi chú thay đổi cần ít nhất 5 ký tự');
      const newId = await createDraft({ content: parsed, changeNote: note.trim(), basedOn: base!.id });
      if (apply) await approvePlan(newId, todayVN());
      await invalidate(qk.plans, qk.activePlan);
      nav(`/more/plans/${newId}`, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title={`Sửa từ v${base.version_no}`} back={`/more/plans/${id}`}>
      <Card>
        <Field label="Calo tham khảo (≥ 1.700)">
          <Input inputMode="numeric" value={c.nutrition.calories_kcal} onChange={(e) => set((d) => (d.nutrition.calories_kcal = Number(e.target.value) || 0))} />
        </Field>
      </Card>
      {c.templates.map((t, ti) => (
        <div key={t.key}>
          <SectionTitle>{t.name}</SectionTitle>
          {t.items.map((it, ii) => {
            const e = ex.bySlug.get(it.exercise);
            return (
              <Card key={it.exercise}>
                <div className="mb-2 flex items-center gap-2">
                  <ExerciseImg svg={e?.illustration_svg} name={e?.name_vi ?? ''} className="w-16 shrink-0" />
                  <div className="min-w-0 flex-1 font-semibold">{e?.name_vi ?? it.exercise}</div>
                  <Button size="sm" variant="ghost" aria-label="Lên" disabled={ii === 0} onClick={() => set((d) => { const a = d.templates[ti].items; [a[ii - 1], a[ii]] = [a[ii], a[ii - 1]]; })}>↑</Button>
                  <Button size="sm" variant="ghost" aria-label="Xuống" disabled={ii === t.items.length - 1} onClick={() => set((d) => { const a = d.templates[ti].items; [a[ii + 1], a[ii]] = [a[ii], a[ii + 1]]; })}>↓</Button>
                  <Button size="sm" variant="ghost" aria-label="Bỏ bài" onClick={() => set((d) => void d.templates[ti].items.splice(ii, 1))}>✕</Button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <Field label="Hiệp"><Input inputMode="numeric" value={it.sets} onChange={(ev) => set((d) => (d.templates[ti].items[ii].sets = Math.max(1, Number(ev.target.value) || 1)))} /></Field>
                  <Field label="Lần từ"><Input inputMode="numeric" value={it.rep_min} onChange={(ev) => set((d) => (d.templates[ti].items[ii].rep_min = Number(ev.target.value) || 1))} /></Field>
                  <Field label="đến"><Input inputMode="numeric" value={it.rep_max} onChange={(ev) => set((d) => (d.templates[ti].items[ii].rep_max = Number(ev.target.value) || 1))} /></Field>
                  <Field label="kg"><Input inputMode="decimal" value={it.target_kg ?? ''} onChange={(ev) => set((d) => (d.templates[ti].items[ii].target_kg = num(ev.target.value)))} /></Field>
                </div>
              </Card>
            );
          })}
          {adding?.t === ti ? (
            <Card>
              <ExercisePicker label="Thêm bài" library={ex.list} quick={[]} value={adding.pick} onChange={(p) => setAdding({ t: ti, pick: p })} />
              <Button
                className="mt-2"
                block
                disabled={!adding.pick || !('exercise' in adding.pick)}
                onClick={() => {
                  const pick = adding.pick;
                  if (!pick || !('exercise' in pick)) return;
                  set((d) =>
                    void d.templates[ti].items.push({
                      exercise: pick.exercise.slug, alternatives: [], sets: 3, warmup_sets: [], rep_min: 10, rep_max: 12,
                      unit: pick.exercise.is_time_based ? 'seconds' : 'reps', rest_sec_min: 60, rest_sec_max: 90,
                      target_kg: null, target_kg_per_set: null, coach_note: '', note: '',
                    }),
                  );
                  setAdding(null);
                }}
              >
                Thêm vào {t.name}
              </Button>
            </Card>
          ) : (
            <Button block className="mb-3" onClick={() => setAdding({ t: ti, pick: null })}>+ Thêm bài vào {t.name}</Button>
          )}
        </div>
      ))}
      {issues.filter((i) => i.level === 'error').map((i) => <Banner key={i.message} tone="bad">{i.message}</Banner>)}
      <Field label="Ghi chú thay đổi (bắt buộc)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="vd. đổi máy chèo sang tạ đơn vì máy hay bận" />
      </Field>
      {error ? <ErrorBox error={error} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={busy} onClick={() => void save(false)}>Lưu nháp</Button>
        <Button variant="primary" disabled={busy} onClick={() => void save(true)}>Lưu & áp dụng</Button>
      </div>
    </Page>
  );
}
