import { type BackfillItem, createBackfillSession, createProvisionalExercise } from '@/data/api';
import type { IsoDate } from '@/engine/dates';
import type { PlanContent, PlanItem } from '@/engine/plan-schema';
import type { SessionKind } from '@/engine/schedule';
import { normalizeVi } from '@/engine/text';
import type { ExerciseRow, WarmupLog } from '@/engine/types';
import { supabase } from '@/lib/supabase';
import type { EditorItem } from './SessionEditor';

/** Save a Backfill / Quick log result as a completed session. */
export async function saveEditor(args: {
  date: IsoDate;
  kind: SessionKind;
  items: EditorItem[];
  warmup: WarmupLog | null;
  note: string | null;
  content: PlanContent | null;
  planVersionId: string | null;
}): Promise<string> {
  const template = args.content?.templates.find((t) => args.kind.startsWith(t.key));
  const out: BackfillItem[] = [];
  for (const it of args.items) {
    if (!it.pick) throw new Error('Còn bài chưa chọn — chọn bài cho các dòng màu vàng');
    const ex: ExerciseRow = 'exercise' in it.pick ? it.pick.exercise : await createProvisionalExercise(it.pick.newName, null, null);
    // the user picked an exercise for an unknown name → save that name as an alias for next time
    if (it.rawName && 'exercise' in it.pick && ![ex.name_vi, ...ex.aliases].some((n) => normalizeVi(n) === normalizeVi(it.rawName!))) {
      await supabase.from('exercises').update({ aliases: [...ex.aliases, it.rawName] }).eq('id', ex.id);
    }
    const tplPos = template?.items.findIndex((t) => t.exercise === ex.slug || t.alternatives.includes(ex.slug)) ?? -1;
    const fromTpl = tplPos >= 0 ? template!.items[tplPos] : undefined;
    const working = it.sets.filter((s) => s.set_type === 'working');
    const reps = working.map((s) => s.reps ?? s.seconds ?? 0);
    const target: PlanItem = fromTpl
      ? { ...fromTpl, exercise: ex.slug, sets: Math.max(1, working.length) }
      : {
          exercise: ex.slug, alternatives: [], sets: Math.max(1, working.length), warmup_sets: [],
          rep_min: Math.min(...reps, 1) || 1, rep_max: Math.max(...reps, 1), unit: ex.is_time_based ? 'seconds' : 'reps',
          rest_sec_min: 60, rest_sec_max: 90, target_kg: null, target_kg_per_set: null, coach_note: '', note: '',
        };
    out.push({
      exercise: ex,
      plannedExercise: fromTpl ? null : null,
      templateItemPosition: tplPos >= 0 ? tplPos : null,
      target,
      note: it.note.trim() || null,
      sets: it.sets.map((s) => ({ set_type: s.set_type, reps: s.reps, seconds: s.seconds, weight_kg: s.kg })),
    });
  }
  return createBackfillSession({
    date: args.date,
    kind: args.kind,
    planVersionId: args.planVersionId,
    warmup: args.warmup,
    note: args.note,
    items: out,
  });
}
