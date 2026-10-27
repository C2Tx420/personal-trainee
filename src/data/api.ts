import { addDays, type IsoDate, todayVN } from '@/engine/dates';
import type { Goal } from '@/engine/goals';
import type { InbodyLog } from '@/engine/inbody';
import { type PlanContent, type PlanItem, parsePlanContent } from '@/engine/plan-schema';
import type { SessionKind } from '@/engine/schedule';
import { slugifyVi } from '@/engine/text';
import type {
  ExerciseRow,
  KgChangeReason,
  Feel,
  SessionItemRow,
  SessionRow,
  SetRow,
  SubstitutionReason,
  WarmupLog,
} from '@/engine/types';
import { must, supabase } from '@/lib/supabase';

/**
 * All of the app's Supabase reads/writes. IDs are generated on the client (crypto.randomUUID)
 * + upsert by id → tapping again / retrying on a flaky network never creates duplicates.
 */

export type PlanVersion = {
  id: string;
  version_no: number;
  status: 'draft' | 'scheduled' | 'active' | 'archived' | 'rejected';
  effective_from: IsoDate | null;
  created_by: 'user' | 'claude_code' | 'system';
  change_note: string;
  content: PlanContent;
  based_on_version_id: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  calories_kcal: number;
  created_at: string;
};

export type WeightLog = { id: string; log_date: IsoDate; weight_kg: number; note: string | null; logged_at: string };
export type MeasurementRow = { id: string; log_date: IsoDate; weight_log_id: string | null } & Record<string, number | null | string>;
export type InbodyRow = InbodyLog & { id: string };
export type PhotoRow = { id: string; taken_on: IsoDate; angle: 'front' | 'side' | 'back'; storage_path: string; width: number | null; height: number | null; bytes: number | null };
export type ReviewNote = { id: string; week_start: IsoDate; content: string; plan_version_id: string | null; is_read: boolean; created_at: string; created_by: string };
export type NotificationSetting = {
  id: string;
  kind: string;
  enabled: boolean;
  time_of_day: string | null;
  weekdays: number[] | null;
  interval_min: number | null;
  window_start: string | null;
  window_end: string | null;
};

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

// ───────────────────────── Reads
export async function fetchExercises(): Promise<ExerciseRow[]> {
  const rows = must(await supabase.from('exercises').select('*').order('name_vi'));
  return (rows as ExerciseRow[]).map((r) => ({ ...r, load_step_kg: Number(r.load_step_kg) }));
}

function toPlan(r: Record<string, unknown>): PlanVersion {
  return { ...(r as unknown as PlanVersion), content: parsePlanContent(r.content) };
}

export async function fetchPlans(): Promise<PlanVersion[]> {
  const rows = must(await supabase.from('plan_versions').select('*').order('version_no', { ascending: false }));
  return (rows as Record<string, unknown>[]).map(toPlan);
}

export async function fetchActivePlan(): Promise<PlanVersion | null> {
  const r = must(await supabase.from('plan_versions').select('*').eq('status', 'active').maybeSingle());
  return r ? toPlan(r as Record<string, unknown>) : null;
}

export async function fetchGoals(): Promise<Goal[]> {
  const rows = must(await supabase.from('goals').select('*').order('ordinal'));
  return (rows as Goal[]).map((g) => ({
    ...g,
    target_weight_min: Number(g.target_weight_min),
    target_weight_max: Number(g.target_weight_max),
    target_body_fat_min: num(g.target_body_fat_min),
    target_body_fat_max: num(g.target_body_fat_max),
  }));
}

export async function fetchWeights(): Promise<WeightLog[]> {
  const rows = must(await supabase.from('weight_logs').select('*').order('log_date').order('logged_at'));
  return (rows as WeightLog[]).map((w) => ({ ...w, weight_kg: Number(w.weight_kg) }));
}

export async function fetchMeasurements(): Promise<MeasurementRow[]> {
  const rows = must(await supabase.from('body_measurements').select('*').order('log_date'));
  return (rows as MeasurementRow[]).map((m) => {
    const out: MeasurementRow = { ...m };
    for (const [k, v] of Object.entries(m)) if (k.endsWith('_cm')) out[k] = num(v);
    return out;
  });
}

export async function fetchInbody(): Promise<InbodyRow[]> {
  const rows = must(await supabase.from('inbody_logs').select('*').order('measured_on'));
  return (rows as InbodyRow[]).map((r) => ({
    ...r,
    weight_kg: Number(r.weight_kg),
    smm_kg: num(r.smm_kg),
    pbf_pct: num(r.pbf_pct),
    visceral_fat_level: num(r.visceral_fat_level),
    whr: num(r.whr),
    ffm_kg: num(r.ffm_kg),
    bmr_kcal: num(r.bmr_kcal),
    inbody_score: num(r.inbody_score),
  }));
}

