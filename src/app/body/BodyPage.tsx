import { useState } from 'react';
import { useNavigate } from 'react-router';
import { createDraft, deleteWeight, saveWeight } from '@/data/api';
import { qk, useActivePlan, useGoals, useInvalidate, useMeasurements, usePlans, useWeights } from '@/data/queries';
import { MEASUREMENT_FIELDS, type MeasurementKey, whr, WHR_MALE_THRESHOLD } from '@/engine/body';
import { addDays, diffDays, formatVN, type IsoDate, todayVN, weekStart } from '@/engine/dates';
import { formatNumberVN, round } from '@/engine/math';
import { lossRateVerdict, stallSuggestion, weeklyWeights, weeksWithoutLoss } from '@/engine/weight';
import { SimpleLine } from '@/ui/charts';
import { Badge, Banner, Button, Card, Empty, Field, Input, Page, SectionTitle, Segmented, Spinner } from '@/ui/components';

/** điểm bắt đầu đường mục tiêu: lần cân InBody 26/10/2026 */
const START: { date: IsoDate; kg: number } = { date: '2026-10-26', kg: 81.7 };

export function BodyPage() {
  const nav = useNavigate();
  const invalidate = useInvalidate();
  const weights = useWeights();
  const measurements = useMeasurements();
  const goals = useGoals();
  const plan = useActivePlan();
  const plans = usePlans();
  const [tab, setTab] = useState<'weight' | 'measure'>('weight');
  const [range, setRange] = useState<'4' | '8'>('8');
  const [date, setDate] = useState(todayVN());
  const [kg, setKg] = useState('');
  const [note, setNote] = useState('');
  const [showMeasure, setShowMeasure] = useState(false);
  const [m, setM] = useState<Partial<Record<MeasurementKey, string>>>({});
  const [field, setField] = useState<MeasurementKey>('waist_navel_cm');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (weights.isLoading || measurements.isLoading) return <Page title="Cơ thể"><Spinner /></Page>;
  const logs = weights.data ?? [];
  const meas = measurements.data ?? [];
  const lastMeas = meas.at(-1);
  const weeks = weeklyWeights(logs);
  const stall = weeksWithoutLoss(weeks);
  const thisWeek = weeks.at(-1);
  const prevWeek = weeks.at(-2);
  const delta = thisWeek && prevWeek ? round(thisWeek.last - prevWeek.last, 1) : null;
  const pendingDraft = (plans.data ?? []).some((p) => p.status === 'draft');

  // đường mục tiêu: nội suy tuyến tính start → các mốc
  const anchors = [START, ...(goals.data ?? []).map((g) => ({ date: g.target_date, kg: g.target_weight_max }))];
  const targetAt = (d: IsoDate): number | null => {
    for (let i = 0; i < anchors.length - 1; i++) {
      const a = anchors[i];
      const b = anchors[i + 1];
      if (d >= a.date && d <= b.date) return round(a.kg + ((b.kg - a.kg) * diffDays(a.date, d)) / diffDays(a.date, b.date), 1);
    }
    return null;
  };
  const from = addDays(weekStart(todayVN()), -7 * (Number(range) - 1));
  const chart = logs
    .filter((l) => l.log_date >= from)
    .map((l) => ({ label: formatVN(l.log_date), kg: l.weight_kg, target: targetAt(l.log_date) }));

  async function save() {
    const w = Number(kg.replace(',', '.'));
    if (!w) return;
    setBusy(true);
    const measurementsNum = Object.fromEntries(
      MEASUREMENT_FIELDS.map(([k]) => [k, m[k] ? Number(m[k]!.replace(',', '.')) || null : null]),
    );
    await saveWeight({ date, weightKg: w, note: note.trim() || null, measurements: measurementsNum });
    await invalidate(qk.weights, qk.measurements);
    setKg('');
    setNote('');
    setM({});
    setShowMeasure(false);
    setBusy(false);
    setMsg('Đã lưu');
  }

  async function proposeDraft() {
    if (!plan.data) return;
    const s = stallSuggestion(plan.data.content.nutrition.calories_kcal);
    const content = structuredClone(plan.data.content);
    content.nutrition.calories_kcal = s.newCalories;
    content.nutrition.carb_g = Math.max(100, content.nutrition.carb_g - Math.round(s.reduction / 4));
    const id = await createDraft({
      content,
      basedOn: plan.data.id,
      createdBy: 'system',
      changeNote: `Cân không giảm ${stall} tuần liên tiếp → hạ calo tham khảo ${s.reduction} kcal (giảm carb, giữ đạm). Gợi ý thực tế: ${s.tips.join('; ')}.`,
    });
    await invalidate(qk.plans);
    nav(`/more/plans/${id}`);
  }

  const measChart = meas
    .filter((x) => x.log_date >= from && x[field] !== null)
    .map((x) => ({ label: formatVN(x.log_date), v: x[field] as number }));
  const lastWhr = lastMeas ? whr(lastMeas as never) : null;

  return (
    <Page title="Cơ thể">
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Button onClick={() => nav('/body/inbody')}>InBody</Button>
        <Button onClick={() => nav('/body/photos')}>Ảnh tiến độ</Button>
      </div>

      <Card>
        <div className="mb-2 font-semibold">Cân hằng tuần</div>
        <p className="mb-3 text-xs text-muted">Khuyến nghị: sáng thứ Hai, sau khi đi vệ sinh, trước khi ăn uống.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ngày">
            <Input type="date" value={date} max={todayVN()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Cân nặng (kg)">
            <Input inputMode="decimal" placeholder={logs.at(-1) ? String(logs.at(-1)!.weight_kg).replace('.', ',') : '81,7'} value={kg} onChange={(e) => setKg(e.target.value)} />
          </Field>
        </div>
        <button className="mb-2 text-sm font-medium text-accent" onClick={() => setShowMeasure((v) => !v)}>
          {showMeasure ? '▾' : '▸'} Số đo cơ thể (tuỳ chọn, cm)
        </button>
        {showMeasure && (
          <div className="grid grid-cols-2 gap-x-3">
            {MEASUREMENT_FIELDS.map(([k, label]) => (
              <Field key={k} label={label}>
                <Input
                  inputMode="decimal"
                  placeholder={lastMeas?.[k] != null ? String(lastMeas[k]).replace('.', ',') : '—'}
                  value={m[k] ?? ''}
                  onChange={(e) => setM({ ...m, [k]: e.target.value })}
                />
              </Field>
            ))}
          </div>
        )}
        <Field label="Ghi chú">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        {msg && <Banner tone="ok">{msg}</Banner>}
        <Button variant="primary" block disabled={busy || !kg} onClick={() => void save()}>Lưu</Button>
      </Card>

      {thisWeek && (
        <Card>
          <div className="mb-1 font-semibold">Tuần {formatVN(thisWeek.weekStart)}</div>
          <div className="tabular text-sm">
            Đầu tuần {formatNumberVN(thisWeek.first, 1)} kg · cuối tuần {formatNumberVN(thisWeek.last, 1)} kg
            {delta !== null && (
              <>
                {' '}· so tuần trước <b>{delta > 0 ? '+' : ''}{formatNumberVN(delta, 1)} kg</b>{' '}
                <Badge tone={lossRateVerdict(delta) === 'ok' ? 'ok' : 'warn'}>
                  {lossRateVerdict(delta) === 'ok' ? 'đúng nhịp 0,5–0,7' : lossRateVerdict(delta) === 'slow' ? 'chậm' : 'nhanh quá — cân nhắc ăn thêm'}
                </Badge>
              </>
            )}
          </div>
        </Card>
      )}

      {stall >= 2 && plan.data && (
        <Banner tone="warn">
          Cân không giảm {stall} tuần liên tiếp. {stallSuggestion(plan.data.content.nutrition.calories_kcal).tips.join(' · ')}
          <div className="mt-2">
            <Button size="sm" variant="primary" disabled={pendingDraft} onClick={() => void proposeDraft()}>
              {pendingDraft ? 'Đã có draft chờ duyệt' : 'Tạo đề xuất (draft)'}
            </Button>
          </div>
        </Banner>
      )}

      <Segmented value={tab} onChange={setTab} options={[{ value: 'weight', label: 'Cân nặng' }, { value: 'measure', label: 'Số đo' }]} />
      <Segmented value={range} onChange={setRange} options={[{ value: '4', label: '4 tuần' }, { value: '8', label: '8 tuần' }]} />

      {tab === 'weight' ? (
        <Card>
          {chart.length ? (
            <SimpleLine data={chart} lines={[{ key: 'kg', name: 'Cân nặng' }, { key: 'target', name: 'Mục tiêu', color: 'var(--ok)', dashed: true }]} unit="" />
          ) : (
            <Empty>Chưa có số cân trong khoảng này</Empty>
          )}
        </Card>
      ) : (
        <Card>
          <select aria-label="Chọn số đo" className="mb-3 h-11 w-full rounded-xl border border-line bg-card px-3" value={field} onChange={(e) => setField(e.target.value as MeasurementKey)}>
            {MEASUREMENT_FIELDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {measChart.length ? <SimpleLine data={measChart} lines={[{ key: 'v', name: 'cm' }]} /> : <Empty>Chưa có số đo này</Empty>}
          {lastWhr !== null && (
            <p className="mt-2 text-sm">
              WHR (eo/hông) gần nhất: <b>{formatNumberVN(lastWhr, 2)}</b>{' '}
              <Badge tone={lastWhr < WHR_MALE_THRESHOLD ? 'ok' : 'warn'}>tham khảo nam &lt; 0,90</Badge>
            </p>
          )}
        </Card>
      )}

      <SectionTitle>Lịch sử cân</SectionTitle>
      {[...logs].reverse().map((l) => (
        <div key={l.id} className="tabular flex items-center justify-between border-b border-line py-2 text-sm">
          <span>{formatVN(l.log_date, true)}{l.note ? <span className="text-muted"> · {l.note}</span> : null}</span>
          <span className="flex items-center gap-3">
            <b>{formatNumberVN(l.weight_kg, 1)} kg</b>
            <button aria-label="Xoá" className="text-muted" onClick={async () => { await deleteWeight(l.id); await invalidate(qk.weights, qk.measurements); }}>✕</button>
          </span>
        </div>
      ))}
    </Page>
  );
}
