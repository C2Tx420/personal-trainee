import { execSync } from 'node:child_process';
import postgres from 'postgres';

/**
 * Postgres connection using the `coach_readonly` role (plan v2.4 §7.2).
 * The connection string is NOT in the repo: read from env COACH_DATABASE_URL or
 * macOS Keychain (security add-generic-password -s pt-coach-db -a coach -w '<url>').
 */
export function coachUrl(): string {
  if (process.env.COACH_DATABASE_URL) return process.env.COACH_DATABASE_URL;
  try {
    return execSync('security find-generic-password -s pt-coach-db -w', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error('Thiếu COACH_DATABASE_URL (hoặc Keychain pt-coach-db) — xem coach/CLAUDE.md');
  }
}

export function connect() {
  const sql = postgres(coachUrl(), { max: 1, idle_timeout: 5, onnotice: () => undefined });
  return sql;
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
