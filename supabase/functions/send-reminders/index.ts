// Sends Web Push reminders (plan v2.4 §6.10). Called by pg_cron every 15 minutes with the x-cron-secret header,
// or by the app (JWT) with body {test:true} to send a test notification.
// Push content is always generic — it NEVER contains health data.
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { dueReminders, type ReminderSetting, workoutReminderTime } from '../_shared/reminders.ts';

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function vnNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  const js = new Date(`${date}T00:00:00Z`).getUTCDay();
  return { date, minuteOfDay: Number(get('hour')) * 60 + Number(get('minute')), isoWeekday: ((js + 6) % 7) + 1 };
}

const days = (from: string | null, to: string) =>
  from ? Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) : null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!vapidPublic || !vapidPrivate) return json({ error: 'VAPID chưa cấu hình' }, 500);
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', vapidPublic, vapidPrivate);

  const cronSecret = Deno.env.get('CRON_SECRET');
  const isCron = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret;
  let userIds: string[] = [];
  let test = false;

  if (isCron) {
    const { data } = await admin.from('profiles').select('user_id');
    userIds = (data ?? []).map((r) => r.user_id);
  } else {
    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data } = await admin.auth.getUser(jwt);
    if (!data?.user) return json({ error: 'unauthorized' }, 401);
    userIds = [data.user.id];
    test = (await req.json().catch(() => ({})))?.test === true;
  }

  const now = vnNow();
  let sent = 0;
  for (const uid of userIds) {
    const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', uid);
    if (!subs?.length) continue;

    let messages: { title: string; body: string; kind: string }[] = [];
    if (test) {
      messages = [{ kind: 'test', title: 'Thông báo thử ✅', body: 'Nhắc nhở đã hoạt động trên thiết bị này' }];
    } else {
      const [{ data: settings }, { data: plan }, { data: inbody }, { data: photo }, { data: goals }] = await Promise.all([
        admin.from('notification_settings').select('*').eq('user_id', uid),
        admin.from('plan_versions').select('content').eq('user_id', uid).eq('status', 'active').maybeSingle(),
        admin.from('inbody_logs').select('measured_on').eq('user_id', uid).order('measured_on', { ascending: false }).limit(1).maybeSingle(),
        admin.from('progress_photos').select('taken_on').eq('user_id', uid).order('taken_on', { ascending: false }).limit(1).maybeSingle(),
        admin.from('goals').select('target_date,status').eq('user_id', uid),
      ]);
      const day = plan?.content?.schedule?.[WEEKDAYS[now.isoWeekday - 1]];
      const todaySession =
        day && day.kind !== 'rest'
          ? { kind: day.kind === 'session' ? day.template : day.kind, time: workoutReminderTime(day.kind) }
          : null;
      messages = dueReminders((settings ?? []) as ReminderSetting[], {
        ...now,
        todaySession,
        daysSinceInbody: days(inbody?.measured_on ?? null, now.date),
        daysSincePhotos: days(photo?.taken_on ?? null, now.date),
        goalDaysLeft: (goals ?? []).filter((g) => g.status !== 'achieved').map((g) => days(now.date, g.target_date) ?? -1),
      });
    }

    for (const m of messages) {
      for (const s of subs) {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: m.title, body: m.body, tag: m.kind, url: '/' }),
          );
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    }
  }
  return json({ sent });
});