const setNum = (s: SetRow): SetRow => ({ ...s, weight_kg: num(s.weight_kg), target_kg: num(s.target_kg) });

export type TrainingData = { sessions: SessionRow[]; items: SessionItemRow[]; sets: SetRow[] };

/** Every session from roughly the last 4 months (single user → small data, loaded once). */
export async function fetchTraining(days = 120): Promise<TrainingData> {
  const from = addDays(todayVN(), -days);
  const sessions = must(
    await supabase.from('workout_sessions').select('*').gte('session_date', from).order('session_date', { ascending: false }),
  ) as SessionRow[];
  if (sessions.length === 0) return { sessions, items: [], sets: [] };
  const ids = sessions.map((s) => s.id);
  const [items, sets] = await Promise.all([
    supabase.from('workout_session_items').select('*').in('session_id', ids).order('position'),
    supabase.from('workout_sets').select('*').in('session_id', ids).order('set_index'),
  ]);
  return { sessions, items: must(items) as SessionItemRow[], sets: (must(sets) as SetRow[]).map(setNum) };
}

export async function fetchSessionDetail(id: string): Promise<{ session: SessionRow; items: SessionItemRow[]; sets: SetRow[] }> {
  const [s, items, sets] = await Promise.all([
    supabase.from('workout_sessions').select('*').eq('id', id).single(),
    supabase.from('workout_session_items').select('*').eq('session_id', id).order('position'),
    supabase.from('workout_sets').select('*').eq('session_id', id).order('set_index'),
  ]);
  return { session: must(s) as SessionRow, items: must(items) as SessionItemRow[], sets: (must(sets) as SetRow[]).map(setNum) };
}

export async function fetchInProgress(): Promise<SessionRow | null> {
  return must(await supabase.from('workout_sessions').select('*').eq('status', 'in_progress').maybeSingle()) as SessionRow | null;
}

