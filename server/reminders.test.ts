import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchReminders, eveningClock, reminderAPI, validateSubscription, type Env } from './reminders';
import { reminderPlan } from '../src/reminder-plan';
import { EMPTY } from '../src/domain';

let database: DatabaseSync;
let env: Env;
let subscription: { endpoint: string; expirationTime: null; keys: { p256dh: string; auth: string } };
const id = 'a0dcb223-0235-46d9-b9cd-1ad921947bbc';
const token = 'a'.repeat(43);
const b64 = (bytes: ArrayBuffer) => Buffer.from(bytes).toString('base64url');
const date = new Date('2026-11-04T18:30:00Z');
const days = () => reminderPlan({ ...EMPTY, habits: [{ id: 'gym', title: 'Personal title must never reach server', icon: 'move', color: '#1839d5', startDate: '2026-11-04', createdAt: date.toISOString() }], revisions: [{ id: 'r1', habitId: 'gym', effectiveFrom: '2026-11-04', schedule: { type: 'daily' } }] }, '2026-11-04');
const request = (path: string, body: unknown, owner: string | null = 'owner') => new Request(`https://moris.example/api/reminders/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(owner ? { 'oai-authenticated-user-id': owner, Origin: 'https://moris.example' } : {}) }, body: JSON.stringify(body) });
const register = (overrides: object = {}, owner?: string) => reminderAPI(request('subscription', { id, token, enabled: true, version: 1, subscription, days: days(), ...overrides }, owner), env);

beforeEach(async () => {
  database = new DatabaseSync(':memory:');
  database.exec(readFileSync(new URL('../drizzle/0000_evening_reminders.sql', import.meta.url), 'utf8'));
  const db = { prepare(sql: string) { let args: unknown[] = []; const statement = { bind(...values: unknown[]) { args = values; return statement; }, async first() { return database.prepare(sql).get(...args as never[]) || null; }, async all() { return { results: database.prepare(sql).all(...args as never[]) }; }, async run() { return { meta: { changes: Number(database.prepare(sql).run(...args as never[]).changes) } }; } }; return statement; } } as Env['DB'];
  const vapid = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const jwk = await crypto.subtle.exportKey('jwk', vapid.privateKey);
  env = { DB: db, VAPID_PRIVATE_KEY: jwk.d!, VAPID_PUBLIC_KEY: b64(await crypto.subtle.exportKey('raw', vapid.publicKey)), VAPID_SUBJECT: 'https://moris.example' };
  const receiver = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', expirationTime: null, keys: { p256dh: b64(await crypto.subtle.exportKey('raw', receiver.publicKey)), auth: b64(crypto.getRandomValues(new Uint8Array(16)).buffer) } };
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 201 })));
});
afterEach(() => { database.close(); vi.unstubAllGlobals(); });

describe('web push reminder service', () => {
  it('uses local evening time across daylight-saving changes', () => {
    expect(eveningClock(date)).toEqual({ date: '2026-11-04', inWindow: true });
    expect(eveningClock(new Date('2026-07-04T17:30:00Z')).inWindow).toBe(true);
    expect(eveningClock(new Date('2026-11-04T18:29:00Z')).inWindow).toBe(false);
    expect(eveningClock(new Date('2026-11-04T19:00:00Z')).inWindow).toBe(false);
  });
  it('persists only delivery data and per-day eligibility, with owner and device isolation', async () => {
    expect((await register()).status).toBe(200);
    const row = database.prepare('SELECT * FROM reminder_devices').get();
    expect(JSON.stringify(row)).not.toContain('Personal title');
    expect(row?.token_hash).not.toBe(token);
    expect((await register({}, 'someone-else')).status).toBe(403);
    expect((await register({ token: 'b'.repeat(43) })).status).toBe(403);
  });
  it('supports token-isolated public installations only behind the private service gate', async () => {
    const anonymous = (path: string, body: unknown) => {
      const value = request(path, body, null);
      value.headers.set('x-moris-public-client', '1');
      return value;
    };
    const body = { id, token, enabled: true, version: 1, subscription, days: days() };
    expect((await reminderAPI(request('subscription', body, null), env)).status).toBe(401);
    expect((await reminderAPI(anonymous('subscription', body), env)).status).toBe(200);
    expect(database.prepare('SELECT owner FROM reminder_devices').get()?.owner).toBe(`public:${id}`);
    expect((await reminderAPI(anonymous('subscription', { ...body, token: 'b'.repeat(43) }), env)).status).toBe(403);
    expect((await reminderAPI(anonymous('test', { id, token }), env)).status).toBe(200);
    expect((await reminderAPI(anonymous('dispatch', {}), env)).status).toBe(403);
    expect((await reminderAPI(anonymous('subscription', { id, token, enabled: false, version: 2 }), env)).status).toBe(200);
    expect(database.prepare('SELECT enabled FROM reminder_devices').get()?.enabled).toBe(0);
  });
  it('sends one encrypted notification despite concurrent dispatch and retries', async () => {
    await register();
    const results = await Promise.all([dispatchReminders(env, date), dispatchReminders(env, date)]);
    expect(results.reduce((sum, result) => sum + result.sent, 0)).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(1);
    const options = vi.mocked(fetch).mock.calls[0][1]!;
    expect(new Headers(options.headers).get('Authorization')).toMatch(/^vapid /);
    expect(new Headers(options.headers).get('TTL')).toBe('1800');
    expect(new Headers(options.headers).get('Content-Encoding')).toBe('aes128gcm');
    expect((options.body as Uint8Array).byteLength).toBeGreaterThan(100);
    expect((await dispatchReminders(env, date)).sent).toBe(0);
  });
  it('suppresses completed days, disabled installations and expired plans', async () => {
    await register({ days: days().map(day => ({ ...day, needed: false })) });
    expect((await dispatchReminders(env, date)).sent).toBe(0);
    await register({ version: 2 });
    await register({ enabled: false, version: 3 });
    await register({ version: 2 });
    expect((await dispatchReminders(env, date)).sent).toBe(0);
    expect(database.prepare('SELECT enabled FROM reminder_devices').get()?.enabled).toBe(0);
    await register({ version: 4 });
    expect((await dispatchReminders(env, new Date('2026-11-20T18:30:00Z'))).sent).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('never retries ambiguous delivery that evening and retires expired subscriptions', async () => {
    await register();
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 410 }));
    expect((await dispatchReminders(env, date)).failed).toBe(1);
    expect(database.prepare('SELECT enabled FROM reminder_devices').get()?.enabled).toBe(0);
    await dispatchReminders(env, date);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('keeps a test notification separate from the daily budget and rate limits tests', async () => {
    await register();
    expect((await reminderAPI(request('test', { id, token }), env)).status).toBe(200);
    expect((await reminderAPI(request('test', { id, token }), env)).status).toBe(429);
    expect((await dispatchReminders(env, date)).sent).toBe(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('rejects browser dispatch, cross-origin writes, arbitrary endpoints and invalid plans', async () => {
    expect((await reminderAPI(request('dispatch', {}), env)).status).toBe(403);
    const cross = request('subscription', {}); cross.headers.set('Origin', 'https://attacker.example');
    expect((await reminderAPI(cross, env)).status).toBe(403);
    expect(() => validateSubscription({ ...subscription, endpoint: 'https://127.0.0.1/internal' })).toThrow('not supported');
    expect((await register({ days: [{ date: '2026-11-04', needed: true }] })).status).toBe(400);
  });
  it('exercises and reads back the unattended writer without sending outside the evening window', async () => {
    await register();
    const result = await dispatchReminders(env, new Date('2026-11-04T10:00:00Z'));
    expect(result.status).toBe('outside_window');
    expect(fetch).not.toHaveBeenCalled();
    const response = await reminderAPI(new Request('https://moris.example/api/reminders/dispatch'), env);
    expect((await response.json() as { id: string }).id).toBe(result.id);
  });
});
