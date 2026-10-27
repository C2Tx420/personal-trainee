import type { PlanContent } from '../../src/engine/plan-schema';

/**
 * Plan v1 — week of 26/10–01/11/2026 (plan v2.4 §4.4). Claude Code's first exercise
 * selection: machines first, 2 warm-up sets + 3 working sets for compound lifts, target
 * loads estimated from body metrics + the 26/10 Push session.
 */

const pushPullWarmup = {
  cardio: { exercise: 'treadmill_walk', minutes: 10, speed_kmh_min: 3.5, speed_kmh_max: 5 },
  mobility: ['Xoay vai 10 lần mỗi chiều', 'Band pull-apart 15 lần'],
};

const W75 = [
  { pct: 75, reps: 'same' as const },
  { pct: 75, reps: 'same' as const },
];

export const PLAN_V1: PlanContent = {
  schema: 'plan-content/1',
  schedule: {
    mon: { kind: 'session', template: 'push' },
    tue: { kind: 'session', template: 'pull' },
    wed: { kind: 'rest' },
    thu: {
      kind: 'badminton',
      minutes_min: 60,
      minutes_max: 90,
      intensity: 'light',
      warmup: { cardio: null, mobility: ['Xoay cổ chân, gối, hông', 'Xoay vai, cổ tay', 'Bước chân sang ngang 1 phút'], minutes: 8 },
    },
    fri: { kind: 'rest' },
    sat: { kind: 'session', template: 'legs' },
    sun: { kind: 'optional', options: ['walk', 'zone2', 'core', 'push_light', 'pull_light'] },
  },
  templates: [
    {
      key: 'push',
      name: 'Push',
      warmup: pushPullWarmup,
      items: [
        { exercise: 'machine_chest_press', alternatives: ['bench_press', 'incline_db_press'], sets: 3, warmup_sets: W75, rep_min: 10, rep_max: 12, unit: 'reps', rest_sec_min: 120, rest_sec_max: 120, target_kg: null, target_kg_per_set: null, coach_note: '', note: '' },
        { exercise: 'machine_shoulder_press', alternatives: ['seated_db_shoulder_press'], sets: 3, warmup_sets: W75, rep_min: 8, rep_max: 10, unit: 'reps', rest_sec_min: 120, rest_sec_max: 120, target_kg: null, target_kg_per_set: null, coach_note: '', note: '' },
        { exercise: 'pec_deck_fly', alternatives: ['incline_db_press'], sets: 3, warmup_sets: [], rep_min: 12, rep_max: 15, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: null, target_kg_per_set: null, coach_note: '', note: '' },
        { exercise: 'db_lateral_raise', alternatives: ['cable_lateral_raise'], sets: 3, warmup_sets: [], rep_min: 12, rep_max: 15, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: null, target_kg_per_set: null, coach_note: '', note: '' },
        { exercise: 'machine_triceps_extension', alternatives: ['triceps_pushdown'], sets: 3, warmup_sets: [], rep_min: 10, rep_max: 12, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: null, target_kg_per_set: null, coach_note: '', note: '' },
      ],
    },
    {
      key: 'pull',
      name: 'Pull',
      warmup: pushPullWarmup,
      items: [
        { exercise: 'lat_pulldown', alternatives: ['assisted_pull_up', 'pull_up'], sets: 3, warmup_sets: [{ kg: 25, reps: 10 }, { kg: 25, reps: 10 }], rep_min: 8, rep_max: 10, unit: 'reps', rest_sec_min: 120, rest_sec_max: 120, target_kg: 35, target_kg_per_set: null, coach_note: 'Tuần hiệu chỉnh: hiệp cuối còn dư 1–2 lần là đúng mức', note: '' },
        { exercise: 'chest_supported_machine_row', alternatives: ['one_arm_db_row', 'seated_cable_row'], sets: 3, warmup_sets: [{ kg: 20, reps: 10 }, { kg: 20, reps: 10 }], rep_min: 8, rep_max: 10, unit: 'reps', rest_sec_min: 120, rest_sec_max: 120, target_kg: 30, target_kg_per_set: null, coach_note: 'Máy lắp bánh: 10kg mỗi bên', note: '' },
        { exercise: 'seated_cable_row', alternatives: ['one_arm_db_row'], sets: 3, warmup_sets: [], rep_min: 10, rep_max: 12, unit: 'reps', rest_sec_min: 90, rest_sec_max: 90, target_kg: 30, target_kg_per_set: null, coach_note: '', note: '' },
        { exercise: 'face_pull', alternatives: ['reverse_pec_deck'], sets: 3, warmup_sets: [], rep_min: 12, rep_max: 15, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: 12.5, target_kg_per_set: null, coach_note: '', note: '' },
        { exercise: 'machine_biceps_curl', alternatives: ['cable_curl', 'db_curl'], sets: 3, warmup_sets: [], rep_min: 10, rep_max: 12, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: 15, target_kg_per_set: null, coach_note: 'Curl cáp: bắt đầu 10kg', note: '' },
      ],
    },
    {
      key: 'legs',
      name: 'Legs',
      warmup: {
        cardio: { exercise: 'treadmill_walk', minutes: 10, speed_kmh_min: 3.5, speed_kmh_max: 5 },
        mobility: ['Xoay hông 10 lần mỗi chiều', '10 squat tay không'],
      },
      items: [
        { exercise: 'leg_press', alternatives: ['hack_squat', 'goblet_squat'], sets: 3, warmup_sets: [{ kg: 30, reps: 12 }, { kg: 30, reps: 12 }], rep_min: 10, rep_max: 12, unit: 'reps', rest_sec_min: 120, rest_sec_max: 120, target_kg: 40, target_kg_per_set: null, coach_note: 'kg = bánh lắp thêm (20/bên), chưa tính bàn trượt. Máy khối tạ: 70kg', note: '' },
        { exercise: 'hack_squat', alternatives: ['goblet_squat', 'smith_squat'], sets: 3, warmup_sets: [{ kg: 0, reps: 10 }, { kg: 0, reps: 10 }], rep_min: 8, rep_max: 10, unit: 'reps', rest_sec_min: 120, rest_sec_max: 120, target_kg: 20, target_kg_per_set: null, coach_note: 'kg = bánh thêm (10/bên); làm nóng chỉ bàn trượt. Goblet squat: tạ đơn 16kg', note: '' },
        { exercise: 'leg_curl', alternatives: ['romanian_deadlift'], sets: 3, warmup_sets: [], rep_min: 10, rep_max: 12, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: 20, target_kg_per_set: null, coach_note: '', note: '' },
        { exercise: 'back_extension_45', alternatives: ['romanian_deadlift'], sets: 3, warmup_sets: [], rep_min: 12, rep_max: 15, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: 0, target_kg_per_set: null, coach_note: 'Thân người; dư sức thì ôm bánh 5kg', note: '' },
        { exercise: 'calf_raise', alternatives: [], sets: 3, warmup_sets: [], rep_min: 12, rep_max: 15, unit: 'reps', rest_sec_min: 60, rest_sec_max: 60, target_kg: 40, target_kg_per_set: null, coach_note: 'Máy ngồi: 20kg', note: '' },
        { exercise: 'plank', alternatives: ['dead_bug'], sets: 3, warmup_sets: [], rep_min: 30, rep_max: 45, unit: 'seconds', rest_sec_min: 60, rest_sec_max: 60, target_kg: null, target_kg_per_set: null, coach_note: '', note: '' },
      ],
    },
  ],
  exercise_upserts: [],
  nutrition: { calories_kcal: 1900, protein_g: 140, carb_g: 190, fat_g: 65 },
  hydration: { water_ml_min: 2000, water_ml_max: 3000 },
  activity: { steps_min: 8000, steps_max: 10000, rest_day_steps_min: 2000, rest_day_steps_max: 3000 },
  sleep: { hours_min: 7, hours_max: 8 },
  weight_loss: { kg_per_week_min: 0.5, kg_per_week_max: 0.7 },
  badminton: { kcal_per_30min: { light: 185, moderate: 240, hard: 300 } },
};
