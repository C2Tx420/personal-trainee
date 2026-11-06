-- Exercise display name column `name` (plan v2.7 §16 B13, release N). Since 05/11 `name_vi` holds the
-- English display name; `name` replaces it. Two releases: N adds `name` and keeps both columns in sync
-- (older app builds / coach drafts that only know `name_vi` keep working); N+1 drops `name_vi`.
alter table public.exercises add column name text check (name is null or length(name) >= 2);
update public.exercises set name = name_vi;

-- keep the two columns equal whichever one a client writes
create or replace function public.exercises_name_sync() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.name := coalesce(new.name, new.name_vi);
    new.name_vi := coalesce(new.name_vi, new.name);
  elsif new.name is distinct from old.name and new.name_vi is not distinct from old.name_vi then
    new.name_vi := new.name;
  elsif new.name_vi is distinct from old.name_vi and new.name is not distinct from old.name then
    new.name := new.name_vi;
  end if;
  return new;
end $$;
revoke execute on function public.exercises_name_sync() from public, anon, authenticated;

create trigger exercises_name_sync
  before insert or update of name, name_vi on public.exercises
  for each row execute function public.exercises_name_sync();

-- _upsert_exercises: a definition may carry `name` (new) or `name_vi` (older drafts / seed)
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
        user_id, slug, name, name_vi, aliases, primary_muscle, secondary_muscles, movement_pattern, kind,
        equipment, load_step_kg, is_time_based, cues, common_mistakes, illustration_svg, reference_url,
        archived, available_at_gym, is_assisted, canonical_exercise_id, updated_by_plan_version_id
      ) values (
        p_uid, e->>'slug', coalesce(e->>'name', e->>'name_vi'), coalesce(e->>'name_vi', e->>'name'),
        array(select jsonb_array_elements_text(coalesce(e->'aliases', '[]'))),
        e->>'primary_muscle',
        array(select jsonb_array_elements_text(coalesce(e->'secondary_muscles', '[]'))),
        e->>'movement_pattern', e->>'kind', e->>'equipment',
        coalesce((e->>'load_step_kg')::numeric, 2.5), coalesce((e->>'is_time_based')::boolean, false),
        array(select jsonb_array_elements_text(coalesce(e->'cues', '[]'))),
        array(select jsonb_array_elements_text(coalesce(e->'common_mistakes', '[]'))),
        e->>'illustration_svg', e->>'reference_url',
        coalesce((e->>'archived')::boolean, false), coalesce((e->>'available_at_gym')::boolean, true),
        coalesce((e->>'is_assisted')::boolean, false),
        canon, p_plan_id
      );
      n := n + 1;
    elsif p_overwrite then
      update public.exercises x set
        name = coalesce(e->>'name', e->>'name_vi'),
        name_vi = coalesce(e->>'name', e->>'name_vi'),
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
        is_assisted = coalesce((e->>'is_assisted')::boolean, x.is_assisted),
        canonical_exercise_id = coalesce(canon, x.canonical_exercise_id),
        is_provisional = false,
        updated_by_plan_version_id = p_plan_id
      where x.id = existing;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

revoke execute on function public._upsert_exercises(uuid, jsonb, uuid, boolean) from public, anon, authenticated;

update public.app_meta set value = '20261106000300' where key = 'schema_version';
