-- ============================================================================
-- RLS: mỗi bảng chỉ chủ sở hữu (auth.uid() = user_id) đọc/ghi.
-- Ngoại lệ: plan_versions (đọc + tạo draft; đổi trạng thái chỉ qua RPC),
-- template (chỉ đọc), review_notes (đọc + đánh dấu đã đọc), app_lock (không
-- policy nào cho client — chỉ Edge Function verify-pin dùng service role).
-- ============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'goals', 'exercises', 'workout_sessions', 'workout_session_items', 'workout_sets',
    'weight_logs', 'body_measurements', 'inbody_logs', 'progress_photos', 'notification_settings',
    'push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated
         using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

alter table public.plan_versions enable row level security;
create policy owner_select on public.plan_versions for select to authenticated
  using (user_id = (select auth.uid()));
create policy owner_insert_draft on public.plan_versions for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'draft');

alter table public.session_templates enable row level security;
create policy owner_select on public.session_templates for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.session_template_items enable row level security;
create policy owner_select on public.session_template_items for select to authenticated
  using (user_id = (select auth.uid()));

alter table public.review_notes enable row level security;
create policy owner_select on public.review_notes for select to authenticated
  using (user_id = (select auth.uid()));
create policy owner_mark_read on public.review_notes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.app_lock enable row level security;

alter table public.app_meta enable row level security;
create policy read_meta on public.app_meta for select to authenticated using (true);

-- Hardening: anon không có quyền gì trên schema public
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
-- client không bao giờ đọc/ghi app_lock (kể cả khi lỡ thêm policy sau này)
revoke all on public.app_lock from authenticated;