/** Set history of one exercise (for "last time" + the history table). */
export async function fetchExerciseHistory(exerciseIds: string[]): Promise<{ date: IsoDate; sessionId: string; sets: SetRow[] }[]> {
  if (exerciseIds.length === 0) return [];
  const sets = (must(
    await supabase.from('workout_sets').select('*, workout_sessions!inner(session_date, status)').in('exercise_id', exerciseIds).order('set_index'),
  ) as (SetRow & { workout_sessions: { session_date: IsoDate; status: string } })[]).map((s) => setNum(s));
  const by = new Map<string, { date: IsoDate; sessionId: string; sets: SetRow[] }>();
  for (const s of sets as (SetRow & { workout_sessions: { session_date: IsoDate } })[]) {
    const g = by.get(s.session_id) ?? { date: s.workout_sessions.session_date, sessionId: s.session_id, sets: [] };
    g.sets.push(s);
    by.set(s.session_id, g);
  }
  return [...by.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function fetchPhotos(): Promise<PhotoRow[]> {
  return must(await supabase.from('progress_photos').select('*').order('taken_on', { ascending: false })) as PhotoRow[];
}

export async function fetchReviews(): Promise<ReviewNote[]> {
  return must(await supabase.from('review_notes').select('*').order('created_at', { ascending: false })) as ReviewNote[];
}

export async function fetchNotificationSettings(): Promise<NotificationSetting[]> {
  return must(await supabase.from('notification_settings').select('*').order('kind')) as NotificationSetting[];
}

export async function fetchAppMeta(): Promise<Record<string, string>> {
  const rows = must(await supabase.from('app_meta').select('*')) as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ───────────────────────── App startup
export async function bootstrap(): Promise<void> {
  must(await supabase.rpc('bootstrap_user'));
  await supabase.rpc('activate_my_due_plans');
}

export async function verifyPin(pin: string): Promise<{ ok: boolean; attempts_left: number; locked_out: boolean }> {
  const { data, error } = await supabase.functions.invoke('verify-pin', { body: { pin } });
  if (error) throw new Error('Không kiểm tra được PIN — kiểm tra kết nối mạng');
  return data;
}

// ───────────────────────── Sessions
export type StartArgs = {
  kind: SessionKind;
  date: IsoDate;
  plan: PlanVersion;
  items: PlanItem[];
  templateKey: 'push' | 'pull' | 'legs';
  exercises: ExerciseRow[];
};

export async function startSession({ kind, date, plan, items, templateKey, exercises }: StartArgs): Promise<string> {
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));
  const tmpl = must(
    await supabase.from('session_templates').select('id').eq('plan_version_id', plan.id).eq('key', templateKey).maybeSingle(),
  ) as { id: string } | null;
  const id = crypto.randomUUID();
  const template = plan.content.templates.find((t) => t.key === templateKey);
  must(
    await supabase.from('workout_sessions').insert({
      id,
      session_date: date,
      kind,
      status: 'in_progress',
      template_version_id: tmpl?.id ?? null,
      plan_version_id: plan.id,
      template_snapshot: { ...template, items },
      started_at: new Date().toISOString(),
    }),
  );
  const rows = items.map((it, i) => {
    const ex = bySlug.get(it.exercise);
    if (!ex) throw new Error(`Bài "${it.exercise}" chưa có trong thư viện`);
    return {
      id: crypto.randomUUID(),
      session_id: id,
      position: i,
      template_item_position: i,
      planned_exercise_id: ex.id,
      exercise_id: ex.id,
      status: 'pending',
      target: it,
    };
  });
  must(await supabase.from('workout_session_items').insert(rows));
  return id;
}

export async function saveWarmup(sessionId: string, warmup: WarmupLog): Promise<void> {
  must(await supabase.from('workout_sessions').update({ warmup }).eq('id', sessionId));
}

export async function updateItem(id: string, patch: Partial<SessionItemRow>): Promise<void> {
  must(await supabase.from('workout_session_items').update(patch).eq('id', id));
}

export type SetInput = {
  id?: string;
  session_id: string;
  session_item_id: string;
  exercise_id: string;
  set_type: 'warmup' | 'working';
  set_index: number;
  target_kg: number | null;
  target_rep_min: number | null;
  target_rep_max: number | null;
  reps: number | null;
  seconds: number | null;
  weight_kg: number | null;
  kg_change_reason: KgChangeReason | null;
  kg_change_note: string | null;
  feel: Feel | null;
  note: string | null;
  completed: boolean;
};

export async function saveSet(s: SetInput): Promise<void> {
  must(
    await supabase
      .from('workout_sets')
      .upsert(
        { ...s, id: s.id ?? crypto.randomUUID(), completed_at: s.completed ? new Date().toISOString() : null },
        { onConflict: 'session_item_id,set_type,set_index' },
      ),
  );
}

export async function deleteSet(id: string): Promise<void> {
  must(await supabase.from('workout_sets').delete().eq('id', id));
}

/** Create a provisional exercise when the user types a name not in the library (§6.2 ⑤). */
export async function createProvisionalExercise(name: string, like: ExerciseRow | null, sessionId: string | null): Promise<ExerciseRow> {
  const slug = `user_${slugifyVi(name)}_${Math.random().toString(36).slice(2, 6)}`;
  const row = must(
    await supabase
      .from('exercises')
      .insert({
        slug,
        name_vi: name.trim(),
        aliases: [name.trim()],
        primary_muscle: like?.primary_muscle ?? 'chest',
        secondary_muscles: like?.secondary_muscles ?? [],
        movement_pattern: like?.movement_pattern ?? 'isolation_push',
        kind: like?.kind ?? 'isolation',
        equipment: like?.equipment ?? 'machine',
        load_step_kg: like?.load_step_kg ?? 5,
        is_time_based: like?.is_time_based ?? false,
        is_provisional: true,
        created_from_session_id: sessionId,
      })
      .select('*')
      .single(),
  ) as unknown as ExerciseRow;
  return row;
}

export async function substituteItem(args: {
  item: SessionItemRow;
  newExerciseId: string;
  reason: SubstitutionReason;
  note: string | null;
  markUnavailable: boolean;
}): Promise<void> {
  must(
    await supabase
      .from('workout_session_items')
      .update({
        exercise_id: args.newExerciseId,
        substitution_reason: args.reason,
        substitution_note: args.note,
        planned_exercise_id: args.item.planned_exercise_id ?? args.item.exercise_id,
      })
      .eq('id', args.item.id),
  );
  if (args.markUnavailable && args.item.planned_exercise_id) {
    must(
      await supabase
        .from('exercises')
        .update({ available_at_gym: false, unavailable_note: args.note ?? `Không có máy (${todayVN()})` })
        .eq('id', args.item.planned_exercise_id),
    );
  }
}

export async function addExtraItem(sessionId: string, exercise: ExerciseRow, position: number): Promise<void> {
  const target: PlanItem = {
    exercise: exercise.slug,
    alternatives: [],
    sets: 3,
    warmup_sets: [],
    rep_min: exercise.is_time_based ? 30 : 10,
    rep_max: exercise.is_time_based ? 45 : 12,
    unit: exercise.is_time_based ? 'seconds' : 'reps',
    rest_sec_min: 60,
    rest_sec_max: 90,
    target_kg: null,
    target_kg_per_set: null,
    coach_note: '',
    note: '',
  };
  must(
    await supabase.from('workout_session_items').insert({
      id: crypto.randomUUID(),
      session_id: sessionId,
      position,
      template_item_position: null,
      planned_exercise_id: null,
      exercise_id: exercise.id,
      status: 'pending',
      target,
    }),
  );
}

export async function finishSession(s: SessionRow, estKcal: number | null): Promise<void> {
  const end = new Date();
  const duration = s.started_at ? Math.round((end.getTime() - new Date(s.started_at).getTime()) / 60_000) : s.duration_min;
  must(
    await supabase
      .from('workout_sessions')
      .update({ status: 'completed', ended_at: end.toISOString(), duration_min: duration, est_kcal: estKcal })
      .eq('id', s.id),
  );
}

export async function updateSession(id: string, patch: Partial<SessionRow>): Promise<void> {
  must(await supabase.from('workout_sessions').update(patch).eq('id', id));
}

export async function deleteSession(id: string): Promise<void> {
  must(await supabase.from('workout_sessions').delete().eq('id', id));
}

/** Session without a template (badminton, walk, zone 2, core). */
export async function logSimpleSession(args: {
  date: IsoDate;
  kind: SessionKind;
  minutes: number;
  intensity: 'light' | 'moderate' | 'hard' | null;
  estKcal: number;
  note: string | null;
  warmupDone: boolean | null;
}): Promise<string> {
  const id = crypto.randomUUID();
  must(
    await supabase.from('workout_sessions').insert({
      id,
      session_date: args.date,
      kind: args.kind,
      status: 'completed',
      is_backfill: args.date !== todayVN(),
      duration_min: args.minutes,
      badminton_intensity: args.intensity,
      est_kcal: args.estKcal,
      note: args.note,
      warmup: args.warmupDone === null ? null : { cardio: null, mobility_done: args.warmupDone, skipped: !args.warmupDone },
    }),
  );
  return id;
}

export type BackfillItem = {
  exercise: ExerciseRow;
  plannedExercise: ExerciseRow | null;
  templateItemPosition: number | null;
  target: PlanItem;
  note: string | null;
  sets: { set_type: 'warmup' | 'working'; reps: number | null; seconds: number | null; weight_kg: number | null }[];
};

/** Backfill / quick log: create a completed session with its exercises + sets (§6.2, §6.2a). */
export async function createBackfillSession(args: {
  date: IsoDate;
  kind: SessionKind;
  planVersionId: string | null;
  warmup: WarmupLog | null;
  note: string | null;
  items: BackfillItem[];
}): Promise<string> {
  const id = crypto.randomUUID();
  must(
    await supabase.from('workout_sessions').insert({
      id,
      session_date: args.date,
      kind: args.kind,
      status: 'completed',
      is_backfill: true,
      plan_version_id: args.planVersionId,
      warmup: args.warmup,
      note: args.note,
      template_snapshot: args.items.map((i) => i.target),
    }),
  );
  const itemRows = args.items.map((it, pos) => ({
    id: crypto.randomUUID(),
    session_id: id,
    position: pos,
    template_item_position: it.templateItemPosition,
    planned_exercise_id: it.plannedExercise?.id ?? (it.templateItemPosition !== null ? it.exercise.id : null),
    exercise_id: it.exercise.id,
    status: 'done',
    target: it.target,
    note: it.note,
  }));
  if (itemRows.length) must(await supabase.from('workout_session_items').insert(itemRows));
  const setRows = args.items.flatMap((it, pos) => {
    const counters = { warmup: 0, working: 0 };
    return it.sets.map((s) => ({
      id: crypto.randomUUID(),
      session_id: id,
      session_item_id: itemRows[pos].id,
      exercise_id: it.exercise.id,
      set_type: s.set_type,
      set_index: ++counters[s.set_type],
      reps: s.reps,
      seconds: s.seconds,
      weight_kg: s.weight_kg,
      target_kg: s.set_type === 'working' ? it.target.target_kg : null,
      target_rep_min: it.target.rep_min,
      target_rep_max: it.target.rep_max,
      completed: true,
      completed_at: `${args.date}T11:00:00Z`,
    }));
  });
  if (setRows.length) must(await supabase.from('workout_sets').insert(setRows));
  return id;
}

export async function setExerciseAvailable(id: string, available: boolean): Promise<void> {
  must(await supabase.from('exercises').update({ available_at_gym: available, unavailable_note: available ? null : `Đánh dấu ${todayVN()}` }).eq('id', id));
}

// ───────────────────────── Body
export async function saveWeight(args: { date: IsoDate; weightKg: number; note: string | null; measurements: Record<string, number | null> }): Promise<void> {
  const id = crypto.randomUUID();
  must(await supabase.from('weight_logs').insert({ id, log_date: args.date, weight_kg: args.weightKg, note: args.note }));
  if (Object.values(args.measurements).some((v) => v !== null)) {
    must(await supabase.from('body_measurements').insert({ log_date: args.date, weight_log_id: id, ...args.measurements }));
  }
}

export async function deleteWeight(id: string): Promise<void> {
  must(await supabase.from('weight_logs').delete().eq('id', id));
}

export async function saveInbody(row: Omit<InbodyLog, never>): Promise<void> {
  must(await supabase.from('inbody_logs').insert(row));
}

// ───────────────────────── Plans
export async function createDraft(args: { content: PlanContent; changeNote: string; basedOn: string | null; createdBy?: 'user' | 'system' }): Promise<string> {
  const row = must(
    await supabase
      .from('plan_versions')
      .insert({ status: 'draft', content: args.content, change_note: args.changeNote, based_on_version_id: args.basedOn, created_by: args.createdBy ?? 'user' })
      .select('id')
      .single(),
  ) as { id: string };
  return row.id;
}

export async function approvePlan(id: string, effectiveFrom: IsoDate): Promise<'active' | 'scheduled'> {
  return must(await supabase.rpc('approve_plan_version', { p_id: id, p_effective_from: effectiveFrom })) as 'active' | 'scheduled';
}

export async function rejectPlan(id: string, reason: string): Promise<void> {
  must(await supabase.rpc('reject_plan_version', { p_id: id, p_reason: reason }));
}

export async function markReviewRead(id: string): Promise<void> {
  must(await supabase.from('review_notes').update({ is_read: true }).eq('id', id));
}

// ───────────────────────── Reminders
export async function updateNotification(id: string, patch: Partial<NotificationSetting>): Promise<void> {
  must(await supabase.from('notification_settings').update(patch).eq('id', id));
}

function b64ToUint8(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function subscribePush(): Promise<void> {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  if (!key) throw new Error('Thiếu VITE_VAPID_PUBLIC_KEY');
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Trình duyệt không hỗ trợ thông báo đẩy (iPhone: cần "Thêm vào MH chính" trước)');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Chưa cho phép thông báo');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) }));
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  must(
    await supabase
      .from('push_subscriptions')
      .upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent }, { onConflict: 'endpoint' }),
  );
}

