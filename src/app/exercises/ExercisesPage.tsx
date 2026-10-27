import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useActivePlan, useExerciseMaps } from '@/data/queries';
import { searchExercises } from '@/engine/substitutions';
import { Badge, Chip, ExerciseImg, Input, Page, Spinner } from '@/ui/components';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from './labels';

type Filter = 'in_plan' | 'all' | 'unavailable' | 'provisional';

export function ExercisesPage() {
  const nav = useNavigate();
  const ex = useExerciseMaps();
  const plan = useActivePlan();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('in_plan');
  const [muscle, setMuscle] = useState<string | null>(null);

  if (ex.loading) return <Page title="Bài tập"><Spinner /></Page>;
  const inPlan = new Map<string, string[]>();
  for (const t of plan.data?.content.templates ?? []) {
    for (const it of t.items) inPlan.set(it.exercise, [...(inPlan.get(it.exercise) ?? []), t.name]);
  }
  let list = q.trim() ? searchExercises(q, ex.list, 50) : ex.list.filter((e) => !e.archived);
  if (!q.trim()) {
    if (filter === 'in_plan') list = list.filter((e) => inPlan.has(e.slug));
    if (filter === 'unavailable') list = list.filter((e) => !e.available_at_gym);
    if (filter === 'provisional') list = list.filter((e) => e.is_provisional);
  }
  if (muscle) list = list.filter((e) => e.primary_muscle === muscle);
  const muscles = [...new Set(ex.list.map((e) => e.primary_muscle))];

  return (
    <Page title="Bài tập">
      <Input placeholder="Tìm bài (gõ không dấu cũng được)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Tìm bài" />
      <div className="my-3 flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === 'in_plan'} onClick={() => setFilter('in_plan')}>Đang dùng</Chip>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>Tất cả ({ex.list.length})</Chip>
        <Chip active={filter === 'unavailable'} onClick={() => setFilter('unavailable')}>Không có máy</Chip>
        <Chip active={filter === 'provisional'} onClick={() => setFilter('provisional')}>Bài tạm</Chip>
      </div>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {muscles.map((m) => (
          <Chip key={m} active={muscle === m} onClick={() => setMuscle(muscle === m ? null : m)}>
            {MUSCLE_LABEL[m] ?? m}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {list.map((e) => (
          <button key={e.id} onClick={() => nav(`/exercises/${e.slug}`)} className="glass rounded-card p-2 text-left transition">
            <ExerciseImg svg={e.illustration_svg} name={e.name_vi} />
            <div className="mt-2 px-0.5 text-sm leading-tight font-semibold">{e.name_vi}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              <Badge>{MUSCLE_LABEL[e.primary_muscle] ?? e.primary_muscle}</Badge>
              <Badge>{EQUIPMENT_LABEL[e.equipment] ?? e.equipment}</Badge>
              {inPlan.get(e.slug)?.map((t) => <Badge key={t} tone="accent">{t}</Badge>)}
              {!e.available_at_gym && <Badge tone="warn">không có máy</Badge>}
              {e.is_provisional && <Badge tone="info">bài tạm</Badge>}
            </div>
          </button>
        ))}
      </div>
    </Page>
  );
}
