import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PLAN_V1 } from '../../scripts/seed/plan-v1';
import { addDays, diffDays, todayVN, weekdayOf, weekStart } from './dates';
import { activeGoal, estimateBodyFatPct, type Goal, goalProgress } from './goals';
import { diffPlans } from './plan-diff';
import { legsBadmintonAdjacency, parsePlanContent, planContentSchema, validatePlanRules } from './plan-schema';
import { kgDeviates, prefillKg, progressionHint } from './progression';
import { bodyChange, personalRecords, strengthChanges } from './progress';
import { dueReminders, DEFAULT_REMINDERS } from './reminders';
import { actualLegsBadmintonConflicts, dayPlanFor, lightenTemplate, templateFor } from './schedule';
import { kgToLb, lbToKg, pinsAround, roundLoad, stackStep } from './stack';
import { exactMatch, searchExercises, suggestSubstitutes } from './substitutions';
import { validateSvg } from './svg-validate';
import type { SessionRow, SetRow } from './types';
import { plannedSets } from './warmup';
import { lossRateVerdict, stallSuggestion, weeklyWeights, weeksWithoutLoss } from './weight';
import { volumeKg } from './workout-summary';

const goal = (o: Partial<Goal>): Goal => ({
  id: 'g', name: 'Noel', ordinal: 1, target_date: '2026-12-25', target_weight_min: 76, target_weight_max: 77,
  target_body_fat_min: 23, target_body_fat_max: 24, status: 'active', achieved_at: null, ...o,
});

const set = (o: Partial<SetRow>): SetRow => ({
  id: crypto.randomUUID(), session_id: 's', session_item_id: 'i', exercise_id: 'e', set_index: 1, set_type: 'working',
  target_kg: null, target_rep_min: null, target_rep_max: null, reps: 10, weight_kg: 20, seconds: null,
  kg_change_reason: null, kg_change_note: null, feel: null, note: null, completed: true, completed_at: null, ...o,
});

describe('dates', () => {
  it('27/10/2026 là thứ Ba, tuần bắt đầu 26/10', () => {
    expect(weekdayOf('2026-10-27')).toBe('tue');
    expect(weekStart('2026-10-27')).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(diffDays('2026-10-27', '2026-12-25')).toBe(59);
    expect(todayVN(new Date('2026-10-27T18:30:00Z'))).toBe('2026-10-28');
  });
});

describe('goals (§1.1)', () => {
  it('Noel: 59 ngày, cần ~0,56 kg/tuần tính theo cận trên 77kg, không vượt 0,7', () => {
    const p = goalProgress(goal({}), 81.7, '2026-10-27', null, 58.7);
    expect(p.daysLeft).toBe(59);
    expect(p.weeksLeft).toBe(8.4);
    expect(p.gapKg).toBe(4.7);
    expect(p.requiredKgPerWeek).toBeCloseTo(0.56, 2);
    expect(p.unsafe).toBe(false);
    expect(p.estimatedBodyFatPct).toBeCloseTo(23.3, 1);
  });
  it('mỡ ước tính các mốc khớp spec', () => {
    expect(estimateBodyFatPct(58.7, 73)).toBeCloseTo(19.6, 1);
    expect(estimateBodyFatPct(58.7, 70)).toBeCloseTo(16.1, 1);
  });
  it('cảnh báo khi cần > 0,7 kg/tuần; đạt mốc thì chuyển mốc kế', () => {
    expect(goalProgress(goal({}), 81.7, '2026-12-11', 0.5, null).unsafe).toBe(true);
    const ps = [
      goalProgress(goal({ ordinal: 1 }), 76.8, '2026-12-01', 0.6, null),
      goalProgress(goal({ ordinal: 2, name: 'Tết', target_date: '2027-02-06', target_weight_min: 73, target_weight_max: 73 }), 76.8, '2026-12-01', 0.6, null),
    ];
    expect(ps[0].status).toBe('achieved');
    expect(activeGoal(ps)?.goal.name).toBe('Tết');
  });
  it('chậm khi tốc độ thực tế < 90% tốc độ cần', () => {
    expect(goalProgress(goal({}), 81.7, '2026-10-27', 0.3, null).status).toBe('behind');
    expect(goalProgress(goal({}), 81.7, '2026-10-27', 0.6, null).status).toBe('on_track');
  });
});

