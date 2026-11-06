-- "Bỏ buổi" reminder (plan v2.7 §16 B12): 21:00 on a lifting day with nothing logged yet.
-- Extends the allowed kinds (older app builds never send it) and adds the default row for existing users.
alter table public.notification_settings drop constraint notification_settings_kind_check;
alter table public.notification_settings add constraint notification_settings_kind_check
  check (kind in ('workout', 'water', 'weigh_in', 'measurements', 'inbody', 'photos', 'goal', 'weekly_review', 'missed_workout'));

insert into public.notification_settings (user_id, kind, enabled, time_of_day)
select user_id, 'missed_workout', true, '21:00' from public.profiles
on conflict (user_id, kind) do nothing;

update public.app_meta set value = '20261106000200' where key = 'schema_version';
