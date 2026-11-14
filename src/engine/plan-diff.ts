import { WEEKDAY_LABEL, WEEKDAYS } from './dates';
import type { DayPlan, ExerciseDef, PlanContent, PlanItem, PlanTemplate } from './plan-schema';
import { legsBadmintonAdjacency, parsePlanContent } from './plan-schema';
import { SESSION_KIND_LABEL } from './schedule';
import { t } from '../i18n';
import { formatNumberVN } from './math';

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

const kg = (v: number | null) => (v === null ? '—' : `${formatNumberVN(v, 2)} kg`);
const reps = (i: PlanItem) => `${i.rep_min}–${i.rep_max}${i.unit === 'seconds' ? 's' : ''}`;

function dayLabel(p: DayPlan): string {
  switch (p.kind) {
    case 'session':
      return SESSION_KIND_LABEL[p.template];
    case 'rest':
      return t('Nghỉ');
    case 'badminton':
      return t('Cầu lông');
    case 'optional':
      return t('Tuỳ chọn');
  }
}

/** Match two item lists by slug; 1 removed + 1 added at the same position = replaced. */
function matchItems(ai: PlanItem[], bi: PlanItem[]) {
  const aSlugs = ai.map((i) => i.exercise);
  const bSlugs = bi.map((i) => i.exercise);
  const removed = ai.filter((i) => !bSlugs.includes(i.exercise));
  const added = bi.filter((i) => !aSlugs.includes(i.exercise));
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
  const commonA = aSlugs.filter((s) => bSlugs.includes(s));
  const commonB = bSlugs.filter((s) => aSlugs.includes(s));
  return { removed, added, replacedPairs, reordered: commonA.join() !== commonB.join(), commonB };
}

const kgSpec = (i: PlanItem) =>
  i.target_kg_per_set
    ? i.target_kg_per_set.map((x) => formatNumberVN(x, 2)).join('/') + ' kg'
    : kg(i.target_kg) + (i.backoff_steps && i.target_kg !== null ? t(', hiệp sau −{n} nấc', { n: i.backoff_steps }) : '');
const kgKey = (i: PlanItem) => JSON.stringify(i.target_kg_per_set) + i.target_kg + ':' + (i.backoff_steps ?? 0);

function warmupText(tpl: PlanTemplate, names: (s: string) => string) {
  return [tpl.warmup.cardio ? `${names(tpl.warmup.cardio.exercise)} ${tpl.warmup.cardio.minutes}'` : t('không cardio'), ...tpl.warmup.mobility].join(' · ');
}

function diffTemplate(a: PlanTemplate | undefined, b: PlanTemplate | undefined, names: (s: string) => string): DiffEntry[] {
  const scope = (b ?? a)!.name;
  const out: DiffEntry[] = [];
  const ai = a?.items ?? [];
  const bi = b?.items ?? [];
  const { removed, added, replacedPairs, reordered, commonB } = matchItems(ai, bi);
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
    if (o.sets !== n.sets) out.push({ kind: 'sets', scope, text: t('{name}: {a} → {b} hiệp chính', { name: nm, a: o.sets, b: n.sets }) });
    if (o.rep_min !== n.rep_min || o.rep_max !== n.rep_max) out.push({ kind: 'reps', scope, text: `${nm}: ${reps(o)} → ${reps(n)}` });
    if (o.rest_sec_min !== n.rest_sec_min || o.rest_sec_max !== n.rest_sec_max) {
      out.push({ kind: 'rest', scope, text: t('{name}: nghỉ {a} → {b}', { name: nm, a: `${o.rest_sec_min}–${o.rest_sec_max}s`, b: `${n.rest_sec_min}–${n.rest_sec_max}s` }) });
    }
    if (kgKey(o) !== kgKey(n)) {
      out.push({ kind: 'target_kg', scope, text: `${nm}: ${kgSpec(o)} → ${kgSpec(n)}` });
    }
    if (JSON.stringify(o.warmup_sets) !== JSON.stringify(n.warmup_sets)) {
      out.push({ kind: 'warmup_sets', scope, text: t('{name}: làm nóng {a} → {b} hiệp', { name: nm, a: o.warmup_sets.length, b: n.warmup_sets.length }) });
    }
    if (o.coach_note !== n.coach_note && n.coach_note) out.push({ kind: 'coach_note', scope, text: `${nm}: "${n.coach_note}"` });
  }

  if (reordered) out.push({ kind: 'order', scope, text: t('Đổi thứ tự: {order}', { order: commonB.map(names).join(' → ') }) });

  if (a && b && JSON.stringify(a.warmup) !== JSON.stringify(b.warmup)) {
    out.push({ kind: 'warmup', scope, text: t('Khởi động: {a} → {b}', { a: warmupText(a, names), b: warmupText(b, names) }) });
  }
  return out;
}

