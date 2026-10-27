import fs from 'node:fs';
import { arg, connect } from './db';

/**
 * Write the weekly review note (§7.5) — read in the app (More → Coach notes).
 *
 *   pnpm run add-review-note --week 2026-10-26 --file note.md [--plan <draft_id>]
 */
const week = arg('week');
const file = arg('file');
if (!week || !file) {
  console.error('Cần --week YYYY-MM-DD và --file <note.md>');
  process.exit(1);
}
const content = fs.readFileSync(file, 'utf8').trim();
const sql = connect();
const [row] = await sql`select public.coach_add_review_note(${week}::date, ${content}, ${arg('plan') ?? null}) as id`;
await sql.end();
console.log(JSON.stringify({ review_note_id: row.id }));
