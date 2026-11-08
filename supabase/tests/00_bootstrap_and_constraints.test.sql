begin;
create extension if not exists pgtap with schema extensions;
select plan(39);

-- Simulated user
insert into auth.users (id, email, aud, role, instance_id)
values ('11111111-1111-4111-8111-111111111111', 'owner@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok($$ select public.bootstrap_user() $$, 'bootstrap_user chạy được');
select lives_ok($$ select public.bootstrap_user() $$, 'bootstrap_user gọi lại không lỗi (idempotent)');

select is((select count(*)::int from public.goals), 3, '3 mốc goal');
select ok((select count(*) from public.exercises) >= 53, '≥ 53 bài tập seed');
select is((select available_at_gym from public.exercises where slug = 'hack_squat'), true, 'hack squat: phòng tập có máy');
select is((select archived from public.exercises where slug = 'plank'), true, 'plank đã lưu trữ');
select is((select is_assisted from public.exercises where slug = 'assisted_pull_up'), true, 'kéo xà trợ lực: máy trợ lực');
select is((select count(*)::int from public.exercises where is_assisted), 2, 'chỉ 2 bài trợ lực trong seed');
select is((select time_of_day::text from public.notification_settings where kind = 'missed_workout' and enabled), '21:00:00', 'nhắc bỏ buổi 21:00, bật sẵn');
select is((select count(*)::int from public.exercises where illustration_svg is null), 0, 'mọi bài đều có SVG');
select is((select status from public.plan_versions where version_no = 1), 'active', 'plan v1 active');
select is((select count(*)::int from public.session_templates), 3, '3 template push/pull/legs');
select is((select count(*)::int from public.workout_sessions where session_date = '2026-10-26'), 1, 'buổi Push 26/10 seed 1 lần');
select is(
  (select sum(weight_kg * reps)::int from public.workout_sets
   where set_type = 'working' and completed and weight_kg is not null),
  1452, 'khối lượng buổi seed = 1.452 kg (không tính làm nóng, kg trống)');
select is((select count(*)::int from public.workout_sets where set_type = 'warmup'), 2, '2 hiệp làm nóng máy đẩy ngực');
select lives_ok(
  $$ insert into public.workout_sessions (session_date, kind, status, note) values ('2026-10-29', 'badminton', 'skipped', 'Bận việc') $$,
  'nghỉ buổi: lưu được trạng thái skipped kèm lý do');

-- Reflection: backfill allowed until the week has a review note, then locked
select lives_ok(
  $$ update public.workout_sessions set reflection = 'Khoẻ, ngủ đủ' where session_date = '2026-10-26' $$,
  'ghi bù cảm nhận khi tuần chưa review');
reset role;
insert into public.review_notes (user_id, week_start, content)
values ('11111111-1111-4111-8111-111111111111', '2026-10-26', 'Nhận xét tuần 1 đủ dài để lưu');
set local role authenticated;
select throws_ok(
  $$ update public.workout_sessions set reflection = 'Sửa sau review' where session_date = '2026-10-26' $$,
  'P0001', null, 'tuần đã review → không sửa cảm nhận');
select lives_ok(
  $$ update public.workout_sessions set duration_min = 61, reflection = 'Khoẻ, ngủ đủ' where session_date = '2026-10-26' $$,
  'tuần đã review: sửa cột khác (cảm nhận giữ nguyên) vẫn được');
select lives_ok(
  $$ insert into public.workout_sessions (session_date, kind, status) values ('2026-11-03', 'pull', 'completed');
     update public.workout_sessions set reflection = 'Mệt' where session_date = '2026-11-03' $$,
  'tuần chưa review vẫn ghi được');

-- Calo ≥ 1700
select throws_ok(
  $$ insert into public.plan_versions (status, content, change_note)
     select 'draft', jsonb_set(content, '{nutrition,calories_kcal}', '1699'), 'thử calo thấp'
     from public.plan_versions where version_no = 1 $$,
  '23514', null, 'calo 1.699 bị CHECK chặn');

-- Active versions cannot be created directly
select throws_ok(
  $$ insert into public.plan_versions (status, content) select 'active', content from public.plan_versions where version_no = 1 $$,
  '42501', null, 'client không insert được status=active');

-- Valid draft + approval
select lives_ok(
  $$ insert into public.plan_versions (status, content, change_note, based_on_version_id)
     select 'draft', jsonb_set(content, '{nutrition,calories_kcal}', '1800'), 'giảm 100', id
     from public.plan_versions where version_no = 1 $$,
  'tạo draft hợp lệ');
select is((select version_no from public.plan_versions where change_note = 'giảm 100'), 2, 'version_no tự tăng = 2');
select is(public.approve_plan_version((select id from public.plan_versions where version_no = 2), public.today_vn()), 'active', 'duyệt áp dụng hôm nay → active');
select is((select status from public.plan_versions where version_no = 1), 'archived', 'v1 chuyển archived');
select is((select count(*)::int from public.plan_versions where status = 'active'), 1, 'chỉ 1 bản active');

-- Upsert without `is_assisted` (older drafts) keeps the flag; with it, sets it
reset role;
select public._upsert_exercises('11111111-1111-4111-8111-111111111111',
  (select jsonb_build_array(e - 'is_assisted') from jsonb_array_elements(public._seed_payload()->'exercises') e where e->>'slug' = 'assisted_dip'),
  null, true);
select is((select is_assisted from public.exercises where slug = 'assisted_dip'), true, 'upsert thiếu is_assisted giữ nguyên cờ');
select public._upsert_exercises('11111111-1111-4111-8111-111111111111',
  (select jsonb_build_array(e || '{"is_assisted": true}') from jsonb_array_elements(public._seed_payload()->'exercises') e where e->>'slug' = 'pull_up'),
  null, true);
select is((select is_assisted from public.exercises where slug = 'pull_up'), true, 'upsert có is_assisted thì đặt cờ');

-- name_vi dropped (release N+1 of plan v2.7 B13); drafts that still carry name_vi upsert fine
select hasnt_column('public', 'exercises', 'name_vi', 'cột name_vi đã bỏ');
select col_not_null('public', 'exercises', 'name', 'name bắt buộc');
select public._upsert_exercises('11111111-1111-4111-8111-111111111111',
  (select jsonb_build_array((e - 'name') || jsonb_build_object('slug', 'test_old_draft', 'name_vi', 'Old Draft Name'))
   from jsonb_array_elements(public._seed_payload()->'exercises') e where e->>'slug' = 'leg_press'),
  null, false);
select is((select name from public.exercises where slug = 'test_old_draft'), 'Old Draft Name', 'draft cũ chỉ có name_vi → name');
select is((select count(*)::int from public.exercises where name is null), 0, 'mọi bài có name');

-- 4th gym day "Thân trên" (plan v2.8): `upper` template + session kind
set local role authenticated;
select lives_ok(
  $$ insert into public.plan_versions (status, content, change_note, based_on_version_id)
     select 'draft',
       jsonb_set(jsonb_set(content, '{templates}',
         content->'templates' || jsonb_build_array((content->'templates'->0) || '{"key": "upper", "name": "Thân trên"}')),
         '{schedule,fri}', '{"kind": "session", "template": "upper"}'),
       'thêm buổi thân trên T6', id
     from public.plan_versions where status = 'active' $$,
  'draft có template upper + T6 thân trên');
select is(public.approve_plan_version((select id from public.plan_versions where change_note = 'thêm buổi thân trên T6'), public.today_vn()), 'active', 'duyệt bản có thân trên');
select is((select count(*)::int from public.session_templates t join public.plan_versions p on p.id = t.plan_version_id
           where p.status = 'active' and t.key = 'upper'), 1, 'template upper được dựng');
select lives_ok(
  $$ insert into public.workout_sessions (session_date, kind, status) values ('2026-11-13', 'upper', 'completed') $$,
  'ghi được buổi kind = upper');
reset role;

-- Immutability
select throws_ok(
  $$ update public.plan_versions set content = jsonb_set(content, '{nutrition,protein_g}', '150') where version_no = 1 $$,
  'P0001', null, 'không sửa content bản đã duyệt');

-- Malicious SVG is rejected
select throws_ok(
  $$ update public.exercises set illustration_svg = '<svg onload="alert(1)"></svg>' where slug = 'plank' $$,
  '23514', null, 'SVG có onload bị CHECK chặn');

select * from finish();
rollback;
