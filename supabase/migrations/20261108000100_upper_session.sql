-- Plan v2.8: 4th gym day "Thân trên" (template key / session kind `upper`). Badminton stays its own
-- kind and becomes an active rest day, not a main session (app-side counting only).
-- Only widens two check constraints → older app builds keep working (they never write `upper`).
alter table public.session_templates drop constraint session_templates_key_check;
alter table public.session_templates add constraint session_templates_key_check
  check (key in ('push', 'pull', 'legs', 'upper'));

alter table public.workout_sessions drop constraint workout_sessions_kind_check;
alter table public.workout_sessions add constraint workout_sessions_kind_check
  check (kind in ('push', 'pull', 'legs', 'upper', 'push_light', 'pull_light', 'badminton', 'walk', 'zone2', 'core'));

-- Dated before 20261113000100 (drop name_vi, which ships on its own date) but may run after it:
-- never move schema_version backwards.
update public.app_meta set value = greatest(value, '20261108000100') where key = 'schema_version';