describe('plan v1 + rule lịch', () => {
  const plan = parsePlanContent(PLAN_V1);
  const slugs = fs.readdirSync(path.resolve(import.meta.dirname, '../../supabase/seed/exercises'))
    .filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));

  it('v1 hợp lệ: không lỗi rule, mọi bài có trong thư viện', () => {
    expect(validatePlanRules(plan, slugs)).toEqual([]);
  });
  it('lịch: T2 Push, T3 Pull, T5 cầu lông, T7 Legs', () => {
    expect(dayPlanFor(plan, '2026-10-26')).toEqual({ kind: 'session', template: 'push' });
    expect(dayPlanFor(plan, '2026-10-27')).toEqual({ kind: 'session', template: 'pull' });
    expect(dayPlanFor(plan, '2026-10-29').kind).toBe('badminton');
    expect(dayPlanFor(plan, '2026-10-31')).toEqual({ kind: 'session', template: 'legs' });
  });
  it('Legs liền cầu lông bị phát hiện, kể cả vòng tuần', () => {
    expect(legsBadmintonAdjacency(plan.schedule)).toEqual([]);
    const bad = { ...plan.schedule, fri: { kind: 'session' as const, template: 'legs' as const } };
    expect(legsBadmintonAdjacency(bad).length).toBeGreaterThan(0);
    const wrap = { ...plan.schedule, sun: { kind: 'badminton' as const, minutes_min: 60, minutes_max: 90, intensity: 'light' as const }, mon: { kind: 'session' as const, template: 'legs' as const } };
    expect(legsBadmintonAdjacency(wrap).length).toBeGreaterThan(0);
  });
  it('CN không được Legs; calo < 1700 bị schema chặn', () => {
    const sunLegs = { ...plan, schedule: { ...plan.schedule, sun: { kind: 'session' as const, template: 'legs' as const } } };
    expect(validatePlanRules(sunLegs, slugs).some((i) => i.message.includes('Chủ nhật'))).toBe(true);
    expect(planContentSchema.safeParse({ ...plan, nutrition: { ...plan.nutrition, calories_kcal: 1699 } }).success).toBe(false);
  });
  it('CN Push nhẹ: mỗi bài bớt 1 hiệp chính, tối thiểu 1', () => {
    const light = lightenTemplate(templateFor(plan, 'push')!);
    expect(light.items.every((i) => i.sets === 2)).toBe(true);
  });
  it('lịch thực tế: Legs T7 + cầu lông T6 → xung đột', () => {
    expect(actualLegsBadmintonConflicts([{ date: '2026-10-30', kind: 'badminton' }, { date: '2026-10-31', kind: 'legs' }])).toHaveLength(1);
    expect(actualLegsBadmintonConflicts([{ date: '2026-10-29', kind: 'badminton' }, { date: '2026-10-31', kind: 'legs' }])).toHaveLength(0);
  });
});

describe('warmup (§4.8)', () => {
  const pull = parsePlanContent(PLAN_V1).templates.find((t) => t.key === 'pull')!;
  it('máy kéo xô: 2 làm nóng 25kg × 10 + 3 hiệp chính 35kg', () => {
    const ps = plannedSets(pull.items[0], 5, null);
    expect(ps.map((p) => `${p.setType[0]}${p.index}:${p.targetKg}`)).toEqual(['w1:25', 'w2:25', 'w1:35', 'w2:35', 'w3:35']);
  });
  it('pct + "same": 75% làm tròn theo bước, số lần = rep_max; chưa có tạ → null', () => {
    const push = parsePlanContent(PLAN_V1).templates.find((t) => t.key === 'push')!;
    expect(plannedSets(push.items[0], 5, 27).slice(0, 2).map((p) => [p.targetKg, p.repMax])).toEqual([[20, 12], [20, 12]]);
    expect(plannedSets(push.items[0], 5, null)[0].targetKg).toBeNull();
  });
  it('bài giây không sinh hiệp làm nóng; [] không làm nóng', () => {
    const legs = parsePlanContent(PLAN_V1).templates.find((t) => t.key === 'legs')!;
    const timed = { ...legs.items[0], unit: 'seconds' as const, rep_min: 30, rep_max: 45 };
    expect(plannedSets(timed, 0, null).every((p) => p.setType === 'working')).toBe(true);
    expect(plannedSets(pull.items[2], 5, null).filter((p) => p.setType === 'warmup')).toHaveLength(0);
  });
});

