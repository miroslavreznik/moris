// Local QA only. Hosted identity is supplied by Sites, never by this adapter.
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import worker from '../dist/server/index.js';

const database = new DatabaseSync(':memory:');
database.exec(await readFile(new URL('../drizzle/0000_evening_reminders.sql', import.meta.url), 'utf8'));
const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await webcrypto.subtle.exportKey('jwk', pair.privateKey);
const env = {
  VAPID_PUBLIC_KEY: Buffer.from(await webcrypto.subtle.exportKey('raw', pair.publicKey)).toString('base64url'),
  VAPID_PRIVATE_KEY: jwk.d,
  VAPID_SUBJECT: 'https://moris.example',
  DB: { prepare(sql) { let args = []; const statement = { bind(...values) { args = values; return statement; }, async first() { return database.prepare(sql).get(...args) || null; }, async all() { return { results: database.prepare(sql).all(...args) }; }, async run() { return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } }; } }; return statement; } },
};
http.createServer(async (incoming, outgoing) => {
  try {
    const chunks = []; for await (const chunk of incoming) chunks.push(chunk);
    const headers = new Headers(incoming.headers);
    headers.set('oai-authenticated-user-id', 'local-preview-user');
    const request = new Request(`http://127.0.0.1:4173${incoming.url}`, { method: incoming.method, headers, ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Buffer.concat(chunks) } : {}) });
    const response = await worker.fetch(request, env);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { outgoing.writeHead(500); outgoing.end(error.message); }
}).listen(4173, '127.0.0.1', () => console.log('Moris production preview: http://127.0.0.1:4173 (temporary reminder database)'));