function diffExercises(a: ExerciseDef[], b: ExerciseDef[], knownBefore: Set<string>): DiffEntry[] {
  return b.map((e): DiffEntry => {
    const prev = a.find((x) => x.slug === e.slug);
    const isNew = !knownBefore.has(e.slug) && !prev;
    return {
      kind: isNew ? 'exercise_new' : 'exercise_edit',
      scope: t('Thư viện bài tập'),
      text: isNew ? t('Bài mới: {name}', { name: e.name }) : t('Sửa bài: {name}', { name: e.name }),
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
      out.push({ kind: 'schedule', scope: t('Lịch'), text: `${WEEKDAY_LABEL[d]}: ${dayLabel(pa)} → ${dayLabel(pb)}` });
    }
  }
  if (legsBadmintonAdjacency(b.schedule).length > 0 && out.some((x) => x.kind === 'schedule')) {
    out[out.length - 1].warning = t('Vi phạm rule: Legs và cầu lông liền ngày');
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
    out.push({ kind: 'nutrition', scope: t('Calo tham khảo'), text: `${na.calories_kcal} → ${nb.calories_kcal} kcal (${d > 0 ? '+' : ''}${d})` });
  }
  for (const [k, label] of [['protein_g', t('Đạm')], ['carb_g', 'Carb'], ['fat_g', t('Béo')]] as const) {
    if (na[k] !== nb[k]) out.push({ kind: 'nutrition', scope: t('Macro tham khảo'), text: `${label}: ${na[k]} → ${nb[k]} g` });
  }
  return out;
}

/** A plan version row as the coach report reads it. */
export type PlanVersionLite = {
  id: string;
  version_no: number;
  status: string;
  change_note: string;
  rejected_reason?: string | null;
  content: unknown;
  based_on_version_id: string | null;
};

/**
 * The last `n` rejected drafts with what each one changed vs the plan it was built on
 * (so the coach does not re-propose them without new data).
 */
export function rejectedSummary(plans: PlanVersionLite[], names: (slug: string) => string, n = 3) {
  return plans
    .filter((p) => p.status === 'rejected')
    .slice(-n)
    .map((p) => {
      const base = plans.find((x) => x.id === p.based_on_version_id);
      return {
        version_no: p.version_no,
        change_note: p.change_note,
        rejected_reason: p.rejected_reason ?? null,
        changes: base ? diffPlans(parsePlanContent(base.content), parsePlanContent(p.content), names).map((d) => `${d.scope}: ${d.text}`) : null,
      };
    });
}

export type DraftWarnings = {
  /** built on a plan that is no longer the active one (the id it was built on) */
  staleBase: string | null;
  /** other drafts waiting for approval */
  otherDrafts: PlanVersionLite[];
  /** this is the newest pending draft */
  newest: boolean;
};

/** Stale-draft checks for the review screen (built on an old plan, or several drafts pending). */
export function draftWarnings(draft: PlanVersionLite, plans: PlanVersionLite[]): DraftWarnings {
  if (draft.status !== 'draft') return { staleBase: null, otherDrafts: [], newest: false };
  const active = plans.find((p) => p.status === 'active');
  const otherDrafts = plans.filter((p) => p.status === 'draft' && p.id !== draft.id);
  return {
    staleBase: active && draft.based_on_version_id && draft.based_on_version_id !== active.id ? draft.based_on_version_id : null,
    otherDrafts,
    newest: otherDrafts.every((p) => p.version_no < draft.version_no),
  };
}

// ───────────────────────── Per-session view (plan review screen)

export type ItemChange = { kind: 'sets' | 'reps' | 'rest' | 'target_kg' | 'warmup_sets'; text: string; dir?: 'up' | 'down' };

export type SessionItemView = {
  item: PlanItem;
  /** new = added, replaced = took the place of `from`, kept = was already in the session */
  status: 'new' | 'replaced' | 'kept';
  from?: string;
  changes: ItemChange[];
  /** coach note is new or different from the previous version */
  noteChanged: boolean;
};

export type SessionView = {
  key: PlanTemplate['key'];
  name: string;
  items: SessionItemView[];
  removed: string[];
  reordered: boolean;
  warmup: string | null;
  changed: boolean;
};

const firstKg = (i: PlanItem) => i.target_kg_per_set?.[0] ?? i.target_kg;

function itemChanges(o: PlanItem, n: PlanItem, assisted: boolean): ItemChange[] {
  const out: ItemChange[] = [];
  if (kgKey(o) !== kgKey(n)) {
    const a = firstKg(o);
    const b = firstKg(n);
    // up = harder: more kg, or less assistance on assisted machines
    const dir = a !== null && b !== null && a !== b ? (b > a !== assisted ? 'up' : 'down') : undefined;
    const text = b === null ? t('{kg} → tự chọn mức', { kg: kgSpec(o) }) : a === null ? t('đặt {kg}', { kg: kgSpec(n) }) : `${kgSpec(o)} → ${kgSpec(n)}`;
    out.push({ kind: 'target_kg', text, dir });
  }
  if (o.sets !== n.sets) out.push({ kind: 'sets', text: t('{a} → {b} hiệp', { a: o.sets, b: n.sets }), dir: n.sets > o.sets ? 'up' : 'down' });
  if (o.rep_min !== n.rep_min || o.rep_max !== n.rep_max) out.push({ kind: 'reps', text: t('{a} → {b} lần', { a: reps(o), b: reps(n) }) });
  if (o.rest_sec_min !== n.rest_sec_min || o.rest_sec_max !== n.rest_sec_max) {
    out.push({ kind: 'rest', text: t('nghỉ {a} → {b}', { a: `${o.rest_sec_min}–${o.rest_sec_max}s`, b: `${n.rest_sec_min}–${n.rest_sec_max}s` }) });
  }
  if (JSON.stringify(o.warmup_sets) !== JSON.stringify(n.warmup_sets)) {
    out.push({ kind: 'warmup_sets', text: t('làm nóng {a} → {b} hiệp', { a: o.warmup_sets.length, b: n.warmup_sets.length }) });
  }
  return out;
}

/** Each session of `b` in order, every exercise tagged with what changed since `a` (null = first version). */
export function sessionChanges(
  a: PlanContent | null,
  b: PlanContent,
  names: (s: string) => string,
  assisted: (slug: string) => boolean = () => false,
): SessionView[] {
  return b.templates.map((t): SessionView => {
    const prev = a?.templates.find((x) => x.key === t.key);
    if (!a) {
      return { key: t.key, name: t.name, items: t.items.map((item) => ({ item, status: 'kept', changes: [], noteChanged: false })), removed: [], reordered: false, warmup: null, changed: false };
    }
    const ai = prev?.items ?? [];
    const { removed, replacedPairs, reordered } = matchItems(ai, t.items);
    const items = t.items.map((item): SessionItemView => {
      const o = ai.find((x) => x.exercise === item.exercise);
      if (o) return { item, status: 'kept', changes: itemChanges(o, item, assisted(item.exercise)), noteChanged: !!item.coach_note && item.coach_note !== o.coach_note };
      const pair = replacedPairs.find(([, n]) => n === item);
      return pair
        ? { item, status: 'replaced', from: pair[0].exercise, changes: [], noteChanged: !!item.coach_note }
        : { item, status: 'new', changes: [], noteChanged: !!item.coach_note };
    });
    const warmup = prev && JSON.stringify(prev.warmup) !== JSON.stringify(t.warmup) ? warmupText(t, names) : null;
    const changed = !prev || reordered || !!warmup || removed.length > 0 || items.some((i) => i.status !== 'kept' || i.changes.length > 0 || i.noteChanged);
    return { key: t.key, name: t.name, items, removed: removed.map((r) => r.exercise), reordered, warmup, changed };
  });
}
