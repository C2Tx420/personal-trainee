import { useState } from 'react';
import { saveInbody } from '@/data/api';
import { qk, useGoals, useInbody, useInvalidate } from '@/data/queries';
import { formatVN, todayVN } from '@/engine/dates';
import { estimateBodyFatPct } from '@/engine/goals';
import { compareInbody, fatMassKg, inbodyDue, latestFfm } from '@/engine/inbody';
import { formatNumberVN } from '@/engine/math';
import { t } from '@/i18n';
import { SimpleLine } from '@/ui/charts';
import { Badge, Banner, Button, Card, Field, Input, Page, SectionTitle, Skeleton } from '@/ui/components';

const FIELDS = [
  ['weight_kg', t('Cân nặng (kg)')],
  ['smm_kg', t('SMM — cơ xương (kg)')],
  ['pbf_pct', t('PBF — % mỡ')],
  ['visceral_fat_level', t('Mỡ nội tạng')],
  ['whr', 'WHR'],
  ['ffm_kg', t('FFM — khối nạc (kg)')],
  ['bmr_kcal', 'BMR (kcal)'],
  ['inbody_score', t('Điểm InBody')],
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
    <Page title={t('InBody hằng tháng')} back="/body">
      {due.due ? (
        <Banner tone="info">{due.daysSince !== null ? t('Đến hạn đo InBody — đã {n} ngày từ lần trước', { n: due.daysSince }) : t('Đến hạn đo InBody')}</Banner>
      ) : (
        <p className="mb-3 text-sm text-muted">{t('Lần đo gần nhất {date} · đo lại sau {n} ngày nữa', { date: formatVN(latest!.measured_on, true), n: 30 - (due.daysSince ?? 0) })}</p>
      )}

      {latest && (
        <Card>
          <div className="mb-2 font-semibold">{t('Lần gần nhất · {date}', { date: formatVN(latest.measured_on, true) })}</div>
          <div className="tabular grid grid-cols-2 gap-y-1 text-sm">
            {FIELDS.map(([k, l]) => (
              <div key={k} className="contents">
                <span className="text-muted">{l}</span>
                <span className="text-right font-semibold">{latest[k] === null ? '—' : formatNumberVN(latest[k] as number, 1)}</span>
              </div>
            ))}
            <span className="text-muted">{t('Khối mỡ (kg)')}</span>
            <span className="text-right font-semibold">{fatMassKg(latest) === null ? '—' : formatNumberVN(fatMassKg(latest)!, 1)}</span>
          </div>
        </Card>
      )}

      {d && (
        <Card>
          <div className="mb-2 font-semibold">{t('So với lần trước ({date})', { date: formatVN(prev!.measured_on) })}</div>
          <div className="tabular grid grid-cols-2 gap-y-1.5 text-sm">
            <span>{t('Cân nặng')}</span><span className="text-right">{delta(d.weightKg, true, ' kg')}</span>
            <span>{t('Khối mỡ')}</span><span className="text-right">{delta(d.fatKg, true, ' kg')}</span>
            <span>{t('% mỡ')}</span><span className="text-right">{delta(d.pbfPct, true, '%')}</span>
            <span>{t('Khối cơ (SMM)')}</span><span className="text-right">{delta(d.smmKg, false, ' kg')}</span>
            <span>{t('Mỡ nội tạng')}</span><span className="text-right">{delta(d.visceral, true, '')}</span>
          </div>
        </Card>
      )}

      {ffm && goals.data && (
        <Card>
          <div className="mb-2 font-semibold">{t('Ước tính % mỡ tại các mốc (giữ FFM {ffm} kg)', { ffm: formatNumberVN(ffm, 1) })}</div>
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
          <div className="mb-1 text-sm font-medium">{t('% mỡ và khối cơ qua các lần đo')}</div>
          <SimpleLine
            data={logs.map((l) => ({ label: formatVN(l.measured_on), pbf: l.pbf_pct, smm: l.smm_kg, kg: l.weight_kg }))}
            lines={[{ key: 'pbf', name: t('% mỡ') }, { key: 'smm', name: 'SMM', color: 'var(--ok)' }]}
          />
        </Card>
      )}

      <SectionTitle>{t('Nhập lần đo mới')}</SectionTitle>
      <Card>
        <Field label={t('Ngày đo')}>
          <Input type="date" value={date} max={todayVN()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-x-3">
          {FIELDS.map(([k, l]) => (
            <Field key={k} label={l}>
              <Input inputMode="decimal" value={vals[k] ?? ''} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
            </Field>
          ))}
        </div>
        <Button variant="primary" block disabled={busy || !vals.weight_kg} onClick={() => void save()}>{t('Lưu lần đo')}</Button>
      </Card>
    </Page>
  );
}
