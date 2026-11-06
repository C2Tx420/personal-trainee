-- Assisted machines (assisted pull-up / dip): the kg on the stack is ASSISTANCE, so a lower kg is
-- harder. The app compares loads the other way round for these (src/engine/load.ts).
-- not null + default → inserts that don't send the column (older app builds, backups) keep working.
alter table public.exercises add column is_assisted boolean not null default false;

update public.exercises set is_assisted = true where slug in ('assisted_pull_up', 'assisted_dip');

-- _upsert_exercises: read `is_assisted`; a definition without the field (older drafts) keeps the
-- current value instead of resetting it.
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
        user_id, slug, name_vi, aliases, primary_muscle, secondary_muscles, movement_pattern, kind,
        equipment, load_step_kg, is_time_based, cues, common_mistakes, illustration_svg, reference_url,
        archived, available_at_gym, is_assisted, canonical_exercise_id, updated_by_plan_version_id
      ) values (
        p_uid, e->>'slug', e->>'name_vi',
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
        name_vi = e->>'name_vi',
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

update public.app_meta set value = '20261106000100' where key = 'schema_version';