describe('progression + kg thực tế', () => {
  const planned = { setType: 'working' as const, index: 2, targetKg: 35, repMin: 8, repMax: 10 };
  it('kg mục tiêu khi chưa đổi kg', () => {
    expect(prefillKg(planned, [set({ weight_kg: 35, set_index: 1 })], null)).toBe(35);
  });
  it('hiệp trước đổi kg (nặng quá) → hiệp sau theo kg mới', () => {
    expect(prefillKg(planned, [set({ weight_kg: 30, target_kg: 35, kg_change_reason: 'too_heavy' })], null)).toBe(30);
  });
  it('không có mục tiêu → kg lần trước', () => {
    expect(prefillKg({ ...planned, targetKg: null }, [], { date: '2026-10-26', sets: [set({ weight_kg: 27 })] })).toBe(27);
  });
  it('kgDeviates + gợi ý tăng tạ chỉ khi chưa có target_kg', () => {
    expect(kgDeviates(35, 30)).toBe(true);
    expect(kgDeviates(null, 30)).toBe(false);
    const push = parsePlanContent(PLAN_V1).templates[0].items[0];
    const last = { date: '2026-10-26', sets: [set({ weight_kg: 27, reps: 12, set_index: 3 })] };
    expect(progressionHint(push, last, 5)).toContain('32');
    expect(progressionHint({ ...push, target_kg: 30 }, last, 5)).toBeNull();
  });
});

describe('khối lượng', () => {
  it('không tính làm nóng, kg trống, hiệp chưa xong', () => {
    const sets = [
      set({ set_type: 'warmup', weight_kg: 20, reps: 12 }),
      set({ weight_kg: 27, reps: 12 }), set({ weight_kg: 27, reps: 12 }), set({ weight_kg: 27, reps: 12 }),
      set({ weight_kg: 20, reps: 8 }), set({ weight_kg: 20, reps: 8 }), set({ weight_kg: 20, reps: 8 }),
      set({ weight_kg: null, reps: 12 }),
      set({ weight_kg: 50, reps: 10, completed: false }),
    ];
    expect(volumeKg(sets)).toBe(1452);
  });
});

describe('plan-diff', () => {
  const a = parsePlanContent(PLAN_V1);
  const names = (s: string) => s;
  it('đổi thứ tự không bị hiểu là bớt + thêm', () => {
    const b = structuredClone(a);
    b.templates[1].items.reverse();
    const d = diffPlans(a, b, names);
    expect(d.some((x) => x.kind === 'order')).toBe(true);
    expect(d.some((x) => x.kind === 'added' || x.kind === 'removed')).toBe(false);
  });
  it('thay bài, đổi tạ, đổi calo, bài mới', () => {
    const b = structuredClone(a);
    b.templates[1].items[0].exercise = 'assisted_pull_up';
    b.templates[1].items[1].target_kg = 35;
    b.nutrition.calories_kcal = 1800;
    b.exercise_upserts = [{ slug: 'cable_fly', name_vi: 'Ép ngực cáp', aliases: [], primary_muscle: 'chest', secondary_muscles: [], movement_pattern: 'isolation_push', kind: 'isolation', equipment: 'cable', load_step_kg: 2.5, is_time_based: false, cues: [], common_mistakes: [] }];
    const d = diffPlans(a, b, names);
    expect(d.find((x) => x.kind === 'replaced')?.text).toBe('lat_pulldown → assisted_pull_up');
    expect(d.find((x) => x.kind === 'target_kg')?.text).toContain('30 kg → 35 kg');
    expect(d.find((x) => x.kind === 'nutrition')?.text).toContain('(-100)');
    expect(d.some((x) => x.kind === 'exercise_new')).toBe(true);
  });
});

