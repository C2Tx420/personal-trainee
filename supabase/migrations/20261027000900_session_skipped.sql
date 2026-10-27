-- Skipped day (plan v2.5): a scheduled session / badminton day he didn't do, logged as
-- status = 'skipped' with the reason in `note`. Only widens the allowed values → older
-- app builds keep working.
alter table public.workout_sessions drop constraint workout_sessions_status_check;
alter table public.workout_sessions add constraint workout_sessions_status_check
  check (status in ('in_progress', 'completed', 'abandoned', 'skipped'));

update public.app_meta set value = '20261027000900' where key = 'schema_version';
