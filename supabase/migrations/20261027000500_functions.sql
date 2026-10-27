-- ============================================================================
-- Hàm nghiệp vụ: duyệt/từ chối lộ trình, dựng template, bootstrap dữ liệu seed.
-- Tất cả RPC: security definer + search_path rỗng + tự kiểm tra chủ sở hữu.
-- Supabase mặc định cấp EXECUTE cho PUBLIC → revoke rồi grant lại đúng role.
-- ============================================================================

-- ── version_no tự tăng theo user khi client tạo draft
create or replace function public.plan_versions_assign_no() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.version_no is null then
    select coalesce(max(version_no), 0) + 1 into new.version_no
    from public.plan_versions where user_id = new.user_id;
  end if;
  return new;
end $$;
create trigger plan_versions_assign_no before insert on public.plan_versions
  for each row execute function public.plan_versions_assign_no();

-- ── upsert bài tập từ JSON (exercise_upserts / seed)
create or replace function public._upsert_exercises(p_uid uuid, p_defs jsonb, p_plan_id uuid, p_overwrite boolean)
returns int language plpgsql security definer set search_path = '' as $$
declare
  e jsonb;
  n int := 0;
  existing uuid;
  canon uuid;
begin
  for e in select * from jsonb_array_elements(coalesce(p_defs, '[]'::jsonb)) loop
    select id into existing from public.exercises where user_id = p_uid and slug = e->>'slug';
    canon := null;
    if e ? 'canonical_slug' and e->>'canonical_slug' is not null then
      select id into canon from public.exercises where user_id = p_uid and slug = e->>'canonical_slug';
    end if;
    if existing is null then
      insert into public.exercises (
        user_id, slug, name_vi, aliases, primary_muscle, secondary_muscles, movement_pattern, kind,
        equipment, load_step_kg, is_time_based, cues, common_mistakes, illustration_svg, reference_url,
        archived, available_at_gym, canonical_exercise_id, updated_by_plan_version_id
      ) values (
        p_uid, e->>'slug', e->>'name_vi',
        array(select jsonb_array_elements_text(coalesce(e->'aliases', '[]'))),
        e->>'primary_muscle',
        array(select jsonb_array_elements_text(coalesce(e->'secondary_muscles', '[]'))),
        e->>'movement_pattern', e->>'kind', e->>'equipment',
        coalesce((e->>'load_step_kg')::numeric, 2.5), coalesce((e->>'is_time_based')::boolean, false),
        array(select jsonb_array_elements_text(coalesce(e->'cues', '[]'))),
        array(select jsonb_array_elements_text(coalesce(e->'common_mistakes', '[]'))),
        e->>'illustration_svg', e->>'reference_url',
        coalesce((e->>'archived')::boolean, false), coalesce((e->>'available_at_gym')::boolean, true),
        canon, p_plan_id
      );
      n := n + 1;
    elsif p_overwrite then
      update public.exercises x set
        name_vi = e->>'name_vi',
        aliases = array(select jsonb_array_elements_text(coalesce(e->'aliases', '[]'))),
        primary_muscle = e->>'primary_muscle',
        secondary_muscles = array(select jsonb_array_elements_text(coalesce(e->'secondary_muscles', '[]'))),
        movement_pattern = e->>'movement_pattern',
        kind = e->>'kind',
        equipment = e->>'equipment',
        load_step_kg = coalesce((e->>'load_step_kg')::numeric, x.load_step_kg),
        is_time_based = coalesce((e->>'is_time_based')::boolean, x.is_time_based),
        cues = array(select jsonb_array_elements_text(coalesce(e->'cues', '[]'))),
        common_mistakes = array(select jsonb_array_elements_text(coalesce(e->'common_mistakes', '[]'))),
        illustration_svg = coalesce(e->>'illustration_svg', x.illustration_svg),
        reference_url = coalesce(e->>'reference_url', x.reference_url),
        archived = coalesce((e->>'archived')::boolean, x.archived),
        available_at_gym = coalesce((e->>'available_at_gym')::boolean, x.available_at_gym),
        canonical_exercise_id = coalesce(canon, x.canonical_exercise_id),
        is_provisional = false,
        updated_by_plan_version_id = p_plan_id
      where x.id = existing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