export async function sendTestPush(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
  if (error) throw new Error('Không gửi được thông báo thử');
  return (data as { sent: number }).sent;
}

// ───────────────────────── Progress photos (online only, never cached)
export async function uploadPhoto(args: { userId: string; date: IsoDate; angle: 'front' | 'side' | 'back'; blob: Blob; width: number; height: number }): Promise<void> {
  const path = `${args.userId}/${args.date}/${args.angle}.jpg`;
  const up = await supabase.storage.from('progress-photos').upload(path, args.blob, { contentType: 'image/jpeg', upsert: true, cacheControl: 'no-store' });
  if (up.error) throw new Error(up.error.message);
  must(
    await supabase
      .from('progress_photos')
      .upsert(
        { taken_on: args.date, angle: args.angle, storage_path: path, width: args.width, height: args.height, bytes: args.blob.size },
        { onConflict: 'user_id,taken_on,angle' },
      ),
  );
}

/** 60-second signed URL → download as blob (no-store) → blob URL; the caller revokes it. */
export async function photoObjectUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('progress-photos').createSignedUrl(path, 60);
  if (error || !data) throw new Error(error?.message ?? 'Không tạo được link ảnh');
  const res = await fetch(data.signedUrl, { cache: 'no-store' });
  return URL.createObjectURL(await res.blob());
}

export async function deletePhoto(p: PhotoRow): Promise<void> {
  await supabase.storage.from('progress-photos').remove([p.storage_path]);
  must(await supabase.from('progress_photos').delete().eq('id', p.id));
}
