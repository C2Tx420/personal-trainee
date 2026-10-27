import type { ExerciseDef } from '../../src/engine/plan-schema';

/**
 * Seed exercise library (~44 exercises). SVG illustrations are generated from scripts/svg/poses.ts.
 * `aliases` = names the user commonly uses (for the substitute input + free-text quick log).
 */
type Def = Omit<ExerciseDef, 'illustration_svg'>;

const m = (d: Partial<Def> & Pick<Def, 'slug' | 'name_vi' | 'primary_muscle' | 'movement_pattern' | 'kind' | 'equipment'>): Def => ({
  aliases: [],
  secondary_muscles: [],
  load_step_kg: 5,
  is_time_based: false,
  cues: [],
  common_mistakes: [],
  ...d,
});

export const EXERCISES: Def[] = [
  // ───────── Push
  m({
    slug: 'machine_chest_press', name_vi: 'Máy đẩy ngực', aliases: ['đẩy ngực', 'đẩy ngực máy', 'chest press', 'máy đẩy ngực ngồi'],
    primary_muscle: 'chest', secondary_muscles: ['front_delt', 'triceps'], movement_pattern: 'horizontal_push', kind: 'compound', equipment: 'machine',
    cues: ['Chỉnh ghế để tay cầm ngang giữa ngực', 'Ép bả vai ra sau, ngực mở', 'Đẩy ra hết tầm nhưng không khoá khuỷu', 'Về chậm 2 giây'],
    common_mistakes: ['Nhún vai lên tai', 'Thả tạ rơi tự do khi về'],
  }),
  m({
    slug: 'bench_press', name_vi: 'Đẩy ngực tạ đòn', aliases: ['bench press', 'bench', 'đẩy ngực đòn'],
    primary_muscle: 'chest', secondary_muscles: ['front_delt', 'triceps'], movement_pattern: 'horizontal_push', kind: 'compound', equipment: 'barbell', load_step_kg: 2.5,
    cues: ['Bả vai siết ra sau, bàn chân bám sàn', 'Hạ đòn chạm giữa ngực', 'Khuỷu tay ~45° so với thân'],
    common_mistakes: ['Nảy đòn khỏi ngực', 'Khuỷu bè 90°'],
  }),
  m({
    slug: 'db_bench_press', name_vi: 'Đẩy ngực tạ đơn ghế phẳng', aliases: ['db bench press', 'dumbbell bench press', 'đẩy ngực tạ đơn', 'đẩy ngực ghế phẳng'],
    primary_muscle: 'chest', secondary_muscles: ['front_delt', 'triceps'], movement_pattern: 'horizontal_push', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Bả vai siết ra sau, bàn chân bám sàn', 'Hạ tạ tới ngang ngực, khuỷu ~45°', 'Đẩy lên và hơi chụm vào giữa'],
    common_mistakes: ['Hạ quá sâu làm căng vai', 'Khuỷu bè 90°'],
  }),
  m({
    slug: 'incline_db_press', name_vi: 'Đẩy ngực dốc tạ đơn', aliases: ['incline dumbbell press', 'đẩy ngực dốc', 'incline'],
    primary_muscle: 'chest', secondary_muscles: ['front_delt', 'triceps'], movement_pattern: 'horizontal_push', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Ghế dốc 30°', 'Hạ tạ ngang ngực trên', 'Đẩy chéo nhẹ vào giữa'],
    common_mistakes: ['Ghế dốc quá cao thành bài vai'],
  }),
  m({
    slug: 'dips', name_vi: 'Dips xà kép', aliases: ['dips', 'xà kép'],
    primary_muscle: 'chest', secondary_muscles: ['triceps', 'front_delt'], movement_pattern: 'horizontal_push', kind: 'compound', equipment: 'bodyweight', load_step_kg: 2.5,
    cues: ['Người hơi đổ trước để vào ngực', 'Hạ tới khi vai ngang khuỷu'],
    common_mistakes: ['Hạ quá sâu gây đau vai'],
  }),
  m({
    slug: 'pec_deck_fly', name_vi: 'Máy ép ngực (pec deck)', aliases: ['fly chest', 'chest fly', 'pec deck', 'ép ngực', 'máy ép ngực', 'fly'],
    primary_muscle: 'chest', secondary_muscles: ['front_delt'], movement_pattern: 'isolation_push', kind: 'isolation', equipment: 'machine',
    cues: ['Khuỷu hơi cong, cố định góc khuỷu', 'Ép tay về giữa, siết ngực 1 giây', 'Mở ra chậm tới khi căng ngực'],
    common_mistakes: ['Biến thành động tác đẩy', 'Mở quá rộng ra sau vai'],
  }),
  m({
    slug: 'machine_shoulder_press', name_vi: 'Máy đẩy vai', aliases: ['đẩy vai', 'shoulder press', 'đẩy vai máy'],
    primary_muscle: 'front_delt', secondary_muscles: ['side_delt', 'triceps'], movement_pattern: 'vertical_push', kind: 'compound', equipment: 'machine',
    cues: ['Lưng áp sát đệm', 'Tay cầm ngang tai khi bắt đầu', 'Đẩy thẳng lên, không khoá khuỷu'],
    common_mistakes: ['Ưỡn lưng khỏi đệm', 'Hạ quá thấp dưới cằm'],
  }),
  m({
    slug: 'overhead_press', name_vi: 'Đẩy vai tạ đòn đứng', aliases: ['overhead press', 'ohp', 'military press', 'đẩy vai đòn', 'đẩy vai đứng'],
    primary_muscle: 'front_delt', secondary_muscles: ['side_delt', 'triceps', 'abs'], movement_pattern: 'vertical_push', kind: 'compound', equipment: 'barbell', load_step_kg: 2.5,
    cues: ['Đòn tựa trước vai, tay rộng hơn vai một chút', 'Siết bụng và mông, không ưỡn lưng', 'Đẩy thẳng lên, đòn qua đầu thì đưa đầu ra trước'],
    common_mistakes: ['Ưỡn lưng dưới để đẩy', 'Đẩy đòn vòng ra trước mặt'],
  }),
  m({
    slug: 'seated_db_shoulder_press', name_vi: 'Đẩy vai tạ đơn ngồi', aliases: ['đẩy vai tạ đơn', 'dumbbell shoulder press'],
    primary_muscle: 'front_delt', secondary_muscles: ['side_delt', 'triceps'], movement_pattern: 'vertical_push', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Ghế dựng gần thẳng', 'Hạ tạ ngang tai', 'Siết bụng, không ưỡn lưng'],
    common_mistakes: ['Đập hai tạ vào nhau trên đỉnh'],
  }),
  m({
    slug: 'db_lateral_raise', name_vi: 'Nâng tạ đơn sang bên', aliases: ['nâng vai bên', 'lateral raise', 'dang tay', 'nâng tạ đơn bên'],
    primary_muscle: 'side_delt', movement_pattern: 'isolation_push', kind: 'isolation', equipment: 'dumbbell', load_step_kg: 1,
    cues: ['Khuỷu hơi cong', 'Nâng tới ngang vai, ngón út hơi cao', 'Hạ chậm'],
    common_mistakes: ['Vung người lấy đà', 'Nhún vai'],
  }),
  m({
    slug: 'cable_lateral_raise', name_vi: 'Nâng vai bên cáp', aliases: ['nâng vai cáp', 'cable lateral raise'],
    primary_muscle: 'side_delt', movement_pattern: 'isolation_push', kind: 'isolation', equipment: 'cable', load_step_kg: 2.5,
    cues: ['Đứng nghiêng, tay xa ròng rọc', 'Nâng tới ngang vai', 'Giữ căng cáp suốt hiệp'],
    common_mistakes: ['Kéo bằng thân người'],
  }),
  m({
    slug: 'machine_triceps_extension', name_vi: 'Máy duỗi tay sau', aliases: ['tay sau', 'máy tay sau', 'triceps máy', 'máy duỗi tay sau ngồi', 'triceps extension'],
    primary_muscle: 'triceps', movement_pattern: 'isolation_push', kind: 'isolation', equipment: 'machine',
    cues: ['Khuỷu đặt cố định trên đệm', 'Duỗi thẳng tay, siết tay sau', 'Về chậm'],
    common_mistakes: ['Nhấc khuỷu khỏi đệm', 'Dùng vai đẩy'],
  }),
  m({
    slug: 'triceps_pushdown', name_vi: 'Đẩy cáp tay sau', aliases: ['triceps pushdown', 'pushdown', 'đẩy cáp tay sau', 'tay sau cáp'],
    primary_muscle: 'triceps', movement_pattern: 'isolation_push', kind: 'isolation', equipment: 'cable', load_step_kg: 2.5,
    cues: ['Khuỷu sát hông, cố định', 'Đẩy xuống duỗi thẳng tay', 'Về tới ngang ngực'],
    common_mistakes: ['Khuỷu chạy ra trước', 'Đổ người dồn trọng lượng'],
  }),

  // ───────── Pull
  m({
    slug: 'lat_pulldown', name_vi: 'Máy kéo xô', aliases: ['lat pulldown', 'kéo xô', 'kéo xà máy', 'pulldown'],
    primary_muscle: 'lats', secondary_muscles: ['biceps', 'upper_back'], movement_pattern: 'vertical_pull', kind: 'compound', equipment: 'machine',
    cues: ['Đùi kẹp chặt dưới đệm', 'Kéo thanh về ngực trên, ngực hướng lên', 'Khuỷu kéo xuống và ra sau'],
    common_mistakes: ['Ngả người quá nhiều', 'Kéo ra sau gáy'],
  }),
  m({
    slug: 'pull_up', name_vi: 'Kéo xà đơn', aliases: ['pull up', 'kéo xà', 'hít xà'],
    primary_muscle: 'lats', secondary_muscles: ['biceps', 'upper_back'], movement_pattern: 'vertical_pull', kind: 'compound', equipment: 'bodyweight', load_step_kg: 2.5,
    cues: ['Treo thẳng tay, siết bả vai', 'Kéo ngực về phía xà'],
    common_mistakes: ['Đung đưa lấy đà'],
  }),
  m({
    slug: 'assisted_pull_up', name_vi: 'Máy kéo xà có trợ lực', aliases: ['assisted pull up', 'kéo xà trợ lực'],
    primary_muscle: 'lats', secondary_muscles: ['biceps'], movement_pattern: 'vertical_pull', kind: 'compound', equipment: 'machine',
    cues: ['Kg càng cao càng nhẹ (trợ lực)', 'Quỳ lên đệm, kéo ngực về xà'],
    common_mistakes: ['Thả người rơi nhanh khi xuống'],
  }),
  m({
    slug: 'chest_supported_machine_row', name_vi: 'Máy chèo tựa ngực', aliases: ['chest supported row', 'máy chèo', 'row máy', 'chèo tựa ngực', 't-bar máy'],
    primary_muscle: 'upper_back', secondary_muscles: ['lats', 'biceps', 'rear_delt'], movement_pattern: 'horizontal_pull', kind: 'compound', equipment: 'machine',
    cues: ['Ngực áp sát đệm suốt hiệp', 'Kéo khuỷu ra sau, siết bả vai', 'Duỗi tay hết khi về'],
    common_mistakes: ['Nhấc ngực khỏi đệm để giật tạ'],
  }),
  m({
    slug: 'barbell_row', name_vi: 'Chèo tạ đòn', aliases: ['barbell row', 'chèo đòn'],
    primary_muscle: 'upper_back', secondary_muscles: ['lats', 'biceps', 'lower_back'], movement_pattern: 'horizontal_pull', kind: 'compound', equipment: 'barbell', load_step_kg: 2.5,
    cues: ['Gập hông ~45°, lưng thẳng', 'Kéo đòn về rốn'],
    common_mistakes: ['Cong lưng dưới'],
  }),
  m({
    slug: 'one_arm_db_row', name_vi: 'Chèo tạ đơn một tay', aliases: ['chèo tạ đơn', 'one arm row', 'db row'],
    primary_muscle: 'lats', secondary_muscles: ['upper_back', 'biceps'], movement_pattern: 'horizontal_pull', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Tay và gối tì ghế, lưng ngang', 'Kéo tạ về hông'],
    common_mistakes: ['Xoay người để kéo'],
  }),
  m({
    slug: 'seated_cable_row', name_vi: 'Kéo cáp ngồi', aliases: ['seated cable row', 'kéo cáp ngồi', 'chèo cáp'],
    primary_muscle: 'upper_back', secondary_muscles: ['lats', 'biceps'], movement_pattern: 'horizontal_pull', kind: 'compound', equipment: 'cable', load_step_kg: 5,
    cues: ['Ngồi thẳng, gối hơi cong', 'Kéo tay cầm về bụng, siết bả vai', 'Không ngả người ra sau'],
    common_mistakes: ['Đung đưa thân người'],
  }),
  m({
    slug: 'face_pull', name_vi: 'Face pull (cáp)', aliases: ['face pull', 'kéo mặt'],
    primary_muscle: 'rear_delt', secondary_muscles: ['upper_back', 'traps'], movement_pattern: 'isolation_pull', kind: 'isolation', equipment: 'cable', load_step_kg: 2.5,
    cues: ['Ròng rọc ngang mặt, dùng dây thừng', 'Kéo về mặt, tách hai tay ra hai bên', 'Khuỷu cao ngang vai'],
    common_mistakes: ['Kéo bằng lưng dưới'],
  }),
  m({
    slug: 'reverse_pec_deck', name_vi: 'Máy bay ngược (vai sau)', aliases: ['reverse pec deck', 'bay ngược', 'rear delt fly'],
    primary_muscle: 'rear_delt', secondary_muscles: ['upper_back'], movement_pattern: 'isolation_pull', kind: 'isolation', equipment: 'machine',
    cues: ['Ngồi quay mặt vào máy', 'Mở tay ra sau ngang vai'],
    common_mistakes: ['Nhún vai'],
  }),
  m({
    slug: 'machine_biceps_curl', name_vi: 'Máy cuốn tay trước', aliases: ['tay trước', 'curl máy', 'biceps máy'],
    primary_muscle: 'biceps', secondary_muscles: ['forearms'], movement_pattern: 'isolation_pull', kind: 'isolation', equipment: 'machine',
    cues: ['Nách tì sát đệm', 'Cuốn lên hết, siết 1 giây', 'Về chậm, duỗi gần hết'],
    common_mistakes: ['Nhấc người khỏi ghế'],
  }),
  m({
    slug: 'cable_curl', name_vi: 'Curl cáp', aliases: ['cable curl', 'cuốn cáp'],
    primary_muscle: 'biceps', movement_pattern: 'isolation_pull', kind: 'isolation', equipment: 'cable', load_step_kg: 2.5,
    cues: ['Khuỷu cố định sát hông'], common_mistakes: ['Vung người'],
  }),
  m({
    slug: 'db_curl', name_vi: 'Curl tạ đơn', aliases: ['dumbbell curl', 'cuốn tạ đơn', 'curl'],
    primary_muscle: 'biceps', secondary_muscles: ['forearms'], movement_pattern: 'isolation_pull', kind: 'isolation', equipment: 'dumbbell', load_step_kg: 1,
    cues: ['Khuỷu cố định', 'Xoay cổ tay ngửa lên khi cuốn'], common_mistakes: ['Đung đưa lấy đà'],
  }),

  // ───────── Legs
  m({
    slug: 'leg_press', name_vi: 'Máy đạp đùi', aliases: ['leg press', 'đạp đùi', 'đạp chân'],
    primary_muscle: 'quads', secondary_muscles: ['glutes', 'hamstrings'], movement_pattern: 'squat', kind: 'compound', equipment: 'machine',
    cues: ['Chân rộng bằng vai giữa bàn đạp', 'Hạ tới gối ~90°, lưng dưới không rời đệm', 'Đẩy bằng cả bàn chân, không khoá gối'],
    common_mistakes: ['Hạ quá sâu làm cong lưng dưới', 'Khoá gối khi duỗi'],
  }),
  m({
    slug: 'hack_squat', name_vi: 'Máy hack squat', aliases: ['hack squat', 'hack'],
    primary_muscle: 'quads', secondary_muscles: ['glutes'], movement_pattern: 'squat', kind: 'compound', equipment: 'machine', available_at_gym: false,
    cues: ['Lưng áp sát đệm', 'Xuống tới đùi song song', 'Gối theo hướng mũi chân'],
    common_mistakes: ['Gót chân nhấc lên'],
  }),
  m({
    slug: 'goblet_squat', name_vi: 'Goblet squat', aliases: ['goblet squat', 'squat tạ đơn'],
    primary_muscle: 'quads', secondary_muscles: ['glutes', 'abs'], movement_pattern: 'squat', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Ôm tạ trước ngực', 'Ngồi xuống giữa hai gót', 'Ngực thẳng'], common_mistakes: ['Gối đổ vào trong'],
  }),
  m({
    slug: 'back_squat', name_vi: 'Squat tạ đòn', aliases: ['back squat', 'squat'],
    primary_muscle: 'quads', secondary_muscles: ['glutes', 'lower_back'], movement_pattern: 'squat', kind: 'compound', equipment: 'barbell', load_step_kg: 2.5,
    cues: ['Đòn trên vai sau', 'Xuống tới đùi song song'], common_mistakes: ['Cong lưng dưới ở đáy'],
  }),
  m({
    slug: 'smith_squat', name_vi: 'Smith squat', aliases: ['smith squat', 'squat smith'],
    primary_muscle: 'quads', secondary_muscles: ['glutes'], movement_pattern: 'squat', kind: 'compound', equipment: 'smith', load_step_kg: 2.5,
    cues: ['Chân bước lên trước một chút', 'Xuống tới đùi song song'], common_mistakes: ['Chân đặt quá sát thanh'],
  }),
  m({
    slug: 'bulgarian_split_squat', name_vi: 'Bulgarian split squat tạ đơn', aliases: ['bulgarian split squat', 'bulgarian', 'split squat', 'squat chân sau gác ghế'],
    primary_muscle: 'quads', secondary_muscles: ['glutes', 'hamstrings'], movement_pattern: 'squat', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Mu chân sau gác lên ghế', 'Hạ thẳng xuống tới gối sau gần chạm sàn', 'Dồn trọng tâm vào chân trước, đẩy bằng cả bàn chân'],
    common_mistakes: ['Gối trước đổ vào trong', 'Đứng quá gần ghế'],
  }),
  m({
    slug: 'db_lunge', name_vi: 'Lunge tạ đơn', aliases: ['lunge', 'walking lunge', 'chùng chân', 'bước chùng'],
    primary_muscle: 'quads', secondary_muscles: ['glutes', 'hamstrings'], movement_pattern: 'squat', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Bước dài vừa phải, thân thẳng', 'Hạ tới hai gối ~90°', 'Đẩy bằng gót chân trước để đứng lên'],
    common_mistakes: ['Bước quá ngắn, gối trước vượt xa mũi chân', 'Đổ người ra trước'],
  }),
  m({
    slug: 'deadlift', name_vi: 'Deadlift tạ đòn', aliases: ['deadlift', 'dl', 'kéo đất'],
    primary_muscle: 'glutes', secondary_muscles: ['hamstrings', 'lower_back', 'quads', 'upper_back'], movement_pattern: 'hinge', kind: 'compound', equipment: 'barbell', load_step_kg: 5,
    cues: ['Đòn sát ống chân, trên giữa bàn chân', 'Hít sâu siết bụng, lưng thẳng trước khi kéo', 'Đẩy sàn bằng chân, đòn trượt sát người', 'Đứng thẳng hết hông, không ngả ra sau'],
    common_mistakes: ['Cong lưng khi kéo', 'Đòn rời xa người', 'Giật đòn khỏi sàn'],
  }),
  m({
    slug: 'romanian_deadlift', name_vi: 'Romanian deadlift', aliases: ['rdl', 'romanian deadlift', 'deadlift romania'],
    primary_muscle: 'hamstrings', secondary_muscles: ['glutes', 'lower_back'], movement_pattern: 'hinge', kind: 'compound', equipment: 'dumbbell', load_step_kg: 2,
    cues: ['Đẩy hông ra sau, gối hơi cong', 'Tạ trượt sát đùi', 'Lưng thẳng suốt'], common_mistakes: ['Cong lưng', 'Biến thành squat'],
  }),
  m({
    slug: 'hip_thrust', name_vi: 'Hip thrust tạ đòn', aliases: ['hip thrust', 'đẩy hông', 'hip thrust đòn'],
    primary_muscle: 'glutes', secondary_muscles: ['hamstrings'], movement_pattern: 'hinge', kind: 'compound', equipment: 'barbell', load_step_kg: 5,
    cues: ['Lưng trên tựa mép ghế, đòn có đệm ngang hông', 'Đẩy hông lên tới thân thẳng hàng đùi', 'Siết mông 1 giây ở đỉnh, cằm hơi cúi'],
    common_mistakes: ['Ưỡn lưng thay vì đẩy hông', 'Bàn chân đặt quá xa'],
  }),
  m({
    slug: 'leg_curl', name_vi: 'Máy cuốn đùi sau', aliases: ['leg curl', 'cuốn đùi', 'đùi sau'],
    primary_muscle: 'hamstrings', movement_pattern: 'isolation_legs', kind: 'isolation', equipment: 'machine',
    cues: ['Gối thẳng trục máy', 'Cuốn hết tầm, siết 1 giây', 'Về chậm'], common_mistakes: ['Nhấc hông lên'],
  }),
  m({
    slug: 'back_extension_45', name_vi: 'Máy duỗi lưng 45°', aliases: ['back extension', 'duỗi lưng', 'hyperextension'],
    primary_muscle: 'lower_back', secondary_muscles: ['glutes', 'hamstrings'], movement_pattern: 'hinge', kind: 'isolation', equipment: 'machine', load_step_kg: 5,
    cues: ['Đệm ngang xương hông', 'Gập từ hông, lưng thẳng', 'Lên tới thân thẳng hàng chân, không ưỡn quá'],
    common_mistakes: ['Ưỡn lưng quá mức ở đỉnh'],
  }),
  m({
    slug: 'calf_raise', name_vi: 'Máy nhón bắp chân', aliases: ['calf raise', 'nhón bắp chân', 'bắp chân'],
    primary_muscle: 'calves', movement_pattern: 'isolation_legs', kind: 'isolation', equipment: 'machine',
    cues: ['Hạ gót sâu', 'Nhón cao, giữ 1 giây'], common_mistakes: ['Nhún nhanh không hết tầm'],
  }),
  m({
    slug: 'plank', name_vi: 'Plank', aliases: ['plank'],
    primary_muscle: 'abs', secondary_muscles: ['obliques'], movement_pattern: 'core', kind: 'core', equipment: 'bodyweight', load_step_kg: 0, is_time_based: true, archived: true,
    cues: ['Khuỷu dưới vai', 'Thân thẳng từ đầu tới gót', 'Siết bụng và mông'], common_mistakes: ['Võng hông', 'Chổng mông'],
  }),

  // ───────── Cardio / core / warm-up
  m({
    slug: 'treadmill_walk', name_vi: 'Đi bộ máy chạy', aliases: ['đi bộ máy', 'treadmill', 'máy chạy bộ', 'warm up đi bộ'],
    primary_muscle: 'cardio', movement_pattern: 'cardio', kind: 'cardio', equipment: 'cardio_machine', load_step_kg: 0, is_time_based: true,
    cues: ['Tốc độ 3,5–5 km/h', 'Thở đều, có thể nói chuyện được'], common_mistakes: ['Vịn tay vào máy'],
  }),
  m({
    slug: 'walk', name_vi: 'Đi bộ ngoài trời', aliases: ['đi bộ', 'walk'],
    primary_muscle: 'cardio', movement_pattern: 'cardio', kind: 'cardio', equipment: 'none', load_step_kg: 0, is_time_based: true,
    cues: ['30–40 phút, nhịp vừa phải'],
  }),
  m({
    slug: 'zone2_cardio', name_vi: 'Cardio zone 2', aliases: ['zone 2', 'zone2', 'đạp xe'],
    primary_muscle: 'cardio', movement_pattern: 'cardio', kind: 'cardio', equipment: 'cardio_machine', load_step_kg: 0, is_time_based: true,
    cues: ['Nhịp tim ~60–70% tối đa', 'Thở bằng mũi được'],
  }),
  m({
    slug: 'dead_bug', name_vi: 'Dead bug', aliases: ['dead bug'],
    primary_muscle: 'abs', movement_pattern: 'core', kind: 'core', equipment: 'bodyweight', load_step_kg: 0,
    cues: ['Lưng dưới áp sàn', 'Duỗi tay chân đối nhau chậm'], common_mistakes: ['Lưng dưới bật khỏi sàn'],
  }),
  m({
    slug: 'side_plank', name_vi: 'Plank nghiêng', aliases: ['side plank', 'plank nghiêng'],
    primary_muscle: 'obliques', secondary_muscles: ['abs'], movement_pattern: 'core', kind: 'core', equipment: 'bodyweight', load_step_kg: 0, is_time_based: true,
    cues: ['Khuỷu dưới vai', 'Hông nâng thẳng hàng'], common_mistakes: ['Hông chùng xuống'],
  }),
];
