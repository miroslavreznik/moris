import assets from 'virtual:moris-assets';
import { reminderAPI, type Env } from './reminders';

export default {
  async fetch(request: Request, env: Env) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/')) {
      try { return await reminderAPI(request, env); }
      catch { return Response.json({ error: 'Reminders are temporarily unavailable. Your habits are safe on this device.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
    }
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const asset = assets[path] ?? (path === '/' || !path.split('/').pop()!.includes('.') ? assets['/index.html'] : undefined);
    if (!asset) return new Response('Not found', { status: 404 });
    const bytes = Uint8Array.from(atob(asset.data), character => character.charCodeAt(0));
    return new Response(request.method === 'HEAD' ? null : bytes, { headers: { 'Content-Type': asset.type, 'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options': 'nosniff', ...(path === '/sw.js' ? { 'Service-Worker-Allowed': '/' } : {}) } });
  },
};
