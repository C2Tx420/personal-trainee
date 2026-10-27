import { z } from 'zod';
import { WEEKDAYS, type Weekday } from './dates';

/**
 * Schema `plan-content/1` — nội dung đầy đủ của một phiên bản lộ trình.
 *
 * Dùng chung cho app (validate trước khi lưu/duyệt), script coach (validate
 * trước khi gửi draft) và build-seed. JSON Schema cho coach được xuất từ đây.
 */

export const CALORIES_FLOOR = 1700;
export const MAX_SAFE_LOSS_KG_PER_WEEK = 0.7;

export const slugSchema = z.string().regex(/^[a-z0-9_]+$/, 'slug chỉ gồm a-z, 0-9, _');

export const MUSCLES = [
  'chest', 'front_delt', 'side_delt', 'rear_delt', 'lats', 'upper_back', 'traps',
  'biceps', 'triceps', 'forearms', 'quads', 'hamstrings', 'glutes', 'calves',
  'abs', 'obliques', 'lower_back', 'cardio',
] as const;
export const MOVEMENT_PATTERNS = [
  'horizontal_push', 'vertical_push', 'horizontal_pull', 'vertical_pull', 'squat', 'hinge',
  'isolation_push', 'isolation_pull', 'isolation_legs', 'core', 'cardio',
] as const;
export const EXERCISE_KINDS = ['compound', 'isolation', 'core', 'cardio'] as const;
export const EQUIPMENT = ['machine', 'cable', 'dumbbell', 'barbell', 'bodyweight', 'smith', 'cardio_machine', 'none'] as const;

export const exerciseDefSchema = z.object({
  slug: slugSchema,
  name_vi: z.string().min(2),
  aliases: z.array(z.string()).default([]),
  primary_muscle: z.enum(MUSCLES),
  secondary_muscles: z.array(z.enum(MUSCLES)).default([]),
  movement_pattern: z.enum(MOVEMENT_PATTERNS),
  kind: z.enum(EXERCISE_KINDS),
  equipment: z.enum(EQUIPMENT),
  load_step_kg: z.number().nonnegative().default(2.5),
  is_time_based: z.boolean().default(false),
  cues: z.array(z.string()).default([]),
  common_mistakes: z.array(z.string()).default([]),
  illustration_svg: z.string().nullable().optional(),
  reference_url: z.string().url().nullable().optional(),
  archived: z.boolean().optional(),
  available_at_gym: z.boolean().optional(),
  canonical_slug: slugSchema.nullable().optional(),
});
export type ExerciseDef = z.infer<typeof exerciseDefSchema>;

export const warmupSetSchema = z
  .object({
    pct: z.number().min(10).max(100).optional(),
    kg: z.number().nonnegative().optional(),
    reps: z.union([z.number().int().positive(), z.literal('same')]),
  })
  .refine((w) => w.pct !== undefined || w.kg !== undefined, 'hiệp làm nóng cần pct hoặc kg');
export type WarmupSet = z.infer<typeof warmupSetSchema>;

export const planItemSchema = z
  .object({
    exercise: slugSchema,
    alternatives: z.array(slugSchema).default([]),
    sets: z.number().int().min(1).max(10),
    warmup_sets: z.array(warmupSetSchema).default([]),
    rep_min: z.number().int().positive(),
    rep_max: z.number().int().positive(),
    unit: z.enum(['reps', 'seconds']).default('reps'),
    rest_sec_min: z.number().int().positive(),
    rest_sec_max: z.number().int().positive(),
    target_kg: z.number().nonnegative().nullable().default(null),
    target_kg_per_set: z.array(z.number().nonnegative()).nullable().default(null),
    coach_note: z.string().default(''),
    note: z.string().default(''),
  })
  .refine((i) => i.rep_min <= i.rep_max, 'rep_min phải ≤ rep_max')
  .refine((i) => i.rest_sec_min <= i.rest_sec_max, 'rest_sec_min phải ≤ rest_sec_max')
  .refine(
    (i) => i.target_kg_per_set === null || i.target_kg_per_set.length === i.sets,
    'target_kg_per_set phải có đúng số phần tử = sets',
  );
export type PlanItem = z.infer<typeof planItemSchema>;

export const cardioWarmupSchema = z.object({
  exercise: slugSchema,
  minutes: z.number().positive(),
  speed_kmh_min: z.number().positive().nullable().default(null),
  speed_kmh_max: z.number().positive().nullable().default(null),
});

export const templateWarmupSchema = z.object({
  cardio: cardioWarmupSchema.nullable().default(null),
  mobility: z.array(z.string()).default([]),
  minutes: z.number().positive().optional(),
});
export type TemplateWarmup = z.infer<typeof templateWarmupSchema>;

