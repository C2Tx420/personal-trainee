-- Post-workout reflection ("cảm nhận sau buổi"): free text, separate from `note` (which holds
-- the skip reason / "Ghi bù" / quick-log text). Can be written after the fact, but only until
-- Claude Code has reviewed that week (a review note with week_start = the session's Monday).
-- Only adds a nullable column → older app builds keep working.
alter table public.workout_sessions add column reflection text
  check (reflection is null or length(reflection) <= 2000);

-- Guard on UPDATE only: backup import upserts rows unchanged (old = new passes), and the app
-- writes the reflection with an update (finish session / session detail).
create or replace function public.workout_sessions_reflection_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.reflection is distinct from old.reflection and exists (
    select 1 from public.review_notes r
    where r.user_id = new.user_id and r.week_start = date_trunc('week', new.session_date)::date
  ) then
    raise exception 'Tuần này đã được review — không sửa cảm nhận buổi tập được nữa'
      using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke execute on function public.workout_sessions_reflection_guard() from public, anon, authenticated;

create trigger workout_sessions_reflection_guard
  before update of reflection on public.workout_sessions
  for each row execute function public.workout_sessions_reflection_guard();

update public.app_meta set value = '20261102000100' where key = 'schema_version';