describe('đổi bài + tìm bài', () => {
  const lib = fs.readdirSync(path.resolve(import.meta.dirname, '../../supabase/seed/exercises'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ id: f, available_at_gym: true, archived: false, ...JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../supabase/seed/exercises', f), 'utf8')) }));
  const by = (s: string) => lib.find((e) => e.slug === s)!;
  it('alternatives trước, rồi cùng movement_pattern + nhóm cơ; bỏ bài không có máy', () => {
    const lib2 = lib.map((e) => (e.slug === 'one_arm_db_row' ? { ...e, available_at_gym: false } : e));
    const s = suggestSubstitutes(by('chest_supported_machine_row'), ['one_arm_db_row', 'seated_cable_row'], lib2);
    expect(s[0].slug).toBe('seated_cable_row');
    expect(s.some((e) => e.slug === 'one_arm_db_row')).toBe(false);
  });
  it('gõ không dấu tìm được theo alias', () => {
    expect(searchExercises('day nguc', lib)[0].slug).toBe('machine_chest_press');
    expect(exactMatch('tay sau', lib)?.slug).toBe('machine_triceps_extension');
    expect(exactMatch('máy kéo xô hãng X', lib)).toBeUndefined();
  });
});

describe('svg-validate', () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200"><rect/></svg>';
  it('hình seed hợp lệ, hình độc hại bị chặn', () => {
    expect(validateSvg(ok)).toEqual([]);
    expect(validateSvg(ok.replace('<rect/>', '<script>alert(1)</script>'))).not.toEqual([]);
    expect(validateSvg(ok.replace('<rect/>', '<rect onload="x()"/>'))).not.toEqual([]);
    expect(validateSvg(ok.replace('<rect/>', '<image href="https://x.y/a.png"/>'))).not.toEqual([]);
    expect(validateSvg(ok.replace('<rect/>', 'x'.repeat(16_000)))).not.toEqual([]);
  });
});

describe('cân nặng', () => {
  const logs = [
    { log_date: '2026-10-26', weight_kg: 81.7 },
    { log_date: '2026-11-02', weight_kg: 81.1 },
    { log_date: '2026-11-09', weight_kg: 81.2 },
    { log_date: '2026-11-16', weight_kg: 81.3 },
  ];
  it('2 tuần liên tiếp không giảm → cảnh báo', () => {
    expect(weeksWithoutLoss(weeklyWeights(logs))).toBe(2);
  });
  it('đánh giá tốc độ + gợi ý calo không dưới 1.700', () => {
    expect(lossRateVerdict(-0.6)).toBe('ok');
    expect(lossRateVerdict(-0.2)).toBe('slow');
    expect(lossRateVerdict(-1.0)).toBe('fast');
    expect(stallSuggestion(1900).newCalories).toBe(1750);
    expect(stallSuggestion(1750).newCalories).toBe(1700);
    expect(stallSuggestion(1700).atFloor).toBe(true);
  });
});

describe('nhắc nhở', () => {
  it('T2 06:30 nhắc cân, 10:00 nhắc review; không chứa số liệu', () => {
    const ctx = { date: '2026-11-02', isoWeekday: 1, todaySession: null, daysSinceInbody: 7, daysSincePhotos: 3, goalDaysLeft: [53] };
    expect(dueReminders(DEFAULT_REMINDERS, { ...ctx, minuteOfDay: 6 * 60 + 30 }).map((r) => r.kind)).toEqual(['weigh_in', 'measurements']);
    const review = dueReminders(DEFAULT_REMINDERS, { ...ctx, minuteOfDay: 600 });
    expect(review.map((r) => r.kind)).toEqual(['water', 'weekly_review']);
    expect(JSON.stringify(review)).not.toMatch(/\d+[.,]?\d*\s?kg/);
  });
});

describe('máy chia nấc lb (Matrix)', () => {
  it('logs pins as whole kg: 40/50/60/70/80 lb = 18/23/27/32/36', () => {
    expect([40, 50, 60, 70, 80].map(lbToKg)).toEqual([18, 23, 27, 32, 36]);
    expect([18, 23, 27, 32, 36].map(kgToLb)).toEqual([40, 50, 60, 70, 80]);
  });
  it('steps pin to pin, also from a kg between pins', () => {
    expect(stackStep(27, 1)).toBe(32);
    expect(stackStep(27, -1)).toBe(23);
    expect(stackStep(25, 1)).toBe(27);
    expect(stackStep(25, -1)).toBe(23);
    expect(stackStep(20, 1)).toBe(23);
    expect(stackStep(20, -1)).toBe(18);
    expect(stackStep(5, -1)).toBe(5);
    expect(stackStep(null, 1)).toBe(18);
  });
  it('chips around the current load', () => {
    expect(pinsAround(27).map((p) => p.lb)).toEqual([40, 50, 60, 70, 80]);
    expect(pinsAround(5).map((p) => p.lb)).toEqual([10, 20, 30, 40, 50]);
  });
  it('warm-up % and the +1 hint land on a pin', () => {
    expect(roundLoad(27 * 0.75, 4.5)).toBe(18);
    expect(roundLoad(32 * 0.75, 4.5)).toBe(23);
    expect(roundLoad(27 * 0.75, 2.5)).toBe(20);
    const item = { ...PLAN_V1.templates[0].items[0], target_kg: null, rep_max: 12, unit: 'reps' as const };
    expect(progressionHint(item, { date: '2026-10-27', sets: [set({ weight_kg: 27, reps: 12 })] }, 4.5)).toContain('32 kg');
    expect(progressionHint(item, { date: '2026-10-27', sets: [set({ weight_kg: 27, reps: 12 })] }, 2.5)).toContain('29,5 kg');
  });
});

describe('kỷ lục + tiến độ', () => {
  const prev = [set({ weight_kg: 23, reps: 12 }), set({ weight_kg: 27, reps: 8 }), set({ exercise_id: 'b', weight_kg: 35, reps: 10 })];
  it('heavier than ever → kg record; more reps at that load → reps record; first time → none', () => {
    const cur = [
      set({ id: 'k', weight_kg: 32, reps: 6 }),
      set({ exercise_id: 'b', weight_kg: 35, reps: 10 }),
      set({ id: 'r', exercise_id: 'b', weight_kg: 35, reps: 12 }),
      set({ exercise_id: 'new', weight_kg: 50, reps: 10 }),
    ];
    expect(personalRecords(cur, prev)).toEqual([
      { exerciseId: 'e', setId: 'k', kind: 'kg', kg: 32, reps: 6, prevKg: 27, prevReps: null },
      { exerciseId: 'b', setId: 'r', kind: 'reps', kg: 35, reps: 12, prevKg: null, prevReps: 10 },
    ]);
  });
  it('reps records only at a load done before; warm-ups and empty kg are ignored', () => {
    expect(personalRecords([set({ weight_kg: 23, reps: 12 }), set({ weight_kg: 40, reps: 1, set_type: 'warmup' }), set({ weight_kg: null, reps: 20 })], prev)).toEqual([]);
    expect(personalRecords([set({ weight_kg: 25, reps: 13 })], prev)).toEqual([]);
    expect(personalRecords([set({ weight_kg: 23, reps: 13 })], prev)).toMatchObject([{ kind: 'reps', kg: 23, reps: 13, prevReps: 12 }]);
  });
  it('merges provisional exercises into their canonical one', () => {
    const canon = (id: string) => (id === 'dup' ? 'e' : id);
    expect(personalRecords([set({ exercise_id: 'dup', weight_kg: 27, reps: 9 })], prev, canon)).toMatchObject([{ exerciseId: 'e', kind: 'reps' }]);
  });

  const session = (id: string, date: string, status: SessionRow['status'] = 'completed') => ({ id, session_date: date, status }) as SessionRow;
  it('strength: first vs latest top set, only exercises done twice, completed sessions only', () => {
    const sessions = [session('s1', '2026-10-26'), session('s2', '2026-11-02'), session('s3', '2026-11-09', 'in_progress')];
    const sets = [
      set({ session_id: 's1', weight_kg: 20, reps: 12, set_type: 'warmup' }),
      set({ session_id: 's1', weight_kg: 27, reps: 12 }),
      set({ session_id: 's2', weight_kg: 32, reps: 8 }),
      set({ session_id: 's3', weight_kg: 50, reps: 8 }),
      set({ session_id: 's1', exercise_id: 'b', weight_kg: 35, reps: 10 }),
      set({ session_id: 's2', exercise_id: 'b', weight_kg: 35, reps: 12 }),
      set({ session_id: 's2', exercise_id: 'once', weight_kg: 10, reps: 10 }),
    ];
    expect(strengthChanges(sessions, sets)).toEqual([
      { exerciseId: 'e', first: { date: '2026-10-26', kg: 27, reps: 12 }, last: { date: '2026-11-02', kg: 32, reps: 8 }, pct: 19 },
      { exerciseId: 'b', first: { date: '2026-10-26', kg: 35, reps: 10 }, last: { date: '2026-11-02', kg: 35, reps: 12 }, pct: 0 },
    ]);
  });
  it('body: weekly averages need two weeks; waist needs two entries', () => {
    const one = bodyChange([{ log_date: '2026-10-26', weight_kg: 81.7 }, { log_date: '2026-10-28', weight_kg: 80 }], [{ log_date: '2026-10-26', waist_navel_cm: 95 }]);
    expect(one).toEqual({ weight: null, weightThisWeek: 80.85, waist: null });
    const two = bodyChange(
      [{ log_date: '2026-10-26', weight_kg: 81.7 }, { log_date: '2026-10-28', weight_kg: 80 }, { log_date: '2026-11-02', weight_kg: 80.2 }],
      [{ log_date: '2026-10-26', waist_navel_cm: 95 }, { log_date: '2026-11-02', waist_navel_cm: null }, { log_date: '2026-11-09', waist_navel_cm: 93.5 }],
    );
    expect(two.weight).toEqual({ firstWeek: '2026-10-26', firstAvg: 80.85, lastAvg: 80.2, delta: -0.6, weeks: 2 });
    expect(two.waist).toEqual({ firstDate: '2026-10-26', first: 95, last: 93.5, delta: -1.5 });
  });
});