export const TEMPLATE_KEYS = ['push', 'pull', 'legs'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

export const templateSchema = z.object({
  key: z.enum(TEMPLATE_KEYS),
  name: z.string(),
  warmup: templateWarmupSchema,
  items: z.array(planItemSchema).min(1),
});
export type PlanTemplate = z.infer<typeof templateSchema>;

export const SUNDAY_OPTIONS = ['walk', 'zone2', 'core', 'push_light', 'pull_light'] as const;
export type SundayOption = (typeof SUNDAY_OPTIONS)[number];

export const INTENSITIES = ['light', 'moderate', 'hard'] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const dayPlanSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('session'), template: z.enum(TEMPLATE_KEYS) }),
  z.object({ kind: z.literal('rest') }),
  z.object({
    kind: z.literal('badminton'),
    minutes_min: z.number().int().positive(),
    minutes_max: z.number().int().positive(),
    intensity: z.enum(INTENSITIES),
    warmup: templateWarmupSchema.optional(),
  }),
  z.object({ kind: z.literal('optional'), options: z.array(z.enum(SUNDAY_OPTIONS)).min(1) }),
]);
export type DayPlan = z.infer<typeof dayPlanSchema>;

const scheduleShape = Object.fromEntries(WEEKDAYS.map((d) => [d, dayPlanSchema])) as Record<
  Weekday,
  typeof dayPlanSchema
>;

export const planContentSchema = z.object({
  schema: z.literal('plan-content/1'),
  schedule: z.object(scheduleShape),
  templates: z.array(templateSchema).min(1),
  exercise_upserts: z.array(exerciseDefSchema).default([]),
  nutrition: z.object({
    calories_kcal: z.number().int().min(CALORIES_FLOOR, `calo không được dưới ${CALORIES_FLOOR}`),
    protein_g: z.number().int().positive(),
    carb_g: z.number().int().positive(),
    fat_g: z.number().int().positive(),
  }),
  hydration: z.object({ water_ml_min: z.number().int(), water_ml_max: z.number().int() }),
  activity: z.object({
    steps_min: z.number().int(),
    steps_max: z.number().int(),
    rest_day_steps_min: z.number().int(),
    rest_day_steps_max: z.number().int(),
  }),
  sleep: z.object({ hours_min: z.number(), hours_max: z.number() }),
  weight_loss: z.object({
    kg_per_week_min: z.number().positive(),
    kg_per_week_max: z.number().positive().max(MAX_SAFE_LOSS_KG_PER_WEEK),
  }),
  badminton: z.object({
    kcal_per_30min: z.object({ light: z.number(), moderate: z.number(), hard: z.number() }),
  }),
});
export type PlanContent = z.infer<typeof planContentSchema>;

export type PlanIssue = { level: 'error' | 'warning'; message: string };

/**
 * Kiểm tra ràng buộc nghiệp vụ ngoài schema: rule lịch, bài tham chiếu có tồn tại.
 * `knownSlugs` = slug trong thư viện hiện có (bài trong `exercise_upserts` được tính thêm).
 */
export function validatePlanRules(content: PlanContent, knownSlugs: Iterable<string>): PlanIssue[] {
  const issues: PlanIssue[] = [];
  const slugs = new Set(knownSlugs);
  for (const e of content.exercise_upserts) slugs.add(e.slug);

  const sun = content.schedule.sun;
  if (sun.kind === 'session' && sun.template === 'legs') {
    issues.push({ level: 'error', message: 'Chủ nhật không được gán Legs' });
  }

  const templateKeys = new Set(content.templates.map((t) => t.key));
  for (const day of WEEKDAYS) {
    const p = content.schedule[day];
    if (p.kind === 'session' && !templateKeys.has(p.template)) {
      issues.push({ level: 'error', message: `Lịch ${day} tham chiếu buổi "${p.template}" không có trong templates` });
    }
  }

  for (const [a, b] of legsBadmintonAdjacency(content.schedule)) {
    issues.push({
      level: 'error',
      message: `Legs (${a}) và cầu lông (${b}) nằm 2 ngày liền nhau — cần cách ít nhất 1 ngày`,
    });
  }

  for (const t of content.templates) {
    for (const item of t.items) {
      for (const s of [item.exercise, ...item.alternatives]) {
        if (!slugs.has(s)) issues.push({ level: 'error', message: `${t.name}: bài "${s}" không có trong thư viện` });
      }
    }
  }
  return issues;
}

/** Các cặp (ngày Legs, ngày cầu lông) liền kề nhau, tính vòng tuần (CN liền T2). */
export function legsBadmintonAdjacency(schedule: PlanContent['schedule']): [Weekday, Weekday][] {
  const legs = WEEKDAYS.filter((d) => {
    const p = schedule[d];
    return p.kind === 'session' && p.template === 'legs';
  });
  const badminton = WEEKDAYS.filter((d) => schedule[d].kind === 'badminton');
  const out: [Weekday, Weekday][] = [];
  for (const l of legs) {
    for (const b of badminton) {
      const gap = Math.abs(WEEKDAYS.indexOf(l) - WEEKDAYS.indexOf(b));
      if (gap === 1 || gap === 6 || gap === 0) out.push([l, b]);
    }
  }
  return out;
}

export function parsePlanContent(raw: unknown): PlanContent {
  return planContentSchema.parse(raw);
}
