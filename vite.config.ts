import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg', 'apple-touch-icon.png'],
    manifest: {
      id: '/', name: 'Moris — Every repetition changes you.', short_name: 'Moris',
      description: 'Your little habits. Your wonderfully weird evolution.',
      start_url: '/', scope: '/', display: 'standalone', lang: 'en',
      theme_color: '#1839d5', background_color: '#f2efe4',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2}'], navigateFallback: '/index.html', navigateFallbackDenylist: [/^\/api\//], cleanupOutdatedCaches: true, importScripts: ['/reminders-sw.js'] },
    devOptions: { enabled: false },
  })],
  test: { environment: 'node', include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
});
