-- ============================================================================
-- Lịch chạy:
--  • 00:05 giờ VN mỗi ngày: kích hoạt lộ trình "scheduled" đã tới ngày.
--  • mỗi 15 phút: gọi Edge Function send-reminders.
-- URL function + secret lấy từ app_meta / Vault (đặt tay khi deploy, xem docs/setup.md);
-- chưa cấu hình thì bỏ qua, không lỗi.
-- ============================================================================

create or replace function public.trigger_reminders() returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from public.app_meta where key = 'functions_url';
  begin
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';
  exception when others then
    v_secret := null;
  end;
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url || '/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret),
    body := '{}'::jsonb
  );
end $$;
revoke execute on function public.trigger_reminders() from public, anon, authenticated;

select cron.schedule('activate-due-plans', '5 17 * * *', $$select public.activate_due_plans_all()$$);
select cron.schedule('send-reminders', '*/15 * * * *', $$select public.trigger_reminders()$$);

update public.app_meta set value = '20261027000800' where key = 'schema_version';
