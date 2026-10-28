import { useParams } from 'react-router';
import { setExerciseAvailable, setExerciseLbStack } from '@/data/api';
import { qk, useActivePlan, useExerciseHistory, useExerciseMaps, useInvalidate } from '@/data/queries';
import { formatVN } from '@/engine/dates';
import { formatSet } from '@/engine/progression';
import { isLbStack } from '@/engine/stack';
import { FEEL_LABEL, KG_CHANGE_LABEL } from '@/engine/types';
import { setLabel } from '@/engine/warmup';
import { Badge, Banner, Card, Empty, ExerciseImg, Page, SectionTitle, Skeleton, Spinner, Toggle } from '@/ui/components';
import { itemSummary } from '../shared';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from './labels';

export function ExerciseDetailPage() {
  const { slug = '' } = useParams();
  const ex = useExerciseMaps();
  const plan = useActivePlan();
  const invalidate = useInvalidate();
  const e = ex.bySlug.get(slug);
  const ids = e ? [e.id, ...ex.list.filter((x) => x.canonical_exercise_id === e.id).map((x) => x.id)] : [];
  const history = useExerciseHistory(ids);

  if (ex.loading) return <Page title="Bài tập" back="/exercises"><Skeleton /></Page>;
  if (!e) return <Page title="Bài tập" back="/exercises"><Empty>Không tìm thấy bài</Empty></Page>;
  const uses = (plan.data?.content.templates ?? []).flatMap((t) => t.items.filter((i) => i.exercise === slug).map((i) => ({ t: t.name, i })));

  return (
    <Page title={e.name_vi} back="/exercises">
      <ExerciseImg svg={e.illustration_svg} name={e.name_vi} className="mb-3" />
      <div className="mb-3 flex flex-wrap gap-1.5">
        <Badge tone="accent">{MUSCLE_LABEL[e.primary_muscle] ?? e.primary_muscle}</Badge>
        {e.secondary_muscles.map((m) => <Badge key={m}>{MUSCLE_LABEL[m] ?? m}</Badge>)}
        <Badge>{EQUIPMENT_LABEL[e.equipment] ?? e.equipment}</Badge>
        {e.is_provisional && <Badge tone="info">bài tạm — chờ Claude bổ sung</Badge>}
      </div>
      {e.aliases.length > 0 && <p className="mb-3 text-xs text-muted">Tên gọi khác: {e.aliases.join(', ')}</p>}

      {uses.map(({ t, i }) => (
        <Card key={t}>
          <div className="text-sm text-muted">Trong lộ trình · {t}</div>
          <div className="tabular font-semibold">{itemSummary(i)}</div>
          {i.coach_note && <div className="mt-1 text-sm text-info">Coach: “{i.coach_note}”</div>}
        </Card>
      ))}

      {e.cues.length > 0 && (
        <Card>
          <div className="mb-1 font-semibold">Điểm kỹ thuật</div>
          <ul className="list-disc space-y-0.5 pl-5 text-sm">{e.cues.map((c) => <li key={c}>{c}</li>)}</ul>
          {e.common_mistakes.length > 0 && (
            <>
              <div className="mt-3 mb-1 font-semibold">Lỗi hay gặp</div>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted">{e.common_mistakes.map((c) => <li key={c}>{c}</li>)}</ul>
            </>
          )}
          {e.reference_url && (
            <a href={e.reference_url} target="_blank" rel="noreferrer noopener" className="mt-2 block text-sm text-info underline">
              Xem video hướng dẫn ↗
            </a>
          )}
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">Phòng tập có máy / dụng cụ này</div>
            <div className="text-xs text-muted">Tắt → app ẩn khỏi gợi ý, Claude không chọn bài này</div>
          </div>
          <Toggle
            label="Phòng tập có máy"
            checked={e.available_at_gym}
            onChange={async (v) => {
              await setExerciseAvailable(e.id, v);
              await invalidate(qk.exercises);
            }}
          />
        </div>
        {!e.available_at_gym && e.unavailable_note && <Banner tone="warn">{e.unavailable_note}</Banner>}
      </Card>

      {(e.equipment === 'machine' || e.equipment === 'cable') && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Máy chia nấc lb (Matrix)</div>
              <div className="text-xs text-muted">Bật → khi tập chọn nấc 40 / 50 / 60 lb… app ghi 18 / 23 / 27 kg</div>
            </div>
            <Toggle
              label="Máy chia nấc lb"
              checked={isLbStack(e.load_step_kg)}
              onChange={async (v) => {
                await setExerciseLbStack(e.id, v);
                await invalidate(qk.exercises);
              }}
            />
          </div>
        </Card>
      )}

      <SectionTitle>Lịch sử tạ</SectionTitle>
      {history.isLoading && <Spinner />}
      {history.data?.length === 0 && <Empty>Chưa tập bài này</Empty>}
      {history.data?.map((h) => (
        <Card key={h.sessionId}>
          <div className="mb-1 font-semibold">{formatVN(h.date, true)}</div>
          <div className="divide-y divide-line">
            {h.sets
              .sort((a, b) => (a.set_type === b.set_type ? a.set_index - b.set_index : a.set_type === 'warmup' ? -1 : 1))
              .map((s) => (
                <div key={s.id} className="tabular flex justify-between py-1 text-sm">
                  <span className={s.set_type === 'warmup' ? 'text-muted' : ''}>{setLabel({ setType: s.set_type, index: s.set_index })}</span>
                  <span>
                    {s.kg_change_reason && <span className="mr-2 text-xs text-warn">({KG_CHANGE_LABEL[s.kg_change_reason]})</span>}
                    {s.feel && <span className="mr-2 text-xs text-muted">{FEEL_LABEL[s.feel]}</span>}
                    {s.note && <span className="mr-2 text-xs text-muted">“{s.note}”</span>}
                    <b>{formatSet(s)}</b>
                  </span>
                </div>
              ))}
          </div>
        </Card>
      ))}
    </Page>
  );
}
