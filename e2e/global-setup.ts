import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { API_URL, E2E_EMAIL, E2E_PASSWORD, psql, supabaseEnv } from './env';

/** DB sạch → tạo tài khoản duy nhất → mật khẩu local cho role coach. */
export default async function globalSetup() {
  execSync('supabase db reset', { stdio: 'ignore' });
  const { SERVICE_ROLE_KEY } = supabaseEnv();
  const res = await fetch(`${API_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true }),
  });
  if (!res.ok) throw new Error(`Không tạo được user e2e: ${res.status} ${await res.text()}`);
  psql("alter role coach_readonly login password 'coach-local-only';");
  const dir = path.resolve(import.meta.dirname, 'screenshots');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}
