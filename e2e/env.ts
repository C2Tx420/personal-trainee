import { execSync } from 'node:child_process';

/** Local environment info (Supabase CLI demo keys, not real secrets). */
export const E2E_EMAIL = 'anh@local.test';
export const E2E_PASSWORD = 'local-pass-123';
export const E2E_PIN = '1234';
export const API_URL = 'http://127.0.0.1:54321';
export const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

let cache: Record<string, string> | null = null;
export function supabaseEnv(): Record<string, string> {
  if (cache) return cache;
  const out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  cache = Object.fromEntries(
    out
      .split('\n')
      .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
  return cache;
}

export function psql(sql: string): string {
  return execSync(`psql "${DB_URL}" -At -v ON_ERROR_STOP=1`, { input: sql, encoding: 'utf8' }).trim();
}
