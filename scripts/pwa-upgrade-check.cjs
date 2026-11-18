// Verify an installed Pages PWA upgrade on one origin, without touching live data.
// Inputs must be two built Pages directories with MORIS_BASE_PATH=/moris/.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { readFile, mkdir, stat } = require('node:fs/promises');
const output = path.resolve('test-results');
const previous = path.resolve(process.env.MORIS_PREVIOUS_DIST || 'test-results/pwa-baseline-bc270844/dist');
const next = path.resolve(process.env.MORIS_NEXT_DIST || 'test-results/pages-candidate');
const mount = '/moris/';
const day = index => new Date(Date.UTC(2026, 10, 18 - index, 12)).toISOString().slice(0, 10);
const created = `${day(250)}T12:00:00Z`;
const oldSettings = { morisColor: 'moss', morisDetail: 'antenna', soundEnabled: true, animationsEnabled: true, locale: 'en', celebratedStage: 4 };
const habits = [
  { id: 'upgrade-daily', title: 'Upgrade daily history', icon: 'book', color: '#1839d5', startDate: day(250), endDate: day(-70), createdAt: created },
  { id: 'upgrade-weekly', title: 'Upgrade weekly quota', icon: 'move', color: '#477246', startDate: day(100), createdAt: created },
  { id: 'upgrade-paused', title: 'Upgrade paused history', icon: 'sun', color: '#c24f24', startDate: day(100), pauses: [{ from: day(10), until: day(5) }, { from: day(2) }], createdAt: created },
  { id: 'upgrade-archived', title: 'Upgrade archived history', icon: 'walk', color: '#8d4b90', startDate: day(100), archivedOn: day(30), archivedAt: `${day(30)}T12:00:00Z`, createdAt: created },
];
const revisions = [
  { id: 'upgrade-daily-rev', habitId: habits[0].id, effectiveFrom: day(250), schedule: { type: 'daily' } },
  { id: 'upgrade-weekly-rev', habitId: habits[1].id, effectiveFrom: day(100), schedule: { type: 'weekly_target', targetCount: 2 } },
  { id: 'upgrade-paused-rev', habitId: habits[2].id, effectiveFrom: day(100), schedule: { type: 'interval', everyNDays: 2, anchorDate: day(100) } },
  { id: 'upgrade-archived-rev', habitId: habits[3].id, effectiveFrom: day(100), schedule: { type: 'weekdays', days: [1, 3, 5] } },
];
const completions = Array.from({ length: 70 }, (_, index) => ({ id: `${habits[0].id}:${day(index + 1)}`, habitId: habits[0].id, localDate: day(index + 1), timeZone: 'Europe/Budapest', createdAt: `${day(index + 1)}T12:00:00Z` })).sort((a, b) => a.id.localeCompare(b.id));
const plans = [ { id: 'upgrade-plan-future', title: 'Upgrade future plan', date: day(-3), completed: false }, { id: 'upgrade-plan-history', title: 'Upgrade finished plan', date: day(5), completed: true } ];
const fixture = { habits, revisions, completions, plans, settings: oldSettings, onboardingComplete: true };
const metadata = [
  { key: 'config', value: { settings: oldSettings, onboardingComplete: true } },
  { key: 'reminder-device', value: { id: 'upgrade-fixture-device', token: 'synthetic-upgrade-token-never-sent', enabled: true, version: 123, pendingSync: false, dismissedDay: day(1), lastSync: `${day(1)}T12:00:00Z` } },
  { key: 'safety-backup', value: { ...fixture, schemaVersion: 4, exportedAt: `${day(0)}T12:00:00Z` } },
  { key: 'upgrade-private-metadata', value: { retained: true, sentinel: 'same-browser-database' } },
];
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const nav = (page, name) => page.locator('.bottom-nav').getByRole('button', { name, exact: true }).click();
const saved = page => page.locator('.workspace-footer').getByText('SAVED ON THIS DEVICE', { exact: true }).waitFor();
async function rows(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const opening = indexedDB.open('moris'); opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result, names = ['habits', 'revisions', 'completions', 'plans', 'meta'], transaction = db.transaction(names, 'readonly'), result = {};
      for (const name of names) { const request = transaction.objectStore(name).getAll(); request.onsuccess = () => { result[name] = request.result; }; }
      transaction.oncomplete = () => { db.close(); resolve(result); }; transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }));
}
async function exportBackup(page, filename) {
  await nav(page, 'Settings'); await saved(page); const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click(); const download = await event;
  const file = path.join(output, filename); await download.saveAs(file); return JSON.parse(await readFile(file, 'utf8'));
}
let browser, server;
(async () => {
  await mkdir(output, { recursive: true });
  for (const directory of [previous, next]) for (const file of ['index.html', 'sw.js', 'manifest.webmanifest']) assert((await stat(path.join(directory, file))).isFile(), `${directory}/${file} must exist`);
  const previousManifest = JSON.parse(await readFile(path.join(previous, 'manifest.webmanifest'), 'utf8'));
  assert.notEqual(await readFile(path.join(previous, 'sw.js'), 'utf8'), await readFile(path.join(next, 'sw.js'), 'utf8'), 'the candidate must have a different real service worker');
  let active = previous;
  server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname === '/moris') { response.writeHead(302, { Location: mount }); response.end(); return; }
      if (!url.pathname.startsWith(mount)) { response.writeHead(404); response.end(); return; }
      const relative = decodeURIComponent(url.pathname.slice(mount.length)) || 'index.html';
      const file = path.resolve(active, relative);
      if (!file.startsWith(active + path.sep) && file !== active) { response.writeHead(403); response.end(); return; }
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': ['index.html', 'sw.js', 'manifest.webmanifest'].includes(path.basename(file)) ? 'no-cache, no-store, must-revalidate' : 'public, max-age=0', ...(relative === 'sw.js' ? { 'Service-Worker-Allowed': mount } : {}) }); response.end(body);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.MORIS_BROWSER || 'msedge' } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Budapest', acceptDownloads: true });
  const reminderPosts = [], errors = [];
  // Keep page-side reminder traffic synthetic even while a service worker is
  // controlling the tab (Playwright routing alone can miss worker requests).
  await context.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.__upgradeReminderPosts = JSON.parse(sessionStorage.getItem('upgrade-reminder-posts') || '[]');
    window.fetch = (input, options) => {
      const request = input instanceof Request ? input : null, url = request?.url || String(input);
      if (/\/api\/reminders\//.test(url)) {
        const method = options?.method || request?.method || 'GET';
        if (method !== 'GET') { window.__upgradeReminderPosts.push({ method, url }); sessionStorage.setItem('upgrade-reminder-posts', JSON.stringify(window.__upgradeReminderPosts)); }
        return Promise.resolve(new Response(JSON.stringify({ ready: false, publicKey: '', time: '19:30', timeZone: 'Europe/Budapest' }), { headers: { 'Content-Type': 'application/json' } }));
      }
      return originalFetch(input, options);
    };
  });
  await context.route('**/api/reminders/**', route => {
    if (route.request().method() !== 'GET') reminderPosts.push({ method: route.request().method(), url: route.request().url() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ready: false, publicKey: '', time: '19:30', timeZone: 'Europe/Budapest' }) });
  });
  const page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'));
  await page.goto(`${origin}${mount}`); await page.getByRole('button', { name: 'Start with a blank page', exact: true }).waitFor();
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope), `${origin}${mount}`);
  await page.evaluate(({ fixture, metadata }) => new Promise((resolve, reject) => {
    const opening = indexedDB.open('moris'); opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result, names = ['habits', 'revisions', 'completions', 'plans', 'meta'], transaction = db.transaction(names, 'readwrite');
      for (const name of names) { const store = transaction.objectStore(name); store.clear(); for (const row of name === 'meta' ? metadata : fixture[name]) store.put(row); }
      transaction.oncomplete = () => { db.close(); resolve(); }; transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }), { fixture, metadata });
  await page.reload(); await nav(page, 'Moris'); await page.locator('.evolution-portrait .moris-art[data-stage="4"][data-color="moss"][data-detail="antenna"]').waitFor();
  assert.equal(await page.locator('.moris-fixed-form').count(), 0, 'the baseline is the original deployed renderer');
  const baselineBackup = await exportBackup(page, 'pwa-upgrade-v4-before.json'); assert.equal(baselineBackup.schemaVersion, 4); assert.deepEqual(baselineBackup.completions, completions);
  const before = await rows(page); assert.deepEqual(before.meta, metadata.slice().sort((a,b) => a.key.localeCompare(b.key)));
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true); await page.reload(); await page.locator('.main-content').waitFor(); assert.equal((await rows(page)).completions.length, 70); await context.setOffline(false);
  console.log('PASS the prior Pages PWA runs at /moris/, retains a full legacy fixture and opens offline before upgrading');

  active = next;
  const nextManifest = JSON.parse(await readFile(path.join(next, 'manifest.webmanifest'), 'utf8'));
  assert.equal(nextManifest.id, mount); assert.equal(nextManifest.start_url, mount); assert.equal(nextManifest.scope, mount);
  for (const key of ['id', 'scope', 'start_url']) assert.equal(nextManifest[key], previousManifest[key], `PWA ${key} must remain stable across upgrade`); assert(nextManifest.icons.every(icon => icon.src.startsWith(mount)));
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); });
  const update = page.getByRole('button', { name: 'Save & update', exact: true }); await update.waitFor();
  assert.deepEqual(await rows(page), before, 'waiting for the new worker must not alter any existing device-local record');
  await Promise.all([page.waitForEvent('load'), update.click()]);
  await page.locator('.main-content').waitFor(); await nav(page, 'Moris'); await page.locator('.evolution-portrait .moris-fixed-form[data-line="classic"]').waitFor();
  assert.equal(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope), `${origin}${mount}`);
  await page.getByRole('button', { name: 'Choose your direction', exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0, 'a legacy user is not forced into a new line on update');
  assert.deepEqual(await rows(page), before, 'Save & update preserves every habit, revision, completion, plan and metadata row exactly');
  assert.equal(await page.locator('.evolution-portrait .moris-art').getAttribute('data-stage'), '4'); assert.equal(await page.locator('.evolution-portrait .moris-art').getAttribute('data-color'), 'moss'); assert.equal(await page.locator('.evolution-portrait .moris-art').getAttribute('data-detail'), 'antenna');
  console.log('PASS Save & update activates the candidate Pages build while preserving all five IndexedDB stores, original appearance, XP and voluntary line choice');

  await page.getByRole('button', { name: 'Choose your direction', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Choose botanic', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Keep showing up', exact: true }).click(); await saved(page);
  const afterChoice = await rows(page);
  for (const store of ['habits', 'revisions', 'completions', 'plans']) assert.deepEqual(afterChoice[store], before[store], `${store} survive voluntary line adoption`);
  assert.deepEqual(afterChoice.meta.filter(row => row.key !== 'config'), before.meta.filter(row => row.key !== 'config'), 'reminder credentials, safety backup and unrelated metadata remain untouched');
  const selected = afterChoice.meta.find(row => row.key === 'config').value.settings;
  assert.equal(selected.evolutionLine, 'botanic'); assert.equal(selected.evolutionLegacyStage, 4); assert.equal(selected.morisColor, 'moss'); assert.equal(selected.morisDetail, 'antenna'); assert.deepEqual(selected.evolutionChoices, [{ stage: 4, branch: 'botanic' }]);
  const upgradedBackup = await exportBackup(page, 'pwa-upgrade-v6-after.json'); assert.equal(upgradedBackup.schemaVersion, 6); assert.deepEqual(upgradedBackup.completions, completions); assert.equal(upgradedBackup.settings.evolutionLine, 'botanic');
  await nav(page, 'Moris'); await context.setOffline(true); await page.reload(); await nav(page, 'Moris'); await page.locator('.evolution-portrait .moris-art[data-branch="botanic"][data-stage="4"][data-color="moss"][data-detail="antenna"]').waitFor();
  assert.deepEqual(await rows(page), afterChoice, 'the updated app and its chosen line survive a real offline reload');
  assert.deepEqual(reminderPosts, [], 'the upgrade test sends no worker-side subscription or notification requests');
  assert.deepEqual(await page.evaluate(() => window.__upgradeReminderPosts), [], 'the upgrade test sends no page-side subscription or notification requests'); assert.deepEqual(errors, []);
  await page.screenshot({ path: path.join(output, 'pwa-upgrade-offline.png'), fullPage: true });
  console.log('PASS voluntary line adoption, v6 export and the updated offline app preserve all progress, plans, safety backup and reminder credentials');
  await browser.close(); browser = null; await new Promise(resolve => server.close(resolve)); server = null;
})().catch(async error => {
  console.error(error);
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) await page.screenshot({ path: path.join(output, 'pwa-upgrade-failure.png'), fullPage: true }).catch(() => {});
  await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); process.exitCode = 1;
});
