-- Exercise display names → English. The column stays `name_vi` (renaming a column needs two
-- releases); it now simply holds the display name. Only seed exercises whose name is still the
-- original seed name are touched, so anything renamed by hand or by a coach upsert is left alone.
-- The old Vietnamese name is kept as an alias → search, substitute input and quick log still
-- match it. The SVG aria-label follows the new name. Data-only → older app builds keep working.
update public.exercises x set
  name_vi = m.new_name,
  aliases = case
    when exists (select 1 from unnest(x.aliases) a where lower(a) = lower(m.old_name)) then x.aliases
    else x.aliases || m.old_name
  end,
  illustration_svg = replace(x.illustration_svg,
    'aria-label="' || replace(replace(replace(m.old_name, '&', '&amp;'), '<', '&lt;'), '"', '&quot;') || '"',
    'aria-label="' || replace(replace(replace(m.new_name, '&', '&amp;'), '<', '&lt;'), '"', '&quot;') || '"'),
  updated_at = now()
from (values
  ('machine_chest_press', 'Máy đẩy ngực', 'Machine Chest Press'),
  ('bench_press', 'Đẩy ngực tạ đòn', 'Barbell Bench Press'),
  ('db_bench_press', 'Đẩy ngực tạ đơn ghế phẳng', 'Dumbbell Bench Press'),
  ('incline_db_press', 'Đẩy ngực dốc tạ đơn', 'Incline Dumbbell Press'),
  ('dips', 'Dips xà kép', 'Parallel Bar Dips'),
  ('pec_deck_fly', 'Máy ép ngực (pec deck)', 'Pec Deck Fly'),
  ('machine_shoulder_press', 'Máy đẩy vai', 'Machine Shoulder Press'),
  ('overhead_press', 'Đẩy vai tạ đòn đứng', 'Barbell Overhead Press'),
  ('seated_db_shoulder_press', 'Đẩy vai tạ đơn ngồi', 'Seated Dumbbell Shoulder Press'),
  ('db_lateral_raise', 'Nâng tạ đơn sang bên', 'Dumbbell Lateral Raise'),
  ('cable_lateral_raise', 'Nâng vai bên cáp', 'Cable Lateral Raise'),
  ('machine_triceps_extension', 'Máy duỗi tay sau', 'Machine Triceps Extension'),
  ('triceps_pushdown', 'Đẩy cáp tay sau', 'Cable Triceps Pushdown'),
  ('machine_lateral_raise', 'Máy nâng vai ngang (ngồi)', 'Machine Lateral Raise'),
  ('machine_seated_dip', 'Máy dip ngồi (tay sau)', 'Seated Dip Machine'),
  ('assisted_dip', 'Máy dip có trợ lực', 'Assisted Dip'),
  ('lat_pulldown', 'Kéo xô cáp', 'Cable Lat Pulldown'),
  ('pull_up', 'Kéo xà đơn', 'Pull-Up'),
  ('assisted_pull_up', 'Máy kéo xà có trợ lực', 'Assisted Pull-Up'),
  ('chest_supported_machine_row', 'Máy chèo tựa ngực', 'Chest-Supported Machine Row'),
  ('machine_lat_pulldown', 'Máy kéo xô', 'Machine Lat Pulldown'),
  ('barbell_row', 'Chèo tạ đòn', 'Barbell Row'),
  ('one_arm_db_row', 'Chèo tạ đơn một tay', 'One-Arm Dumbbell Row'),
  ('seated_cable_row', 'Kéo cáp ngồi', 'Seated Cable Row'),
  ('face_pull', 'Face pull (cáp)', 'Cable Face Pull'),
  ('reverse_pec_deck', 'Máy bay ngược (vai sau)', 'Reverse Pec Deck'),
  ('machine_biceps_curl', 'Máy cuốn tay trước', 'Machine Biceps Curl'),
  ('cable_curl', 'Curl cáp', 'Cable Curl'),
  ('db_curl', 'Curl tạ đơn', 'Dumbbell Curl'),
  ('leg_press', 'Máy đạp đùi', 'Leg Press'),
  ('hack_squat', 'Máy hack squat', 'Hack Squat'),
  ('goblet_squat', 'Goblet squat', 'Goblet Squat'),
  ('back_squat', 'Squat tạ đòn', 'Barbell Back Squat'),
  ('smith_squat', 'Smith squat', 'Smith Machine Squat'),
  ('bulgarian_split_squat', 'Bulgarian split squat tạ đơn', 'Dumbbell Bulgarian Split Squat'),
  ('db_lunge', 'Lunge tạ đơn', 'Dumbbell Lunge'),
  ('deadlift', 'Deadlift tạ đòn', 'Barbell Deadlift'),
  ('romanian_deadlift', 'Romanian deadlift', 'Dumbbell Romanian Deadlift'),
  ('hip_thrust', 'Hip thrust tạ đòn', 'Barbell Hip Thrust'),
  ('leg_curl', 'Máy cuốn đùi sau', 'Leg Curl'),
  ('leg_extension', 'Máy đá đùi trước', 'Leg Extension'),
  ('hip_abduction_machine', 'Máy dạng hông (mông bên)', 'Hip Abduction Machine'),
  ('hip_adduction_machine', 'Máy khép đùi (đùi trong)', 'Hip Adduction Machine'),
  ('back_extension_45', 'Máy duỗi lưng 45°', '45° Back Extension'),
  ('calf_raise', 'Máy nhón bắp chân', 'Machine Calf Raise'),
  ('treadmill_walk', 'Đi bộ máy chạy', 'Treadmill Walk'),
  ('walk', 'Đi bộ ngoài trời', 'Outdoor Walk'),
  ('zone2_cardio', 'Cardio zone 2', 'Zone 2 Cardio'),
  ('dead_bug', 'Dead bug', 'Dead Bug'),
  ('ab_crunch_machine', 'Máy gập bụng', 'Ab Crunch Machine'),
  ('rotary_torso_machine', 'Máy xoay thân', 'Rotary Torso Machine'),
  ('side_plank', 'Plank nghiêng', 'Side Plank')
) as m(slug, old_name, new_name)
where x.slug = m.slug and x.name_vi = m.old_name;

update public.app_meta set value = '20261105000100' where key = 'schema_version';
