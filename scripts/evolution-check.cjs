const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const origin = process.env.MORIS_TEST_URL || 'http://127.0.0.1:4173';
const output = path.resolve('test-results');
let browser;
const date = n => new Date(Date.UTC(2026, 9, 25 - n, 12)).toISOString().slice(0, 10);
function fixture(count, celebratedStage) {
  return { schemaVersion: 1, exportedAt: '2026-10-25T12:00:00Z', onboardingComplete: true,
    habits: [{ id: 'evolution-test', title: 'Daily practice', icon: 'spark', color: '#1839d5', startDate: date(220), createdAt: `${date(220)}T12:00:00Z` }],
    revisions: [{ id: 'evolution-revision', habitId: 'evolution-test', effectiveFrom: date(220), schedule: { type: 'daily' } }],
    completions: Array.from({ length: count }, (_, i) => ({ id: `evolution-test:${date(i + 1)}`, habitId: 'evolution-test', localDate: date(i + 1), timeZone: 'Europe/Budapest', createdAt: `${date(i + 1)}T12:00:00Z` })),
    settings: { soundEnabled: false, animationsEnabled: true, locale: 'en', celebratedStage },
  };
}
const nav = (page, name) => page.locator('.bottom-nav').getByRole('button', { name, exact: true }).click();
async function importFixture(page, count, celebratedStage) {
  await nav(page, 'Settings');
  await page.getByLabel('Choose Moris backup file', { exact: true }).setInputFiles({ name: 'evolution-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(fixture(count, celebratedStage))) });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Back up & replace records', exact: true }).click();
  await download;
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.locator('.workspace-footer').getByText('SAVED ON THIS DEVICE', { exact: true }).waitFor();
}
(async () => {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.MORIS_BROWSER || 'msedge' } : {}) });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Budapest', acceptDownloads: true });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date('2026-10-25T12:00:00Z'));
  await page.goto(origin);
  await page.getByRole('button', { name: 'Start with a blank page', exact: true }).click();
  await importFixture(page, 119, 4);
  await nav(page, 'Moris');
  assert.equal(await page.locator('.evolution-ladder article').count(), 7);
  await page.locator('.evolution-portrait').getByRole('heading', { name: 'Super Moris', exact: true }).waitFor();
  await page.getByText('1 little win away. One completion = 10 XP.', { exact: true }).waitFor();
  await nav(page, 'Today');
  await page.getByRole('button', { name: 'Complete Daily practice today', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'Cosmic Moris', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Keep showing up', exact: true }).click();
  await nav(page, 'Moris');
  await page.locator('.evolution-portrait svg[data-stage="5"]').waitFor();
  await page.getByText('80 little wins away. One completion = 10 XP.', { exact: true }).waitFor();
  console.log('PASS Cosmic Moris unlocks at 1,200 XP with a new illustration, celebration, and next-form progress');
  await importFixture(page, 199, 5);
  await nav(page, 'Today');
  await page.getByRole('button', { name: 'Complete Daily practice today', exact: true }).click();
  await page.getByRole('dialog').getByRole('heading', { name: 'Moris the Infinite', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Keep showing up', exact: true }).click();
  await page.getByRole('button', { name: 'Undo Daily practice today', exact: true }).click();
  await page.getByRole('button', { name: 'Complete Daily practice today', exact: true }).click();
  await page.locator('.workspace-footer').getByText('SAVED ON THIS DEVICE', { exact: true }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await nav(page, 'Settings');
  const exportEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const exported = await exportEvent, exportPath = path.join(output, 'evolution-backup.json'); await exported.saveAs(exportPath);
  const backup = JSON.parse(await readFile(exportPath));
  assert.equal(backup.completions.length, 200); assert.equal(backup.settings.celebratedStage, 6);
  assert.deepEqual(backup.completions.filter(c => c.localDate !== date(0)), fixture(199, 5).completions);
  await page.reload(); await nav(page, 'Moris');
  await page.locator('.evolution-portrait svg[data-stage="6"]').waitFor();
  await page.getByRole('heading', { name: 'Infinite potential. Tiny daily steps.', exact: true }).waitFor();
  console.log('PASS final form unlocks at 2,000 XP; undo/redo and reload preserve all records and remembered celebrations');
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('moris');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result, tx = database.transaction('meta', 'readwrite'), store = tx.objectStore('meta'), get = store.get('config');
      get.onsuccess = () => { const row = get.result; row.value.settings.celebratedStage = 4; store.put(row); };
      tx.oncomplete = () => { database.close(); resolve(); }; tx.onerror = () => { database.close(); reject(tx.error); };
    };
  }));
  await page.reload();
  await page.getByRole('dialog').getByRole('heading', { name: 'Moris the Infinite', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Keep showing up', exact: true }).click();
  await page.reload(); assert.equal(await page.getByRole('dialog').count(), 0);
  await nav(page, 'Moris');
  await page.setViewportSize({ width: 320, height: 800 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: path.join(output, 'evolution-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1000, height: 1100 });
  const clip = await page.locator('.evolution-ladder').evaluate(el => { const rows = Array.from(el.children).slice(-2), first = rows[0].getBoundingClientRect(), last = rows[1].getBoundingClientRect(); return { x: first.left, y: first.top + scrollY, width: first.width, height: last.bottom - first.top }; });
  await page.screenshot({ path: path.join(output, 'new-moris-stages.png'), fullPage: true, clip });
  assert.deepEqual(errors, []);
  console.log('PASS previously earned XP discovers new forms once after an update; seven-stage screen fits at 320 px');
  await browser.close();
})().catch(async error => { console.error(error); await browser?.close(); process.exitCode = 1; });
