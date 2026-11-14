import { harder } from './load';
import { sessionChanges } from './plan-diff';
import type { PlanContent, PlanIssue, PlanItem } from './plan-schema';
import { isLbStack, kgToLb, lbToKg } from './stack';
import { t } from '../i18n';

/**
 * Draft checks beyond `validatePlanRules` (plan v2.7 §16 B6), used by `coach/scripts/submit-draft.ts`
 * and the plan review screen.
 *   errors   — certainly wrong: a load off the lb-stack ladder, an exercise twice in one session,
 *              a fixed warm-up as heavy as the working load
 *   warnings — needs a reason: > 1 step vs the active plan, > 6 changes, more load where he wrote "đau"
 */
export type LibraryInfo = { load_step_kg: number; is_assisted?: boolean };

export const MAX_CHANGES_PER_WEEK = 6;
const EPS = 0.01;

const onLadder = (kg: number) => Math.abs(lbToKg(kgToLb(kg)) - kg) <= EPS;
const firstKg = (i: PlanItem) => i.target_kg_per_set?.[0] ?? i.target_kg;

/** Number of load steps between two loads (pins on lb stacks). */
export function loadSteps(a: number, b: number, loadStepKg: number): number {
  if (isLbStack(loadStepKg)) return Math.abs(kgToLb(a) - kgToLb(b)) / 10;
  return loadStepKg > 0 ? Math.abs(a - b) / loadStepKg : 0;
}

export function validateDraft(
  draft: PlanContent,
  active: PlanContent | null,
  library: Map<string, LibraryInfo>,
  opts: { painSlugs?: Set<string>; names?: (slug: string) => string } = {},
): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const name = opts.names ?? ((s: string) => s);
  const info = (slug: string): LibraryInfo | undefined => {
    const up = draft.exercise_upserts.find((e) => e.slug === slug);
    const lib = library.get(slug);
    if (!up && !lib) return undefined;
    return { load_step_kg: up?.load_step_kg ?? lib?.load_step_kg ?? 2.5, is_assisted: up?.is_assisted ?? lib?.is_assisted ?? false };
  };

  for (const tpl of draft.templates) {
    const seen = new Set<string>();
    for (const item of tpl.items) {
      const ex = name(item.exercise);
      if (seen.has(item.exercise)) issues.push({ level: 'error', message: t('{session}: "{ex}" có 2 lần trong buổi', { session: tpl.name, ex }) });
      seen.add(item.exercise);
      const e = info(item.exercise);
      if (!e) continue;

      const old = active?.templates.find((x) => x.key === tpl.key)?.items.find((x) => x.exercise === item.exercise);
      const loads = [item.target_kg, ...(item.target_kg_per_set ?? [])].filter((k): k is number => k !== null && k > 0);
      if (isLbStack(e.load_step_kg)) {
        const off = loads.filter((k) => !onLadder(k));
        if (off.length) {
          const fix = off.map((k) => `${k} → ${lbToKg(kgToLb(k))}`).join(', ');
          // a load copied unchanged from the active plan (e.g. set before the machine was flagged lb) only warns
          const unchanged = !!old && old.target_kg === item.target_kg && JSON.stringify(old.target_kg_per_set) === JSON.stringify(item.target_kg_per_set);
          issues.push({
            level: unchanged ? 'warning' : 'error',
            message: unchanged
              ? t('{session}: "{ex}" là máy nấc lb — tạ phải nằm trên thang 18/23/27/32/36… ({fix}) — đang lệch từ lộ trình cũ, nên sửa', { session: tpl.name, ex, fix })
              : t('{session}: "{ex}" là máy nấc lb — tạ phải nằm trên thang 18/23/27/32/36… ({fix})', { session: tpl.name, ex, fix }),
          });
        }
      }
      const working = firstKg(item);
      if (working !== null && !e.is_assisted) {
        for (const w of item.warmup_sets) {
          if (w.kg !== undefined && w.kg >= working - EPS) {
            issues.push({ level: 'error', message: t('{session}: "{ex}" có hiệp làm nóng {warm} kg ≥ tạ chính {working} kg', { session: tpl.name, ex, warm: w.kg, working }) });
          }
        }
      }

      // vs the active plan: same exercise in the same session
      const a = old ? firstKg(old) : null;
      if (a !== null && working !== null && a !== working) {
        const steps = loadSteps(a, working, e.load_step_kg);
        if (steps > 1 + EPS) {
          issues.push({ level: 'warning', message: t('{session}: "{ex}" {a} → {b} kg là {steps} bước (tối đa ±1 bước / tuần)', { session: tpl.name, ex, a, b: working, steps: Math.round(steps * 10) / 10 }) });
        }
        if (opts.painSlugs?.has(item.exercise) && harder(working, a, !!e.is_assisted)) {
          issues.push({ level: 'warning', message: t('{session}: "{ex}" tăng tạ dù anh ghi đau gần đây', { session: tpl.name, ex }) });
        }
      }
    }
  }

  if (active) {
    const views = sessionChanges(active, draft, name);
    const n = views.reduce(
      (acc, v) => acc + v.removed.length + v.items.filter((i) => i.status !== 'kept' || i.changes.length > 0).length,
      0,
    );
    if (n > MAX_CHANGES_PER_WEEK) issues.push({ level: 'warning', message: t('{n} thay đổi trong một tuần (nên ≤ {max})', { n, max: MAX_CHANGES_PER_WEEK }) });
  }
  return issues;
}
