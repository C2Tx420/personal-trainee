-- ============================================================================
-- Schema: Health & Training (plan v2.4 §5)
-- Every table has user_id (defaults to auth.uid()); RLS lives in migration 0300.
-- Logical dates are `date` in Vietnam time; points in time are timestamptz.
-- ============================================================================

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function public.today_vn() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;

-- ── meta (schema version for the app's compatibility check, §15.5)
create table public.app_meta (
  key text primary key,
  value text not null
);

-- ── profile
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  display_name text,
  sex text check (sex in ('male', 'female')),
  birth_year int,
  height_cm numeric(5,1),
  timezone text not null default 'Asia/Ho_Chi_Minh',
  program_start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── PIN lock: the PIN lives in the Edge Function's APP_PIN secret, this table only counts wrong attempts
create table public.app_lock (
  user_id uuid primary key references auth.users on delete cascade,
  failed_attempts int not null default 0 check (failed_attempts between 0 and 5),
  last_failed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── goals
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  ordinal int not null,
  target_date date not null,
  target_weight_min numeric(5,1) not null,
  target_weight_max numeric(5,1) not null,
  target_body_fat_min numeric(4,1),
  target_body_fat_max numeric(4,1),
  status text not null default 'pending' check (status in ('pending', 'active', 'achieved', 'missed')),
  achieved_at timestamptz,
  achieved_weight_kg numeric(5,1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, ordinal),
  check (target_weight_min <= target_weight_max)
);

-- ── plan versions (content JSON is the source of truth)
create table public.plan_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  version_no int not null,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'archived', 'rejected')),
  effective_from date,
  created_by text not null default 'user' check (created_by in ('user', 'claude_code', 'system')),
  change_note text not null default '',
  content jsonb not null,
  based_on_version_id uuid references public.plan_versions,
  approved_at timestamptz,
  rejected_reason text,
  calories_kcal int generated always as ((content #>> '{nutrition,calories_kcal}')::int) stored not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_calories_floor check (calories_kcal >= 1700),
  constraint plan_content_schema check (content ->> 'schema' = 'plan-content/1'),
  unique (user_id, version_no)
);
create unique index plan_versions_one_active on public.plan_versions (user_id) where status = 'active';
create index plan_versions_status on public.plan_versions (user_id, status);

-- Immutable: content can only change while still a draft; no version is ever deleted.
create or replace function public.plan_versions_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Không xoá phiên bản lộ trình — chuyển sang archived/rejected';
  end if;
  if old.status <> 'draft' and new.content is distinct from old.content then
    raise exception 'Không sửa nội dung phiên bản đã duyệt (status=%)', old.status;
  end if;
  return new;
end $$;
create trigger plan_versions_guard before update or delete on public.plan_versions
  for each row execute function public.plan_versions_guard();

-- ── exercise library
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9_]+$'),
  name_vi text not null,
  aliases text[] not null default '{}',
  primary_muscle text not null,
  secondary_muscles text[] not null default '{}',
  movement_pattern text not null,
  kind text not null check (kind in ('compound', 'isolation', 'core', 'cardio')),
  equipment text not null,
  load_step_kg numeric(4,2) not null default 2.5,
  is_time_based boolean not null default false,
  cues text[] not null default '{}',
  common_mistakes text[] not null default '{}',
  illustration_svg text,
  reference_url text,
  archived boolean not null default false,
  available_at_gym boolean not null default true,
  unavailable_note text,
  is_provisional boolean not null default false,
  canonical_exercise_id uuid references public.exercises,
  created_from_session_id uuid,
  updated_by_plan_version_id uuid references public.plan_versions,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug),
  constraint exercises_svg_safe check (
    illustration_svg is null or (
      length(illustration_svg) <= 15360
      and illustration_svg !~* '<script|\son[a-z]+\s*=|foreignObject|javascript:|<!ENTITY|@import'
    )
  )
);

-- ── session templates (rebuilt from content on approval; id = template_version_id)
create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  plan_version_id uuid not null references public.plan_versions,
  key text not null check (key in ('push', 'pull', 'legs')),
  name text not null,
  warmup jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (plan_version_id, key)
);

create table public.session_template_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_template_id uuid not null references public.session_templates on delete cascade,
  position int not null,
  exercise_id uuid not null references public.exercises,
  alternative_exercise_ids uuid[] not null default '{}',
  sets int not null check (sets between 1 and 10),
  warmup_sets jsonb not null default '[]',
  rep_min int not null,
  rep_max int not null,
  unit text not null default 'reps' check (unit in ('reps', 'seconds')),
  rest_sec_min int not null,
  rest_sec_max int not null,
  target_kg numeric(6,2),
  target_kg_per_set numeric(6,2)[],
  coach_note text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (session_template_id, position),
  check (rep_min <= rep_max),
  check (target_kg_per_set is null or cardinality(target_kg_per_set) = sets)
);

