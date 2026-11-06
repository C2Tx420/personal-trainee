import { execSync, spawnSync } from 'node:child_process';

/**
 * `pnpm run e2e`: run Playwright against the LOCAL Supabase only.
 * `.env.local` points at production, and Vite would bake it into the e2e build —
 * so the local API URL + anon key are passed as env vars (they win over .env files).
 */
let out: string;
try {
  out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch {
  console.error('Supabase local chưa chạy — chạy `supabase start` trước.');
  process.exit(1);
}
const env = Object.fromEntries(
  out
    .split('\n')
    .map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => [m[1], m[2]]),
);
if (!env.API_URL || !env.ANON_KEY) {
  console.error('Không đọc được API_URL / ANON_KEY từ `supabase status`.');
  process.exit(1);
}
const r = spawnSync('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, VITE_SUPABASE_URL: env.API_URL, VITE_SUPABASE_ANON_KEY: env.ANON_KEY },
});
process.exit(r.status ?? 1);
