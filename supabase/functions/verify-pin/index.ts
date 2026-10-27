// Kiểm tra PIN mở khoá app (plan v2.4 §3.2).
// PIN cố định ở secret APP_PIN (supabase secrets set APP_PIN=xxxx) — không bao giờ tới client.
// Bộ đếm sai lưu ở public.app_lock (chỉ service role ghi được). Sai lần thứ 5 → thu hồi phiên đăng nhập.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const MAX_ATTEMPTS = 5;

function timingSafeEqual(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  let diff = ea.length ^ eb.length;
  for (let i = 0; i < Math.max(ea.length, eb.length); i++) diff |= (ea[i] ?? 0) ^ (eb[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const appPin = Deno.env.get('APP_PIN') ?? '';
  if (!/^\d{4,6}$/.test(appPin)) return json({ error: 'APP_PIN chưa cấu hình trên server' }, 500);

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: userData } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  let pin = '';
  try {
    pin = String((await req.json())?.pin ?? '');
  } catch {
    return json({ error: 'body' }, 400);
  }

  const { data: lock } = await admin.from('app_lock').select('failed_attempts').eq('user_id', user.id).maybeSingle();
  const failed = lock?.failed_attempts ?? 0;
  if (failed >= MAX_ATTEMPTS) {
    return json({ ok: false, attempts_left: 0, locked_out: true });
  }

  if (timingSafeEqual(pin, appPin)) {
    await admin.from('app_lock').upsert({ user_id: user.id, failed_attempts: 0, last_failed_at: null });
    return json({ ok: true, attempts_left: MAX_ATTEMPTS, locked_out: false });
  }

  const next = Math.min(MAX_ATTEMPTS, failed + 1);
  await admin.from('app_lock').upsert({ user_id: user.id, failed_attempts: next, last_failed_at: new Date().toISOString() });
  const lockedOut = next >= MAX_ATTEMPTS;
  if (lockedOut) {
    // thu hồi mọi refresh token → bắt đăng nhập lại bằng mật khẩu
    await admin.auth.admin.signOut(jwt, 'global').catch(() => undefined);
  }
  return json({ ok: false, attempts_left: MAX_ATTEMPTS - next, locked_out: lockedOut });
});