-- ── workout sessions
create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_date date not null,
  kind text not null check (kind in ('push', 'pull', 'legs', 'push_light', 'pull_light', 'badminton', 'walk', 'zone2', 'core')),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  template_version_id uuid references public.session_templates,
  plan_version_id uuid references public.plan_versions,
  is_backfill boolean not null default false,
  template_snapshot jsonb,
  warmup jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  duration_min int check (duration_min is null or duration_min between 0 and 600),
  badminton_intensity text check (badminton_intensity in ('light', 'moderate', 'hard')),
  est_kcal int,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index workout_sessions_date on public.workout_sessions (user_id, session_date desc);
create unique index workout_sessions_one_in_progress on public.workout_sessions (user_id) where status = 'in_progress';

create table public.workout_session_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_id uuid not null references public.workout_sessions on delete cascade,
  position int not null,
  template_item_position int,
  planned_exercise_id uuid references public.exercises,
  exercise_id uuid not null references public.exercises,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'partial', 'skipped')),
  substitution_reason text check (substitution_reason in ('unavailable', 'busy', 'pain', 'preference')),
  substitution_note text,
  skip_reason text,
  deferred boolean not null default false,
  target jsonb not null,
  note text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, position)
);
create index workout_session_items_planned on public.workout_session_items (user_id, planned_exercise_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  session_item_id uuid not null references public.workout_session_items on delete cascade,
  session_id uuid not null references public.workout_sessions on delete cascade,
  exercise_id uuid not null references public.exercises,
  set_index int not null check (set_index >= 1),
  set_type text not null default 'working' check (set_type in ('warmup', 'working')),
  target_kg numeric(6,2),
  target_rep_min int,
  target_rep_max int,
  reps int check (reps is null or reps between 0 and 200),
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg between 0 and 500),
  seconds int,
  kg_change_reason text check (kg_change_reason in ('too_heavy', 'too_light', 'machine_diff', 'pain', 'other')),
  kg_change_note text,
  feel text check (feel in ('easy', 'ok', 'hard')),
  note text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_item_id, set_type, set_index)
);
create index workout_sets_exercise on public.workout_sets (user_id, exercise_id, created_at desc);

-- ── body
create table public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  log_date date not null,
  logged_at timestamptz not null default now(),
  weight_kg numeric(5,1) not null check (weight_kg between 30 and 250),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index weight_logs_date on public.weight_logs (user_id, log_date);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  log_date date not null,
  weight_log_id uuid references public.weight_logs on delete set null,
  neck_cm numeric(5,1) check (neck_cm between 10 and 250),
  chest_cm numeric(5,1) check (chest_cm between 10 and 250),
  waist_navel_cm numeric(5,1) check (waist_navel_cm between 10 and 250),
  abdomen_cm numeric(5,1) check (abdomen_cm between 10 and 250),
  hip_cm numeric(5,1) check (hip_cm between 10 and 250),
  shoulder_cm numeric(5,1) check (shoulder_cm between 10 and 250),
  upper_arm_cm numeric(5,1) check (upper_arm_cm between 10 and 250),
  forearm_cm numeric(5,1) check (forearm_cm between 10 and 250),
  thigh_cm numeric(5,1) check (thigh_cm between 10 and 250),
  calf_cm numeric(5,1) check (calf_cm between 10 and 250),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index body_measurements_date on public.body_measurements (user_id, log_date);

create table public.inbody_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  measured_on date not null,
  weight_kg numeric(5,1) not null,
  smm_kg numeric(5,1),
  pbf_pct numeric(4,1),
  visceral_fat_level int,
  whr numeric(4,2),
  ffm_kg numeric(5,1),
  bmr_kcal int,
  inbody_score int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  taken_on date not null,
  angle text not null check (angle in ('front', 'side', 'back')),
  storage_path text not null,
  width int,
  height int,
  bytes int,
  created_at timestamptz not null default now(),
  unique (user_id, taken_on, angle)
);

-- ── reminders
create table public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('workout', 'water', 'weigh_in', 'measurements', 'inbody', 'photos', 'goal', 'weekly_review')),
  enabled boolean not null default true,
  time_of_day time,
  weekdays int[],
  interval_min int,
  window_start time,
  window_end time,
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- ── Claude Code review notes
create table public.review_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  content text not null,
  plan_version_id uuid references public.plan_versions,
  is_read boolean not null default false,
  created_by text not null default 'claude_code',
  created_at timestamptz not null default now()
);

-- ── trigger updated_at
do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'app_lock', 'goals', 'plan_versions', 'exercises', 'workout_sessions',
    'workout_session_items', 'workout_sets', 'weight_logs', 'body_measurements', 'inbody_logs',
    'notification_settings'
  ] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;
end $$;

insert into public.app_meta (key, value) values ('schema_version', '20261027000200'), ('min_app_version', '0.1.0');
