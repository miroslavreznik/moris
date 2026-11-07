import { afterEach, describe, expect, it, vi } from 'vitest';
import relay, { type RelayEnv } from './public-reminder-relay';

const env: RelayEnv = { MORIS_BACKEND_ORIGIN: 'https://private.example', MORIS_SERVICE_TOKEN: 'server-only-test-token', MORIS_PUBLIC_ORIGIN: 'https://miroslavreznik.github.io' };
const request = (path: string, method = 'GET', origin: string | null = env.MORIS_PUBLIC_ORIGIN, body?: string) => new Request(`https://relay.example/api/reminders/${path}`, { method, headers: { ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json', 'oai-authenticated-user-id': 'must-not-forward', 'OAI-Sites-Authorization': 'must-not-forward' }, ...(body === undefined ? {} : { body }) });
afterEach(() => vi.unstubAllGlobals());

describe('public notification relay', () => {
  it('forwards only the fixed backend, server credential and anonymous-device marker', async () => {
    const upstream = vi.fn(async () => Response.json({ synced: true })); vi.stubGlobal('fetch', upstream);
    const response = await relay.fetch(request('subscription', 'POST', env.MORIS_PUBLIC_ORIGIN, '{"id":"device"}'), env);
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(env.MORIS_PUBLIC_ORIGIN);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const [url, options] = upstream.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.href).toBe('https://private.example/api/reminders/subscription');
    const headers = new Headers(options.headers);
    expect(headers.get('OAI-Sites-Authorization')).toBe('Bearer server-only-test-token');
    expect(headers.get('oai-authenticated-user-id')).toBeNull();
    expect(headers.get('Origin')).toBeNull();
    expect(headers.get('x-moris-public-client')).toBe('1');
    expect(options.redirect).toBe('manual');
    expect(new TextDecoder().decode(options.body as ArrayBuffer)).toBe('{"id":"device"}');
    expect(await response.text()).not.toContain(env.MORIS_SERVICE_TOKEN);
  });
  it('allows browser preflight but blocks other origins, dispatch, unknown paths and methods', async () => {
    const upstream = vi.fn(); vi.stubGlobal('fetch', upstream);
    expect((await relay.fetch(request('subscription', 'OPTIONS'), env)).status).toBe(204);
    for (const [path, method, origin, status] of [
      ['subscription', 'POST', 'https://other.example', 403],
      ['subscription', 'POST', null, 403],
      ['dispatch', 'POST', env.MORIS_PUBLIC_ORIGIN, 404],
      ['dispatch', 'GET', env.MORIS_PUBLIC_ORIGIN, 404],
      ['config', 'POST', env.MORIS_PUBLIC_ORIGIN, 405],
      ['unknown', 'GET', env.MORIS_PUBLIC_ORIGIN, 404],
    ] as const) expect((await relay.fetch(request(path, method, origin), env)).status).toBe(status);
    expect(upstream).not.toHaveBeenCalled();
  });
  it('bounds request bodies and hides non-JSON or redirect failures', async () => {
    const upstream = vi.fn(async () => new Response('private hosting sign-in')); vi.stubGlobal('fetch', upstream);
    expect((await relay.fetch(request('test', 'POST', env.MORIS_PUBLIC_ORIGIN, 'a'.repeat(12001)), env)).status).toBe(413);
    expect(upstream).not.toHaveBeenCalled();
    const response = await relay.fetch(request('config'), env);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('sign-in');
    expect((await relay.fetch(request('config'), { ...env, MORIS_SERVICE_TOKEN: '' })).status).toBe(503);
  });
});
