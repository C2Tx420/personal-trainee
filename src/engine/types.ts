import type { IsoDate } from './dates';
import type { PlanItem } from './plan-schema';
import type { SessionKind } from './schedule';

/** Kiểu dòng dữ liệu dùng chung giữa app, engine và script coach (khớp bảng Postgres). */

export type ExerciseRow = {
  id: string;
  slug: string;
  name_vi: string;
  aliases: string[];
  primary_muscle: string;
  secondary_muscles: string[];
  movement_pattern: string;
  kind: string;
  equipment: string;
  load_step_kg: number;
  is_time_based: boolean;
  cues: string[];
  common_mistakes: string[];
  illustration_svg: string | null;
  reference_url: string | null;
  archived: boolean;
  available_at_gym: boolean;
  unavailable_note: string | null;
  is_provisional: boolean;
  canonical_exercise_id: string | null;
  updated_by_plan_version_id?: string | null;
  created_at?: string;
};

export type WarmupLog = {
  cardio: {
    exercise: string;
    minutes: number;
    speed_kmh_min: number | null;
    speed_kmh_max: number | null;
    done: boolean;
  } | null;
  mobility_done: boolean | null;
  skipped?: boolean;
};

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export type SessionRow = {
  id: string;
  session_date: IsoDate;
  kind: SessionKind;
  status: SessionStatus;
  template_version_id: string | null;
  plan_version_id: string | null;
  is_backfill: boolean;
  template_snapshot: unknown;
  warmup: WarmupLog | null;
  started_at: string | null;
  ended_at: string | null;
  duration_min: number | null;
  badminton_intensity: 'light' | 'moderate' | 'hard' | null;
  est_kcal: number | null;
  note: string | null;
};

export type ItemStatus = 'pending' | 'in_progress' | 'done' | 'partial' | 'skipped';
export type SubstitutionReason = 'unavailable' | 'busy' | 'pain' | 'preference';

export type SessionItemRow = {
  id: string;
  session_id: string;
  position: number;
  template_item_position: number | null;
  planned_exercise_id: string | null;
  exercise_id: string;
  status: ItemStatus;
  substitution_reason: SubstitutionReason | null;
  substitution_note: string | null;
  skip_reason: string | null;
  deferred: boolean;
  /** item của lộ trình lúc bắt đầu (số hiệp, khoảng lần, kg mục tiêu, làm nóng). */
  target: PlanItem;
  note: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type KgChangeReason = 'too_heavy' | 'too_light' | 'machine_diff' | 'pain' | 'other';
export type Feel = 'easy' | 'ok' | 'hard';

export type SetRow = {
  id: string;
  session_id: string;
  session_item_id: string;
  exercise_id: string;
  set_index: number;
  set_type: 'warmup' | 'working';
  target_kg: number | null;
  target_rep_min: number | null;
  target_rep_max: number | null;
  reps: number | null;
  weight_kg: number | null;
  seconds: number | null;
  kg_change_reason: KgChangeReason | null;
  kg_change_note: string | null;
  feel: Feel | null;
  note: string | null;
  completed: boolean;
  completed_at: string | null;
};

export const KG_CHANGE_LABEL: Record<KgChangeReason, string> = {
  too_heavy: 'Nặng quá',
  too_light: 'Nhẹ quá',
  machine_diff: 'Máy khác vạch / khác hãng',
  pain: 'Đau / mỏi',
  other: 'Khác',
};

export const FEEL_LABEL: Record<Feel, string> = { easy: 'Nhẹ', ok: 'Vừa', hard: 'Nặng' };

export const SUBSTITUTION_LABEL: Record<SubstitutionReason, string> = {
  unavailable: 'Không có máy',
  busy: 'Máy bận',
  pain: 'Đau / không hợp',
  preference: 'Đổi theo ý',
};
