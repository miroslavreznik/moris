import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const base = process.env.MORIS_BASE_PATH || '/';
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('MORIS_BASE_PATH must start and end with /.');

export default defineConfig({
  base,
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: base, name: 'Moris — Every repetition changes you.', short_name: 'Moris',
      description: 'Your little habits. Your wonderfully weird evolution.',
      start_url: base, scope: base, display: 'standalone', lang: 'en',
      theme_color: '#1839d5', background_color: '#f2efe4',
      icons: [
        { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: `${base}icon-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { ...(base !== '/' ? { cacheId: 'moris-pages' } : {}), globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: `${base}index.html`, navigateFallbackDenylist: [/\/api\//], cleanupOutdatedCaches: true, importScripts: [`${base}reminders-sw.js`] },
    devOptions: { enabled: false },
  })],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
});
