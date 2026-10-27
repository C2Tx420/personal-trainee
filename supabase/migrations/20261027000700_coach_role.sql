-- ============================================================================
-- Role for Claude Code (plan v2.4 §7): SELECT on exactly 11 tables, and writes
-- only through 2 functions: coach_submit_draft (plan draft) + coach_add_review_note.
-- NO privileges on progress_photos, app_lock, push_subscriptions,
-- notification_settings, review_notes, profiles, storage.
-- The password is NOT in the migration — set it manually:
--   alter role coach_readonly login password '…';
-- ============================================================================

do $$
begin
  create role coach_readonly nologin noinherit;
exception when duplicate_object then null;
end $$;

grant usage on schema public to coach_readonly;

do $$
declare t text;
begin
  foreach t in array array[
    'goals', 'plan_versions', 'weight_logs', 'body_measurements', 'inbody_logs', 'workout_sessions',
    'workout_session_items', 'workout_sets', 'session_templates', 'session_template_items', 'exercises'
  ] loop
    execute format('grant select on public.%I to coach_readonly', t);
    execute format('create policy coach_read on public.%I for select to coach_readonly using (true)', t);
  end loop;
end $$;

-- The app's single user
create or replace function public._owner_user_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from public.profiles order by created_at limit 1
$$;
revoke execute on function public._owner_user_id() from public, anon, authenticated;

create or replace function public.coach_submit_draft(p_content jsonb, p_change_note text, p_based_on uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public._owner_user_id();
  v_id uuid;
  e jsonb;
begin
  if v_uid is null then raise exception 'Chưa có người dùng'; end if;
  if length(coalesce(trim(p_change_note), '')) < 20 then
    raise exception 'change_note phải ≥ 20 ký tự và nêu rõ lý do + số liệu';
  end if;
  if p_content ->> 'schema' is distinct from 'plan-content/1' then
    raise exception 'content phải theo schema plan-content/1';
  end if;
  if jsonb_typeof(p_content -> 'templates') <> 'array' or jsonb_array_length(p_content -> 'templates') = 0 then
    raise exception 'content.templates trống';
  end if;
  for e in select * from jsonb_array_elements(coalesce(p_content -> 'exercise_upserts', '[]')) loop
    if e ->> 'illustration_svg' is not null and (
      length(e ->> 'illustration_svg') > 15360
      or (e ->> 'illustration_svg') ~* '<script|\son[a-z]+\s*=|foreignObject|javascript:|<!ENTITY|@import'
    ) then
      raise exception 'SVG của bài "%" không hợp lệ (quá lớn hoặc có nội dung bị cấm)', e ->> 'slug';
    end if;
  end loop;
  if p_based_on is not null and not exists (
    select 1 from public.plan_versions where id = p_based_on and user_id = v_uid
  ) then
    raise exception 'based_on không tồn tại';
  end if;
  insert into public.plan_versions (user_id, status, created_by, change_note, content, based_on_version_id)
  values (v_uid, 'draft', 'claude_code', trim(p_change_note), p_content, p_based_on)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.coach_add_review_note(p_week_start date, p_content text, p_plan_version_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if length(coalesce(trim(p_content), '')) < 20 then
    raise exception 'Nhận xét quá ngắn';
  end if;
  insert into public.review_notes (user_id, week_start, content, plan_version_id, created_by)
  values (public._owner_user_id(), p_week_start, p_content, p_plan_version_id, 'claude_code')
  returning id into v_id;
  return v_id;
end $$;

revoke execute on function public.coach_submit_draft(jsonb, text, uuid) from public, anon, authenticated;
grant execute on function public.coach_submit_draft(jsonb, text, uuid) to coach_readonly;
revoke execute on function public.coach_add_review_note(date, text, uuid) from public, anon, authenticated;
grant execute on function public.coach_add_review_note(date, text, uuid) to coach_readonly;

update public.app_meta set value = '20261027000700' where key = 'schema_version';
