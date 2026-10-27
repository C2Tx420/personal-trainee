import { WEEKDAY_LABEL, WEEKDAYS } from './dates';
import type { DayPlan, ExerciseDef, PlanContent, PlanItem, PlanTemplate } from './plan-schema';
import { legsBadmintonAdjacency } from './plan-schema';

export type DiffKind =
  | 'added'
  | 'removed'
  | 'replaced'
  | 'sets'
  | 'reps'
  | 'rest'
  | 'order'
  | 'target_kg'
  | 'warmup_sets'
  | 'coach_note'
  | 'exercise_new'
  | 'exercise_edit'
  | 'warmup'
  | 'nutrition'
  | 'schedule';

export type DiffEntry = { kind: DiffKind; scope: string; text: string; warning?: string; slug?: string };

const kg = (v: number | null) => (v === null ? '—' : `${String(v).replace('.', ',')} kg`);
const reps = (i: PlanItem) => `${i.rep_min}–${i.rep_max}${i.unit === 'seconds' ? 's' : ''}`;

function dayLabel(p: DayPlan): string {
  switch (p.kind) {
    case 'session':
      return p.template === 'push' ? 'Push' : p.template === 'pull' ? 'Pull' : 'Legs';
    case 'rest':
      return 'Nghỉ';
    case 'badminton':
      return 'Cầu lông';
    case 'optional':
      return 'Tuỳ chọn';
  }
}

function diffTemplate(a: PlanTemplate | undefined, b: PlanTemplate | undefined, names: (s: string) => string): DiffEntry[] {
  const scope = (b ?? a)!.name;
  const out: DiffEntry[] = [];
  const ai = a?.items ?? [];
  const bi = b?.items ?? [];
  const aSlugs = ai.map((i) => i.exercise);
  const bSlugs = bi.map((i) => i.exercise);
  const removed = ai.filter((i) => !bSlugs.includes(i.exercise));
  const added = bi.filter((i) => !aSlugs.includes(i.exercise));

  // Same position: 1 exercise removed + 1 added → "replaced"
  const replacedPairs: [PlanItem, PlanItem][] = [];
  for (const r of [...removed]) {
    const pos = ai.indexOf(r);
    const cand = added.find((x) => bi.indexOf(x) === pos);
    if (cand) {
      replacedPairs.push([r, cand]);
      removed.splice(removed.indexOf(r), 1);
      added.splice(added.indexOf(cand), 1);
    }
  }
  for (const [r, n] of replacedPairs) {
    out.push({ kind: 'replaced', scope, text: `${names(r.exercise)} → ${names(n.exercise)}`, slug: n.exercise });
  }
  for (const n of added) {
    out.push({ kind: 'added', scope, text: `+ ${names(n.exercise)} ${n.sets} × ${reps(n)}`, slug: n.exercise });
  }
  for (const r of removed) out.push({ kind: 'removed', scope, text: `− ${names(r.exercise)}`, slug: r.exercise });

  for (const n of bi) {
    const o = ai.find((x) => x.exercise === n.exercise);
    if (!o) continue;
    const nm = names(n.exercise);
    if (o.sets !== n.sets) out.push({ kind: 'sets', scope, text: `${nm}: ${o.sets} → ${n.sets} hiệp chính` });
    if (o.rep_min !== n.rep_min || o.rep_max !== n.rep_max) out.push({ kind: 'reps', scope, text: `${nm}: ${reps(o)} → ${reps(n)}` });
    if (o.rest_sec_min !== n.rest_sec_min || o.rest_sec_max !== n.rest_sec_max) {
      out.push({ kind: 'rest', scope, text: `${nm}: nghỉ ${o.rest_sec_min}–${o.rest_sec_max}s → ${n.rest_sec_min}–${n.rest_sec_max}s` });
    }
    const okg = JSON.stringify(o.target_kg_per_set) + o.target_kg;
    const nkg = JSON.stringify(n.target_kg_per_set) + n.target_kg;
    if (okg !== nkg) {
      const f = (i: PlanItem) => (i.target_kg_per_set ? i.target_kg_per_set.map((x) => String(x).replace('.', ',')).join('/') + ' kg' : kg(i.target_kg));
      out.push({ kind: 'target_kg', scope, text: `${nm}: ${f(o)} → ${f(n)}` });
    }
    if (JSON.stringify(o.warmup_sets) !== JSON.stringify(n.warmup_sets)) {
      out.push({ kind: 'warmup_sets', scope, text: `${nm}: làm nóng ${o.warmup_sets.length} → ${n.warmup_sets.length} hiệp` });
    }
    if (o.coach_note !== n.coach_note && n.coach_note) out.push({ kind: 'coach_note', scope, text: `${nm}: "${n.coach_note}"` });
  }

  const commonA = aSlugs.filter((s) => bSlugs.includes(s));
  const commonB = bSlugs.filter((s) => aSlugs.includes(s));
  if (commonA.join() !== commonB.join()) out.push({ kind: 'order', scope, text: `Đổi thứ tự: ${commonB.map(names).join(' → ')}` });

  if (a && b && JSON.stringify(a.warmup) !== JSON.stringify(b.warmup)) {
    const f = (t: PlanTemplate) =>
      [t.warmup.cardio ? `${names(t.warmup.cardio.exercise)} ${t.warmup.cardio.minutes}'` : 'không cardio', ...t.warmup.mobility].join(' · ');
    out.push({ kind: 'warmup', scope, text: `Khởi động: ${f(a)} → ${f(b)}` });
  }
  return out;
}

