begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Simulated user
insert into auth.users (id, email, aud, role, instance_id)
values ('11111111-1111-4111-8111-111111111111', 'owner@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';

select lives_ok($$ select public.bootstrap_user() $$, 'bootstrap_user chạy được');
select lives_ok($$ select public.bootstrap_user() $$, 'bootstrap_user gọi lại không lỗi (idempotent)');

select is((select count(*)::int from public.goals), 3, '3 mốc goal');
select ok((select count(*) from public.exercises) >= 44, '≥ 44 bài tập seed');
select is((select available_at_gym from public.exercises where slug = 'hack_squat'), false, 'hack squat: phòng tập không có máy');
select is((select archived from public.exercises where slug = 'plank'), true, 'plank đã lưu trữ');
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

-- Immutability
reset role;
select throws_ok(
  $$ update public.plan_versions set content = jsonb_set(content, '{nutrition,protein_g}', '150') where version_no = 1 $$,
  'P0001', null, 'không sửa content bản đã duyệt');

-- Malicious SVG is rejected
select throws_ok(
  $$ update public.exercises set illustration_svg = '<svg onload="alert(1)"></svg>' where slug = 'plank' $$,
  '23514', null, 'SVG có onload bị CHECK chặn');

select * from finish();
rollback;
