import fs from 'node:fs';
import { planContentSchema, validatePlanRules } from '../../src/engine/plan-schema';
import { validateSvg } from '../../src/engine/svg-validate';
import { arg, connect } from './db';

/**
 * Gửi draft lộ trình cho anh duyệt (§7.5). Chỉ gọi được hàm coach_submit_draft —
 * draft luôn là status=draft, created_by=claude_code, không tự kích hoạt được.
 *
 *   pnpm run submit-draft --file draft.json --note "Lý do + số liệu…" [--based-on active|<uuid>]
 */
const file = arg('file');
const note = arg('note');
if (!file || !note) {
  console.error('Cần --file <content.json> và --note "<lý do + số liệu, ≥ 20 ký tự>"');
  process.exit(1);
}

const content = planContentSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
const sql = connect();
const slugs = (await sql`select slug from exercises`).map((r) => r.slug as string);
const errors = validatePlanRules(content, slugs).filter((i) => i.level === 'error').map((i) => i.message);
for (const e of content.exercise_upserts) {
  if (e.illustration_svg) for (const m of validateSvg(e.illustration_svg)) errors.push(`${e.slug}.svg: ${m}`);
  else if (!slugs.includes(e.slug)) errors.push(`${e.slug}: bài mới phải có illustration_svg`);
}
if (errors.length) {
  console.error('Draft không hợp lệ:\n- ' + errors.join('\n- '));
  await sql.end();
  process.exit(1);
}

const basedOnArg = arg('based-on') ?? 'active';
const basedOn =
  basedOnArg === 'active' ? ((await sql`select id from plan_versions where status = 'active'`)[0]?.id ?? null) : basedOnArg;
const [row] = await sql`select public.coach_submit_draft(${sql.json(content as never)}, ${note}, ${basedOn}) as id`;
await sql.end();
console.log(JSON.stringify({ draft_id: row.id }));
