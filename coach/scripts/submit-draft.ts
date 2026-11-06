import fs from 'node:fs';
import { validateDraft } from '../../src/engine/draft-validate';
import { parsePlanContent, planContentSchema, validatePlanRules } from '../../src/engine/plan-schema';
import { validateSvg } from '../../src/engine/svg-validate';
import { arg, connect } from './db';

/**
 * Submit a plan draft for approval (§7.5). Can only call coach_submit_draft —
 * the draft is always status=draft, created_by=claude_code, and cannot activate itself.
 *
 *   pnpm run submit-draft --file draft.json --note "Reason + data…" [--based-on active|<uuid>] [--allow-pending] [--accept-warnings]
 */
const file = arg('file');
const note = arg('note');
if (!file || !note) {
  console.error('Cần --file <content.json> và --note "<lý do + số liệu, ≥ 20 ký tự>"');
  process.exit(1);
}

const content = planContentSchema.parse(JSON.parse(fs.readFileSync(file, 'utf8')));
const sql = connect();
const lib = await sql`select slug, coalesce(name, name_vi) as name, load_step_kg::float as load_step_kg, is_assisted from exercises`;
const slugs = lib.map((r) => r.slug as string);
const errors = validatePlanRules(content, slugs).filter((i) => i.level === 'error').map((i) => i.message);
// stricter checks vs the active plan (§16 B6); "đau" in a set / exercise note in the last 4 weeks
const [activeRow] = await sql`select content from plan_versions where status = 'active'`;
const pain = await sql`
  select distinct x.slug from exercises x
  where exists (select 1 from workout_sets s join workout_sessions w on w.id = s.session_id
                where s.exercise_id = x.id and w.session_date >= current_date - 28 and s.note ~* '(đau|dau)')
     or exists (select 1 from workout_session_items i join workout_sessions w on w.id = i.session_id
                where i.exercise_id = x.id and w.session_date >= current_date - 28 and i.note ~* '(đau|dau)')`;
const strict = validateDraft(
  content,
  activeRow ? parsePlanContent(activeRow.content) : null,
  new Map(lib.map((r) => [r.slug as string, { load_step_kg: r.load_step_kg as number, is_assisted: r.is_assisted as boolean }])),
  { painSlugs: new Set(pain.map((r) => r.slug as string)), names: (s) => (lib.find((r) => r.slug === s)?.name as string) ?? s },
);
errors.push(...strict.filter((i) => i.level === 'error').map((i) => i.message));
const warnings = strict.filter((i) => i.level === 'warning').map((i) => i.message);
for (const e of content.exercise_upserts) {
  if (e.illustration_svg) for (const m of validateSvg(e.illustration_svg)) errors.push(`${e.slug}.svg: ${m}`);
  else if (!slugs.includes(e.slug)) errors.push(`${e.slug}: bài mới phải có illustration_svg`);
}
if (errors.length) {
  console.error('Draft không hợp lệ:\n- ' + errors.join('\n- '));
  await sql.end();
  process.exit(1);
}
if (warnings.length) {
  console.error('Cảnh báo:\n- ' + warnings.join('\n- '));
  if (!process.argv.includes('--accept-warnings')) {
    console.error('Mỗi cảnh báo cần lý do trong --note; gửi lại với --accept-warnings nếu đã cân nhắc.');
    await sql.end();
    process.exit(1);
  }
}

// one pending draft at a time: a second one goes stale as soon as either is approved (01–02/11/2026)
const pending = await sql`select id, version_no from plan_versions where status = 'draft' order by version_no`;
if (pending.length && !process.argv.includes('--allow-pending')) {
  console.error(
    `Đang có ${pending.length} bản nháp chờ duyệt (${pending.map((p) => `v${p.version_no} ${p.id}`).join(', ')}).\n` +
      'Nhờ anh từ chối bản cũ trong app trước, hoặc chạy lại với --allow-pending (app sẽ nhắc anh từ chối bản cũ).',
  );
  await sql.end();
  process.exit(1);
}

const basedOnArg = arg('based-on') ?? 'active';
const basedOn =
  basedOnArg === 'active' ? ((await sql`select id from plan_versions where status = 'active'`)[0]?.id ?? null) : basedOnArg;
const [row] = await sql`select public.coach_submit_draft(${sql.json(content as never)}, ${note}, ${basedOn}) as id`;
await sql.end();
console.log(JSON.stringify({ draft_id: row.id }));
