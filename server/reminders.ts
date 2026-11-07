import { buildPushPayload } from '@block65/webcrypto-web-push';
import { REMINDER_DAYS, REMINDER_TIME, REMINDER_ZONE, type ReminderDay } from '../src/reminder-plan';

type Statement = { bind(...values: unknown[]): Statement; first<T = Record<string, unknown>>(): Promise<T | null>; all<T = Record<string, unknown>>(): Promise<{ results: T[] }>; run(): Promise<{ meta: { changes: number } }> };
export type Env = { DB: { prepare(sql: string): Statement }; VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; VAPID_SUBJECT: string };
type Subscription = { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } };
type Device = { id: string; owner: string; token_hash: string; subscription: string; days: string; version: number; enabled: number; last_sent_day: string | null; last_test_at: number };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{20,80}$/.test(value);
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;

export function validateSubscription(value: unknown): Subscription {
  if (!object(value) || typeof value.endpoint !== 'string' || value.endpoint.length > 2048 || !object(value.keys)) throw new Error('Invalid push subscription.');
  const url = new URL(value.endpoint);
  const allowed = url.hostname === 'fcm.googleapis.com' || ['.push.apple.com', '.push.services.mozilla.com', '.notify.windows.com'].some(suffix => url.hostname.endsWith(suffix));
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !allowed) throw new Error('This browser’s push service is not supported yet.');
  const { p256dh, auth } = value.keys;
  if (typeof p256dh !== 'string' || !/^[A-Za-z0-9_-]{87}=?$/.test(p256dh) || typeof auth !== 'string' || !/^[A-Za-z0-9_-]{22}={0,2}$/.test(auth)) throw new Error('Invalid push encryption keys.');
  return { endpoint: value.endpoint, expirationTime: null, keys: { p256dh, auth } };
}

export function validateDays(value: unknown): ReminderDay[] {
  if (!Array.isArray(value) || value.length !== REMINDER_DAYS || !value.every(item => object(item) && validDate(item.date) && typeof item.needed === 'boolean')) throw new Error('Invalid reminder plan.');
  const days = value as ReminderDay[];
  if (days.some((item, index) => index > 0 && Date.parse(item.date) - Date.parse(days[index - 1].date) !== 86400000)) throw new Error('Reminder dates must be consecutive.');
  return days.map(({ date, needed }) => ({ date, needed }));
}

export function eveningClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: REMINDER_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)!.value;
  return { date: `${part('year')}-${part('month')}-${part('day')}`, inWindow: part('hour') === '19' && Number(part('minute')) >= 30 };
}

