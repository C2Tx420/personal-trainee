import { useState } from 'react';
import { saveInbody } from '@/data/api';
import { qk, useGoals, useInbody, useInvalidate } from '@/data/queries';
import { formatVN, todayVN } from '@/engine/dates';
import { estimateBodyFatPct } from '@/engine/goals';
import { compareInbody, fatMassKg, inbodyDue, latestFfm } from '@/engine/inbody';
import { formatNumberVN } from '@/engine/math';
import { SimpleLine } from '@/ui/charts';
import { Badge, Banner, Button, Card, Field, Input, Page, SectionTitle, Skeleton } from '@/ui/components';

const FIELDS = [
  ['weight_kg', 'Cân nặng (kg)'],
  ['smm_kg', 'SMM — cơ xương (kg)'],
  ['pbf_pct', 'PBF — % mỡ'],
  ['visceral_fat_level', 'Mỡ nội tạng'],
  ['whr', 'WHR'],
  ['ffm_kg', 'FFM — khối nạc (kg)'],
  ['bmr_kcal', 'BMR (kcal)'],
  ['inbody_score', 'Điểm InBody'],
] as const;

export function InbodyPage() {
  const inbody = useInbody();
  const goals = useGoals();
  const invalidate = useInvalidate();
  const [date, setDate] = useState(todayVN());
  const [vals, setVals] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (inbody.isLoading) return <Page title="InBody" back="/body"><Skeleton /></Page>;
  const logs = inbody.data ?? [];
  const latest = logs.at(-1);
  const prev = logs.at(-2);
  const due = inbodyDue(latest?.measured_on ?? null, todayVN());
  const ffm = latestFfm(logs);
  const d = latest && prev ? compareInbody(prev, latest) : null;
  const n = (k: string) => (vals[k] ? Number(vals[k].replace(',', '.')) : null);

  async function save() {
    if (!n('weight_kg')) return;
    setBusy(true);
    await saveInbody({
      measured_on: date,
      weight_kg: n('weight_kg')!,
      smm_kg: n('smm_kg'),
      pbf_pct: n('pbf_pct'),
      visceral_fat_level: n('visceral_fat_level'),
      whr: n('whr'),
      ffm_kg: n('ffm_kg'),
      bmr_kcal: n('bmr_kcal'),
      inbody_score: n('inbody_score'),
    });
    await invalidate(qk.inbody);
    setVals({});
    setBusy(false);
  }

  const delta = (v: number | null, goodWhenDown: boolean, unit: string) =>
    v === null ? '—' : <Badge tone={v === 0 ? 'muted' : (v < 0) === goodWhenDown ? 'ok' : 'bad'}>{v > 0 ? '+' : ''}{formatNumberVN(v, 1)}{unit}</Badge>;

  return (
    <Page title="InBody hằng tháng" back="/body">
      {due.due ? (
        <Banner tone="info">Đến hạn đo InBody{due.daysSince !== null ? ` — đã ${due.daysSince} ngày từ lần trước` : ''}</Banner>
      ) : (
        <p className="mb-3 text-sm text-muted">Lần đo gần nhất {formatVN(latest!.measured_on, true)} · đo lại sau {30 - (due.daysSince ?? 0)} ngày nữa</p>
      )}

      {latest && (
        <Card>
          <div className="mb-2 font-semibold">Lần gần nhất · {formatVN(latest.measured_on, true)}</div>
          <div className="tabular grid grid-cols-2 gap-y-1 text-sm">
            {FIELDS.map(([k, l]) => (
              <div key={k} className="contents">
                <span className="text-muted">{l}</span>
                <span className="text-right font-semibold">{latest[k] === null ? '—' : formatNumberVN(latest[k] as number, 1)}</span>
              </div>
            ))}
            <span className="text-muted">Khối mỡ (kg)</span>
            <span className="text-right font-semibold">{fatMassKg(latest) === null ? '—' : formatNumberVN(fatMassKg(latest)!, 1)}</span>
          </div>
        </Card>
      )}

      {d && (
        <Card>
          <div className="mb-2 font-semibold">So với lần trước ({formatVN(prev!.measured_on)})</div>
          <div className="tabular grid grid-cols-2 gap-y-1.5 text-sm">
            <span>Cân nặng</span><span className="text-right">{delta(d.weightKg, true, ' kg')}</span>
            <span>Khối mỡ</span><span className="text-right">{delta(d.fatKg, true, ' kg')}</span>
            <span>% mỡ</span><span className="text-right">{delta(d.pbfPct, true, '%')}</span>
            <span>Khối cơ (SMM)</span><span className="text-right">{delta(d.smmKg, false, ' kg')}</span>
            <span>Mỡ nội tạng</span><span className="text-right">{delta(d.visceral, true, '')}</span>
          </div>
        </Card>
      )}

      {ffm && goals.data && (
        <Card>
          <div className="mb-2 font-semibold">Ước tính % mỡ tại các mốc (giữ FFM {formatNumberVN(ffm, 1)} kg)</div>
          {goals.data.map((g) => (
            <div key={g.id} className="tabular flex justify-between border-b border-line py-1.5 text-sm last:border-0">
              <span>{g.name} · {formatVN(g.target_date)} · {formatNumberVN(g.target_weight_max, 0)} kg</span>
              <b>~{formatNumberVN(estimateBodyFatPct(ffm, (g.target_weight_min + g.target_weight_max) / 2), 1)}%</b>
            </div>
          ))}
        </Card>
      )}

      {logs.length > 1 && (
        <Card>
          <div className="mb-1 text-sm font-medium">% mỡ và khối cơ qua các lần đo</div>
          <SimpleLine
            data={logs.map((l) => ({ label: formatVN(l.measured_on), pbf: l.pbf_pct, smm: l.smm_kg, kg: l.weight_kg }))}
            lines={[{ key: 'pbf', name: '% mỡ' }, { key: 'smm', name: 'SMM', color: 'var(--ok)' }]}
          />
        </Card>
      )}

      <SectionTitle>Nhập lần đo mới</SectionTitle>
      <Card>
        <Field label="Ngày đo">
          <Input type="date" value={date} max={todayVN()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-x-3">
          {FIELDS.map(([k, l]) => (
            <Field key={k} label={l}>
              <Input inputMode="decimal" value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <Button variant="primary" block disabled={busy || !vals.weight_kg} onClick={() => void save()}>Lưu lần đo</Button>
      </Card>
    </Page>
  );
}
