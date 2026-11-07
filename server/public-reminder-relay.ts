export type RelayEnv = { MORIS_BACKEND_ORIGIN: string; MORIS_SERVICE_TOKEN: string; MORIS_PUBLIC_ORIGIN: string };

export default {
  async fetch(request: Request, env: RelayEnv): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowed = env.MORIS_PUBLIC_ORIGIN;
    const headers = new Headers({ 'Cache-Control': 'no-store', 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' });
    const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
    if (!allowed || !env.MORIS_SERVICE_TOKEN || !env.MORIS_BACKEND_ORIGIN) return reply({ error: 'The reminder service is being prepared.' }, 503);
    if (origin && origin !== allowed) return reply({ error: 'Open Moris to use reminders.' }, 403);
    if (origin === allowed) {
      headers.set('Access-Control-Allow-Origin', allowed);
      headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }
    const path = new URL(request.url).pathname;
    const method = path === '/api/reminders/config' ? 'GET' : ['/api/reminders/subscription', '/api/reminders/test'].includes(path) ? 'POST' : null;
    if (!method) return reply({ error: 'Not found.' }, 404);
    if (request.method === 'OPTIONS') return origin === allowed ? new Response(null, { status: 204, headers }) : reply({ error: 'Open Moris to use reminders.' }, 403);
    if (request.method !== method) return reply({ error: 'Method not allowed.' }, 405);
    if (method === 'POST' && origin !== allowed) return reply({ error: 'Open Moris to use reminders.' }, 403);
    if (Number(request.headers.get('Content-Length')) > 12000) return reply({ error: 'Request is too large.' }, 413);
    let body: ArrayBuffer | undefined;
    if (method === 'POST') {
      // Bound streamed bodies as well as declared lengths before forwarding.
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 12000) { await reader.cancel(); return reply({ error: 'Request is too large.' }, 413); }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      body = bytes.buffer;
    }
    try {
      const backend = new URL(env.MORIS_BACKEND_ORIGIN);
      if (backend.protocol !== 'https:' || backend.pathname !== '/' || backend.search || backend.hash || backend.username || backend.password) throw new Error('Invalid backend origin');
      const response = await fetch(new URL(path, backend), {
        method, redirect: 'error', headers: {
          'Content-Type': 'application/json',
          'OAI-Sites-Authorization': `Bearer ${env.MORIS_SERVICE_TOKEN}`,
          'x-moris-public-client': '1',
        }, ...(body ? { body } : {}),
      });
      if (!response.headers.get('Content-Type')?.includes('application/json')) throw new Error('Backend unavailable');
      return new Response(response.body, { status: response.status, headers: { ...Object.fromEntries(headers), 'Content-Type': 'application/json' } });
    } catch { return reply({ error: 'Reminders are temporarily unavailable. Your habits are safe on this device.' }, 503); }
  },
};