async function hash(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function bodyOf(request: Request) {
  const text = await request.text();
  if (text.length > 12000) throw new Error('Request is too large.');
  const body: unknown = JSON.parse(text);
  if (!object(body) || !validId(body.id) || typeof body.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(body.token)) throw new Error('Invalid device.');
  return body;
}
async function sendPush(env: Env, subscription: Subscription, test = false) {
  const payload = await buildPushPayload({ data: JSON.stringify({ title: test ? 'Hello from Moris.' : 'A little moment with Moris?', body: test ? 'Your system notifications are working. You can close Moris and still receive your evening reminder.' : 'Mark what you did today and take a look at tomorrow. There’s room for a fresh start.', test }), options: { ttl: test ? 60 : 1800 } }, subscription, { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT });
  return fetch(subscription.endpoint, { ...payload, redirect: 'error' });
}

export async function dispatchReminders(env: Env, now = new Date()) {
  const { date, inWindow } = eveningClock(now);
  let sent = 0, failed = 0, skipped = 0;
  if (inWindow) {
    const { results } = await env.DB.prepare('SELECT * FROM reminder_devices WHERE enabled = 1 AND (last_sent_day IS NULL OR last_sent_day != ?) LIMIT 1000').bind(date).all<Device>();
    for (const device of results) {
      const plan: ReminderDay[] = JSON.parse(device.days);
      if (!plan.some(day => day.date === date && day.needed)) { skipped++; continue; }
      // Claim before the network call. Ambiguous delivery is never retried that
      // evening: a missed reminder is preferable to sending somebody two.
      const claim = await env.DB.prepare('UPDATE reminder_devices SET last_sent_day = ? WHERE id = ? AND enabled = 1 AND version = ? AND (last_sent_day IS NULL OR last_sent_day != ?)').bind(date, device.id, device.version, date).run();
      if (!claim.meta.changes) { skipped++; continue; }
      try {
        const response = await sendPush(env, JSON.parse(device.subscription));
        if (response.ok) sent++;
        else {
          failed++;
          if ([404, 410].includes(response.status)) await env.DB.prepare('UPDATE reminder_devices SET enabled = 0 WHERE id = ?').bind(device.id).run();
        }
      } catch { failed++; }
    }
  }
  const result = { id: crypto.randomUUID(), date, status: inWindow ? 'finished' : 'outside_window', sent, failed, skipped };
  await env.DB.prepare('INSERT INTO reminder_runs (id, started_at, day, status, sent, failed, skipped) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(result.id, now.toISOString(), date, result.status, sent, failed, skipped).run();
  return result;
}

export async function reminderAPI(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  const owner = request.headers.get('oai-authenticated-user-id');
  // Only the private Sites service gate can admit an identity-less relay.
  // This marker is never a substitute for that gate or a device's secret token.
  const publicClient = !owner && request.headers.get('x-moris-public-client') === '1';
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'Use Moris to change reminders.' }, 403);
  if (path === '/api/reminders/dispatch') {
    // The unchanged owner-private Sites gate authenticates the unattended caller.
    // A signed-in browser visitor cannot invoke the shared dispatch operation.
    if (owner || origin || publicClient) return json({ error: 'Service access required.' }, 403);
    if (request.method === 'GET') return json(await env.DB.prepare('SELECT * FROM reminder_runs ORDER BY started_at DESC LIMIT 1').first());
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    return json(await dispatchReminders(env));
  }
  if (!owner && !publicClient) return json({ error: 'Sign in to Moris to manage reminders.' }, 401);
  if (path === '/api/reminders/config' && request.method === 'GET') return json({ ready: !!env.DB && !!env.VAPID_PUBLIC_KEY && !!env.VAPID_PRIVATE_KEY, publicKey: env.VAPID_PUBLIC_KEY, time: REMINDER_TIME, timeZone: REMINDER_ZONE });
  if (!['/api/reminders/subscription', '/api/reminders/test'].includes(path)) return json({ error: 'Not found.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const body = await bodyOf(request);
    const tokenHash = await hash(body.token as string);
    const existing = await env.DB.prepare('SELECT * FROM reminder_devices WHERE id = ?').bind(body.id).first<Device>();
    if (existing && ((!publicClient && existing.owner !== owner) || existing.token_hash !== tokenHash)) return json({ error: 'This reminder belongs to a different installation.' }, 403);
    if (path.endsWith('/test')) {
      if (!existing?.enabled) return json({ error: 'Enable reminders first.' }, 409);
      const time = Date.now();
      const claim = await env.DB.prepare('UPDATE reminder_devices SET last_test_at = ? WHERE id = ? AND last_test_at < ?').bind(time, body.id, time - 60000).run();
      if (!claim.meta.changes) return json({ error: 'Please wait a minute before another test.' }, 429);
      const response = await sendPush(env, JSON.parse(existing.subscription), true);
      return response.ok ? json({ sent: true }) : json({ error: 'The browser’s push service could not accept this test. Try turning reminders off and on again.' }, 502);
    }
    if (typeof body.enabled !== 'boolean' || !Number.isSafeInteger(body.version) || (body.version as number) < 0) throw new Error('Invalid reminder settings.');
    if (!body.enabled) {
      if (existing) await env.DB.prepare('UPDATE reminder_devices SET enabled = 0, version = ? WHERE id = ? AND version <= ?').bind(body.version, body.id, body.version).run();
      return json({ synced: true });
    }
    const subscription = validateSubscription(body.subscription);
    const days = validateDays(body.days);
    if (existing) {
      await env.DB.prepare('UPDATE reminder_devices SET subscription = ?, days = ?, version = ?, enabled = 1 WHERE id = ? AND version <= ?').bind(JSON.stringify(subscription), JSON.stringify(days), body.version, body.id, body.version).run();
    } else {
      const deviceOwner = publicClient ? `public:${body.id}` : owner!;
      if (publicClient) {
        const total = await env.DB.prepare('SELECT COUNT(*) AS count FROM reminder_devices').first<{ count: number }>();
        if ((total?.count ?? 0) >= 1000) return json({ error: 'The reminder service is full. Please contact the Moris owner.' }, 429);
      }
      const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM reminder_devices WHERE owner = ?').bind(deviceOwner).first<{ count: number }>();
      if ((count?.count ?? 0) >= 20) return json({ error: 'Too many reminder installations. Please contact the Moris owner.' }, 429);
      await env.DB.prepare('INSERT INTO reminder_devices (id, owner, token_hash, subscription, days, version, enabled, last_test_at) VALUES (?, ?, ?, ?, ?, ?, 1, 0)').bind(body.id, deviceOwner, tokenHash, JSON.stringify(subscription), JSON.stringify(days), body.version).run();
    }
    return json({ synced: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Reminders could not be saved.' }, 400);
  }
}
