import assert from 'node:assert/strict';
import { webcrypto, randomBytes, randomUUID } from 'node:crypto';

const base = process.env.MORIS_PUBLIC_API || 'https://moris-reminders.miroslavreznik.chatgpt.site/api/reminders/';
const origin = 'https://miroslavreznik.github.io';
const call = (path, method = 'GET', body, callerOrigin = origin) => fetch(new URL(path, base), { method, redirect: 'manual', headers: { Origin: callerOrigin, 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const configResponse = await call('config');
assert.equal(configResponse.status, 200);
assert.equal(configResponse.headers.get('Access-Control-Allow-Origin'), origin);
const config = await configResponse.json();
assert(config.ready && config.publicKey);
assert.equal(config.time, '19:30');
assert.equal(config.timeZone, 'Europe/Budapest');
assert.equal((await call('subscription', 'OPTIONS')).status, 204);
assert.equal((await call('config', 'GET', undefined, 'https://unrelated.example')).status, 403);
assert.equal((await call('dispatch', 'POST', {})).status, 404);
assert.equal((await call('test', 'POST', { padding: 'a'.repeat(12001) })).status, 413);
console.log('PASS public config, browser preflight, origin isolation, body limit and inaccessible dispatch');

const pair = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const id = randomUUID();
const token = randomBytes(32).toString('base64url');
const first = new Date().toISOString().slice(0, 10);
const days = Array.from({ length: 14 }, (_, index) => ({ date: new Date(Date.parse(first) + index * 86400000).toISOString().slice(0, 10), needed: false }));
const body = { id, token, enabled: true, version: 1, days, subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/moris-qa-${id}`, expirationTime: null, keys: { p256dh: Buffer.from(await webcrypto.subtle.exportKey('raw', pair.publicKey)).toString('base64url'), auth: randomBytes(16).toString('base64url') } } };
// Every date is ineligible, and the installation is disabled in finally.
// No push is sent to the placeholder subscription.
try {
  assert.equal((await call('subscription', 'POST', body)).status, 200);
  assert.equal((await call('subscription', 'POST', { ...body, token: randomBytes(32).toString('base64url') })).status, 403);
  assert.equal((await call('subscription', 'POST', { id, token, enabled: false, version: 2 })).status, 200);
  assert.equal((await call('test', 'POST', { id, token })).status, 409);
  assert.equal((await call('subscription', 'POST', body)).status, 200);
  assert.equal((await call('test', 'POST', { id, token })).status, 409);
  console.log('PASS anonymous device registration, secret-token isolation, opt-out and stale-write protection');
} finally {
  assert.equal((await call('subscription', 'POST', { id, token, enabled: false, version: 3 })).status, 200);
}
