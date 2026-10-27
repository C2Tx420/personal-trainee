begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, aud, role, instance_id) values
  ('11111111-1111-4111-8111-111111111111', 'owner@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-4222-8222-222222222222', 'other@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}';
select public.bootstrap_user();
insert into public.progress_photos (taken_on, angle, storage_path) values ('2026-10-27', 'front', '11111111-1111-4111-8111-111111111111/2026-10-27/front.jpg');
reset role;

-- anon can't read anything
set local role anon;
select throws_ok($$ select count(*) from public.weight_logs $$, '42501', null, 'anon không đọc weight_logs');
select throws_ok($$ select count(*) from public.exercises $$, '42501', null, 'anon không đọc exercises');
reset role;

-- another user sees none of the data
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}';
select is((select count(*)::int from public.weight_logs), 0, 'user khác: 0 weight_logs');
select is((select count(*)::int from public.workout_sets), 0, 'user khác: 0 workout_sets');
select is((select count(*)::int from public.progress_photos), 0, 'user khác: 0 ảnh');
select throws_ok($$ select * from public.app_lock $$, '42501', null, 'client không đọc app_lock');
select throws_ok(
  $$ select public.approve_plan_version((select id from public.plan_versions limit 1), public.today_vn()) $$,
  'P0001', null, 'không duyệt được lộ trình của người khác');
reset role;

-- coach_readonly (lets the test user impersonate this role, rolled back at the end of the file)
grant coach_readonly to postgres;
grant usage on schema extensions to coach_readonly; -- so pgTAP functions can be called
set local role coach_readonly;
select ok((select count(*) from public.workout_sets) > 0, 'coach đọc được workout_sets');
select ok((select count(*) from public.workout_session_items) > 0, 'coach đọc được workout_session_items');
select ok((select count(*) from public.exercises) > 0, 'coach đọc được exercises');
select throws_ok($$ select count(*) from public.progress_photos $$, '42501', null, 'coach KHÔNG đọc progress_photos');
select throws_ok($$ select count(*) from public.app_lock $$, '42501', null, 'coach KHÔNG đọc app_lock');
select throws_ok($$ select count(*) from storage.objects $$, '42501', null, 'coach KHÔNG đọc storage');
select throws_ok($$ update public.plan_versions set status = 'active' $$, '42501', null, 'coach KHÔNG update plan_versions');
select lives_ok(
  $$ select public.coach_submit_draft(
       (select content from public.plan_versions where version_no = 1),
       'Đặt tạ mục tiêu tuần 2 dựa trên số liệu tuần 1', null) $$,
  'coach gửi được draft');
reset role;
select is(
  (select status || '/' || created_by from public.plan_versions where created_by = 'claude_code'),
  'draft/claude_code', 'draft của coach luôn là draft/claude_code');

select * from finish();
rollback;