function diffExercises(a: ExerciseDef[], b: ExerciseDef[], knownBefore: Set<string>): DiffEntry[] {
  return b.map((e): DiffEntry => {
    const prev = a.find((x) => x.slug === e.slug);
    const isNew = !knownBefore.has(e.slug) && !prev;
    return {
      kind: isNew ? 'exercise_new' : 'exercise_edit',
      scope: 'Thư viện bài tập',
      text: isNew ? `Bài mới: ${e.name_vi}` : `Sửa bài: ${e.name_vi}`,
      slug: e.slug,
    };
  });
}

/**
 * Diff two plan versions. Exercises are matched by slug within the same template
 * (not by position), so reordering is not mistaken for remove + add.
 */
export function diffPlans(
  a: PlanContent,
  b: PlanContent,
  names: (slug: string) => string,
  existingSlugs: Set<string> = new Set(),
): DiffEntry[] {
  const out: DiffEntry[] = [];
  for (const d of WEEKDAYS) {
    const pa = a.schedule[d];
    const pb = b.schedule[d];
    if (JSON.stringify(pa) !== JSON.stringify(pb)) {
      out.push({ kind: 'schedule', scope: 'Lịch', text: `${WEEKDAY_LABEL[d]}: ${dayLabel(pa)} → ${dayLabel(pb)}` });
    }
  }
  if (legsBadmintonAdjacency(b.schedule).length > 0 && out.some((x) => x.kind === 'schedule')) {
    out[out.length - 1].warning = 'Vi phạm rule: Legs và cầu lông liền ngày';
  }
  const keys = new Set([...a.templates.map((t) => t.key), ...b.templates.map((t) => t.key)]);
  for (const k of keys) {
    out.push(...diffTemplate(a.templates.find((t) => t.key === k), b.templates.find((t) => t.key === k), names));
  }
  out.push(...diffExercises(a.exercise_upserts, b.exercise_upserts, existingSlugs));
  const na = a.nutrition;
  const nb = b.nutrition;
  if (na.calories_kcal !== nb.calories_kcal) {
    const d = nb.calories_kcal - na.calories_kcal;
    out.push({ kind: 'nutrition', scope: 'Calo tham khảo', text: `${na.calories_kcal} → ${nb.calories_kcal} kcal (${d > 0 ? '+' : ''}${d})` });
  }
  for (const [k, label] of [['protein_g', 'Đạm'], ['carb_g', 'Carb'], ['fat_g', 'Béo']] as const) {
    if (na[k] !== nb[k]) out.push({ kind: 'nutrition', scope: 'Macro tham khảo', text: `${label}: ${na[k]} → ${nb[k]} g` });
  }
  return out;
}
