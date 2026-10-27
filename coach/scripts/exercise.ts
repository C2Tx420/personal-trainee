import { addDays, todayVN } from '../../src/engine/dates';
import { connect } from './db';

/**
 * In đầy đủ một bài (kể cả SVG) + lịch sử từng hiệp 8 tuần — dùng khi sửa bài.
 *   npm run exercise -- <slug>
 */
const slug = process.argv[2];
if (!slug) {
  console.error('Cần slug, vd. npm run exercise -- lat_pulldown');
  process.exit(1);
}
const sql = connect();
const [ex] = await sql`select * from exercises where slug = ${slug}`;
if (!ex) {
  console.error(`Không có bài ${slug}`);
  await sql.end();
  process.exit(1);
}
const history = await sql`
  select s.session_date::text as date, i.status as item_status, i.substitution_reason, i.note as item_note,
         w.set_type, w.set_index, w.weight_kg::float as kg, w.reps, w.seconds, w.feel, w.target_kg::float as target_kg,
         w.kg_change_reason, w.kg_change_note, w.note
  from workout_sets w
  join workout_session_items i on i.id = w.session_item_id
  join workout_sessions s on s.id = w.session_id
  where w.exercise_id = ${ex.id} and s.session_date >= ${addDays(todayVN(), -56)} and w.completed
  order by s.session_date, w.set_type desc, w.set_index`;
await sql.end();
console.log(JSON.stringify({ exercise: ex, history }, null, 2));
