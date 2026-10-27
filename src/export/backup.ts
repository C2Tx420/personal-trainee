import { z } from 'zod';

/**
 * JSON backup `pt-backup/1` (§6.11). Every table except app_lock and push_subscriptions.
 * Table order = foreign key order, so re-importing (upsert by id) doesn't break constraints.
 */
const BACKUP_SCHEMA = 'pt-backup/1';

export const BACKUP_TABLES = [
  'profiles',
  'goals',
  'plan_versions',
  'exercises',
  'session_templates',
  'session_template_items',
  'workout_sessions',
  'workout_session_items',
  'workout_sets',
  'weight_logs',
  'body_measurements',
  'inbody_logs',
  'progress_photos',
  'notification_settings',
  'review_notes',
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Tables that are read-only for the client (RLS) — not importable, rebuilt when a plan is approved. */
const READ_ONLY_TABLES: BackupTable[] = ['session_templates', 'session_template_items', 'review_notes'];

/** Generated columns — dropped on import. */
const GENERATED: Partial<Record<BackupTable, string[]>> = { plan_versions: ['calories_kcal'] };

const backupSchema = z.object({
  schema: z.literal(BACKUP_SCHEMA),
  exported_at: z.string(),
  app_version: z.string(),
  tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  photos: z.array(z.object({ path: z.string(), base64: z.string() })).optional(),
});
export type Backup = z.infer<typeof backupSchema>;

export function buildBackup(tables: Partial<Record<BackupTable, Record<string, unknown>[]>>, appVersion: string, now = new Date()): Backup {
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const t of BACKUP_TABLES) out[t] = tables[t] ?? [];
  return { schema: BACKUP_SCHEMA, exported_at: now.toISOString(), app_version: appVersion, tables: out };
}

export type ImportPlan = { table: BackupTable; rows: Record<string, unknown>[] }[];

/** Validate + order data for import. Throws a Vietnamese error message on bad format. */
export function planImport(raw: unknown): { plan: ImportPlan; counts: Record<string, number>; skipped: string[] } {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new Error('File sao lưu không đúng định dạng pt-backup/1');
  const plan: ImportPlan = [];
  const counts: Record<string, number> = {};
  const skipped: string[] = [];
  for (const t of BACKUP_TABLES) {
    const rows = parsed.data.tables[t] ?? [];
    counts[t] = rows.length;
    if (READ_ONLY_TABLES.includes(t)) {
      if (rows.length) skipped.push(t);
      continue;
    }
    const drop = GENERATED[t] ?? [];
    plan.push({ table: t, rows: rows.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !drop.includes(k) && k !== 'user_id'))) });
  }
  return { plan, counts, skipped };
}