-- ── dựng session_templates từ content (idempotent)
create or replace function public._materialize_templates(p_plan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid;
  v_content jsonb;
  t jsonb;
  it jsonb;
  pos int;
  tmpl_id uuid;
  ex_id uuid;
  alt_ids uuid[];
  missing text;
begin
  select user_id, content into v_uid, v_content from public.plan_versions where id = p_plan_id;
  for t in select * from jsonb_array_elements(v_content->'templates') loop
    if exists (select 1 from public.session_templates where plan_version_id = p_plan_id and key = t->>'key') then
      continue;
    end if;
    insert into public.session_templates (user_id, plan_version_id, key, name, warmup)
    values (v_uid, p_plan_id, t->>'key', t->>'name', coalesce(t->'warmup', '{}'))
    returning id into tmpl_id;
    pos := 0;
    for it in select * from jsonb_array_elements(t->'items') loop
      select id into ex_id from public.exercises where user_id = v_uid and slug = it->>'exercise';
      if ex_id is null then
        raise exception 'Bài "%" không có trong thư viện', it->>'exercise';
      end if;
      select string_agg(s, ', ') into missing
      from jsonb_array_elements_text(coalesce(it->'alternatives', '[]')) s
      where not exists (select 1 from public.exercises x where x.user_id = v_uid and x.slug = s);
      if missing is not null then
        raise exception 'Bài thay thế không có trong thư viện: %', missing;
      end if;
      select coalesce(array_agg(x.id order by a.ord), '{}') into alt_ids
      from jsonb_array_elements_text(coalesce(it->'alternatives', '[]')) with ordinality a(slug, ord)
      join public.exercises x on x.user_id = v_uid and x.slug = a.slug;
      insert into public.session_template_items (
        user_id, session_template_id, position, exercise_id, alternative_exercise_ids, sets, warmup_sets,
        rep_min, rep_max, unit, rest_sec_min, rest_sec_max, target_kg, target_kg_per_set, coach_note, note
      ) values (
        v_uid, tmpl_id, pos, ex_id, alt_ids, (it->>'sets')::int, coalesce(it->'warmup_sets', '[]'),
        (it->>'rep_min')::int, (it->>'rep_max')::int, coalesce(it->>'unit', 'reps'),
        (it->>'rest_sec_min')::int, (it->>'rest_sec_max')::int,
        (it->>'target_kg')::numeric,
        case when jsonb_typeof(it->'target_kg_per_set') = 'array'
          then array(select jsonb_array_elements_text(it->'target_kg_per_set')::numeric) end,
        coalesce(it->>'coach_note', ''), coalesce(it->>'note', '')
      );
      pos := pos + 1;
    end loop;
  end loop;
end $$;

-- ── chuyển một version thành active (archive bản active cũ)
create or replace function public._activate_plan(p_plan_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid;
begin
  select user_id into v_uid from public.plan_versions where id = p_plan_id;
  update public.plan_versions set status = 'archived'
    where user_id = v_uid and status = 'active' and id <> p_plan_id;
  update public.plan_versions set status = 'active', approved_at = coalesce(approved_at, now())
    where id = p_plan_id;
end $$;

-- ── Duyệt draft: upsert bài tập → dựng template → active (hôm nay) hoặc scheduled (tương lai)
create or replace function public.approve_plan_version(p_id uuid, p_effective_from date)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v public.plan_versions;
begin
  select * into v from public.plan_versions where id = p_id for update;
  if v.id is null or v.user_id <> auth.uid() then
    raise exception 'Không tìm thấy phiên bản lộ trình';
  end if;
  if v.status <> 'draft' then
    raise exception 'Chỉ duyệt được bản nháp (hiện tại: %)', v.status;
  end if;
  if p_effective_from < public.today_vn() then
    raise exception 'Ngày áp dụng không được ở quá khứ';
  end if;
  perform public._upsert_exercises(v.user_id, v.content->'exercise_upserts', v.id, true);
  perform public._materialize_templates(v.id);
  update public.plan_versions set effective_from = p_effective_from, approved_at = now() where id = p_id;
  if p_effective_from <= public.today_vn() then
    perform public._activate_plan(p_id);
    return 'active';
  end if;
  update public.plan_versions set status = 'scheduled' where id = p_id;
  return 'scheduled';
end $$;

create or replace function public.reject_plan_version(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.plan_versions set status = 'rejected', rejected_reason = nullif(trim(p_reason), '')
  where id = p_id and user_id = auth.uid() and status = 'draft';
  if not found then
    raise exception 'Chỉ từ chối được bản nháp của chính mình';
  end if;
end $$;

-- ── Kích hoạt các bản scheduled đã tới ngày (cron cho mọi user; client cho chính mình)
create or replace function public.activate_due_plans_all()
returns int language plpgsql security definer set search_path = '' as $$
declare r record; n int := 0;
begin
  for r in
    select distinct on (user_id) id from public.plan_versions
    where status = 'scheduled' and effective_from <= public.today_vn()
    order by user_id, effective_from desc, version_no desc
  loop
    perform public._activate_plan(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.activate_my_due_plans()
returns int language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.plan_versions
  where user_id = auth.uid() and status = 'scheduled' and effective_from <= public.today_vn()
  order by effective_from desc, version_no desc limit 1;
  if v_id is null then return 0; end if;
  perform public._activate_plan(v_id);
  return 1;
end $$;

-- ── Sau khi đăng nhập bằng mật khẩu: đặt lại bộ đếm PIN sai.
-- Chỉ cho phép khi phiên đăng nhập vừa tạo (< 5 phút) → không thể dùng để né khoá 5 lần.
create or replace function public.reset_pin_attempts()
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from auth.sessions
    where id = (auth.jwt() ->> 'session_id')::uuid and user_id = auth.uid()
      and created_at > now() - interval '5 minutes'
  ) then
    return false;
  end if;
  insert into public.app_lock (user_id, failed_attempts) values (auth.uid(), 0)
  on conflict (user_id) do update set failed_attempts = 0, last_failed_at = null;
  return true;
end $$;

-- ── Bootstrap: lần đăng nhập đầu tạo toàn bộ dữ liệu seed (idempotent)
create or replace function public.bootstrap_user()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  pl jsonb := public._seed_payload();
  g jsonb;
  s jsonb;
  it jsonb;
  st jsonb;
  v_plan uuid;
  v_session uuid;
  v_item uuid;
  v_ex uuid;
  v_pos int;
  created jsonb := '{}';
begin
  if v_uid is null then
    raise exception 'Cần đăng nhập';
  end if;

  insert into public.profiles (user_id, display_name, sex, birth_year, height_cm, program_start_date)
  values (v_uid, pl#>>'{profile,display_name}', pl#>>'{profile,sex}', (pl#>>'{profile,birth_year}')::int,
          (pl#>>'{profile,height_cm}')::numeric, (pl#>>'{profile,program_start_date}')::date)
  on conflict (user_id) do nothing;

  insert into public.app_lock (user_id) values (v_uid) on conflict (user_id) do nothing;

  for g in select * from jsonb_array_elements(pl->'goals') loop
    insert into public.goals (user_id, name, ordinal, target_date, target_weight_min, target_weight_max,
                              target_body_fat_min, target_body_fat_max, status)
    values (v_uid, g->>'name', (g->>'ordinal')::int, (g->>'target_date')::date,
            (g->>'target_weight_min')::numeric, (g->>'target_weight_max')::numeric,
            (g->>'target_body_fat_min')::numeric, (g->>'target_body_fat_max')::numeric,
            case when (g->>'ordinal')::int = 1 then 'active' else 'pending' end)
    on conflict (user_id, ordinal) do nothing;
  end loop;

  created := created || jsonb_build_object('exercises',
    public._upsert_exercises(v_uid, pl->'exercises', null, false));

  if not exists (select 1 from public.plan_versions where user_id = v_uid) then
    insert into public.plan_versions (user_id, version_no, status, effective_from, created_by, change_note, content, approved_at)
    values (v_uid, 1, 'draft', (pl#>>'{plan,effective_from}')::date, 'user', pl#>>'{plan,change_note}', pl#>'{plan,content}', now())
    returning id into v_plan;
    perform public._materialize_templates(v_plan);
    perform public._activate_plan(v_plan);
    created := created || jsonb_build_object('plan_version', 1);
  end if;

  if not exists (select 1 from public.inbody_logs where user_id = v_uid) then
    insert into public.inbody_logs (user_id, measured_on, weight_kg, smm_kg, pbf_pct, visceral_fat_level, whr, ffm_kg, bmr_kcal, inbody_score)
    select v_uid, (x->>'measured_on')::date, (x->>'weight_kg')::numeric, (x->>'smm_kg')::numeric, (x->>'pbf_pct')::numeric,
           (x->>'visceral_fat_level')::int, (x->>'whr')::numeric, (x->>'ffm_kg')::numeric, (x->>'bmr_kcal')::int, (x->>'inbody_score')::int
    from jsonb_array_elements(pl->'inbody') x;
  end if;

  if not exists (select 1 from public.weight_logs where user_id = v_uid) then
    insert into public.weight_logs (user_id, log_date, weight_kg, note)
    select v_uid, (x->>'log_date')::date, (x->>'weight_kg')::numeric, x->>'note'
    from jsonb_array_elements(pl->'weights') x;
  end if;

  insert into public.notification_settings (user_id, kind, enabled, time_of_day, weekdays, interval_min, window_start, window_end)
  select v_uid, x->>'kind', (x->>'enabled')::boolean, (x->>'time_of_day')::time,
         case when jsonb_typeof(x->'weekdays') = 'array' then array(select jsonb_array_elements_text(x->'weekdays')::int) end,
         (x->>'interval_min')::int, (x->>'window_start')::time, (x->>'window_end')::time
  from jsonb_array_elements(pl->'notifications') x
  on conflict (user_id, kind) do nothing;

  -- Lịch sử ghi bù (buổi Push 26/10/2026 …)
  for s in select * from jsonb_array_elements(pl->'history') loop
    if exists (select 1 from public.workout_sessions where id = (s->>'id')::uuid) then
      continue;
    end if;
    insert into public.workout_sessions (id, user_id, session_date, kind, status, is_backfill, warmup, note, template_snapshot)
    values ((s->>'id')::uuid, v_uid, (s->>'session_date')::date, s->>'kind', 'completed',
            coalesce((s->>'is_backfill')::boolean, true), s->'warmup', s->>'note', s->'items')
    returning id into v_session;
    v_pos := 0;
    for it in select * from jsonb_array_elements(s->'items') loop
      select id into v_ex from public.exercises where user_id = v_uid and slug = it->>'exercise';
      insert into public.workout_session_items (user_id, session_id, position, template_item_position,
        planned_exercise_id, exercise_id, status, target, note)
      values (v_uid, v_session, v_pos, (it->>'template_item_position')::int,
        case when it->>'template_item_position' is not null then v_ex end, v_ex, 'done',
        coalesce(it->'target', '{}'), it->>'note')
      returning id into v_item;
      for st in select * from jsonb_array_elements(it->'sets') loop
        insert into public.workout_sets (user_id, session_item_id, session_id, exercise_id, set_index, set_type,
          reps, weight_kg, completed, completed_at)
        values (v_uid, v_item, v_session, v_ex, (st->>'set_index')::int, st->>'set_type',
          (st->>'reps')::int, (st->>'weight_kg')::numeric, true, ((s->>'session_date') || ' 18:00+07')::timestamptz);
      end loop;
      v_pos := v_pos + 1;
    end loop;
    created := created || jsonb_build_object('history_' || (s->>'session_date'), true);
  end loop;

  return created;
end $$;

-- ── Quyền thực thi
revoke execute on function public._upsert_exercises(uuid, jsonb, uuid, boolean) from public, anon, authenticated;
revoke execute on function public._materialize_templates(uuid) from public, anon, authenticated;
revoke execute on function public._activate_plan(uuid) from public, anon, authenticated;
revoke execute on function public.activate_due_plans_all() from public, anon, authenticated;

do $$
declare f text;
begin
  foreach f in array array[
    'public.approve_plan_version(uuid, date)', 'public.reject_plan_version(uuid, text)',
    'public.activate_my_due_plans()', 'public.reset_pin_attempts()', 'public.bootstrap_user()'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

update public.app_meta set value = '20261027000500' where key = 'schema_version';
