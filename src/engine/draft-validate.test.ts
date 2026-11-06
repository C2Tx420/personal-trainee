import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import { loadSteps, validateDraft } from './draft-validate';
import { parsePlanContent } from './plan-schema';

const base = parsePlanContent(PLAN_V1);
const push = base.templates.find((t) => t.key === 'push')!;
const slug = push.items[0].exercise;
const lib = (step: number, assisted = false) => new Map([[slug, { load_step_kg: step, is_assisted: assisted }]]);
const withItem = (o: Partial<(typeof push.items)[number]>) => {
  const d = structuredClone(base);
  Object.assign(d.templates.find((t) => t.key === 'push')!.items[0], o);
  return d;
};
const msgs = (issues: { level: string; message: string }[], level: string) => issues.filter((i) => i.level === level).map((i) => i.message);

describe('validateDraft', () => {
  it('lb stack: loads must sit on the pin ladder', () => {
    expect(msgs(validateDraft(withItem({ target_kg: 25 }), null, lib(4.5)), 'error')[0]).toContain('25 → 27');
    expect(msgs(validateDraft(withItem({ target_kg: 27, target_kg_per_set: [27, 23, 20] }), null, lib(4.5)), 'error')[0]).toContain('20 → 18');
    expect(validateDraft(withItem({ target_kg: 27 }), null, lib(4.5))).toEqual([]);
    expect(validateDraft(withItem({ target_kg: 25 }), null, lib(2.5))).toEqual([]);
    // copied unchanged from the active plan → only a warning
    expect(msgs(validateDraft(withItem({ target_kg: 25 }), withItem({ target_kg: 25 }), lib(4.5)), 'warning')[0]).toContain('lộ trình cũ');
  });
  it('same exercise twice in a session; fixed warm-up as heavy as the work', () => {
    const d = structuredClone(base);
    const t = d.templates.find((x) => x.key === 'push')!;
    t.items.push(structuredClone(t.items[0]));
    expect(msgs(validateDraft(d, null, lib(5)), 'error').some((m) => m.includes('2 lần'))).toBe(true);
    expect(msgs(validateDraft(withItem({ target_kg: 30, warmup_sets: [{ kg: 30, reps: 5 }] }), null, lib(5)), 'error')[0]).toContain('làm nóng 30 kg');
    // assisted: a fixed warm-up with MORE assistance is normal
    expect(validateDraft(withItem({ target_kg: 20, warmup_sets: [{ kg: 30, reps: 5 }] }), null, lib(5, true))).toEqual([]);
  });
  it('vs active: > 1 step and more load where he wrote "đau" → warnings', () => {
    const active = withItem({ target_kg: 27 });
    expect(msgs(validateDraft(withItem({ target_kg: 36 }), active, lib(4.5)), 'warning')[0]).toContain('2 bước');
    expect(validateDraft(withItem({ target_kg: 32 }), active, lib(4.5))).toEqual([]);
    const pain = validateDraft(withItem({ target_kg: 32 }), active, lib(4.5), { painSlugs: new Set([slug]) });
    expect(msgs(pain, 'warning')[0]).toContain('đau');
    // assisted: less assistance = more load
    expect(msgs(validateDraft(withItem({ target_kg: 23 }), active, lib(4.5, true), { painSlugs: new Set([slug]) }), 'warning')[0]).toContain('đau');
  });
  it('more than 6 changes → warning', () => {
    const d = structuredClone(base);
    for (const t of d.templates) for (const i of t.items) i.sets += 1;
    expect(msgs(validateDraft(d, base, new Map()), 'warning')[0]).toMatch(/thay đổi trong một tuần/);
  });
  it('step counting', () => {
    expect(loadSteps(27, 36, 4.5)).toBe(2);
    expect(loadSteps(30, 35, 2.5)).toBe(2);
  });
});
