const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.MORIS_TEST_URL || 'http://127.0.0.1:4173';

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.MORIS_BROWSER || 'msedge' } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Budapest', permissions: ['notifications'] });
    // Push transport is simulated for UI checks. The browser's real permission,
    // service worker, Notifications API and backend persistence stay in use.
    await context.addInitScript(() => {
      const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const revive = value => ({ ...value, options: { applicationServerKey: Uint8Array.from(atob(value.serverKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)).buffer }, toJSON: () => ({ endpoint: value.endpoint, expirationTime: null, keys: value.keys }), unsubscribe: async () => { sessionStorage.removeItem('qa-push'); return true; } });
      PushManager.prototype.getSubscription = async function () { const value = sessionStorage.getItem('qa-push'); return value ? revive(JSON.parse(value)) : null; };
      PushManager.prototype.subscribe = async function (options) {
        const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
        const value = { endpoint: 'https://fcm.googleapis.com/fcm/send/moris-ui-check', keys: { p256dh: b64(await crypto.subtle.exportKey('raw', pair.publicKey)), auth: b64(crypto.getRandomValues(new Uint8Array(16))) }, serverKey: b64(options.applicationServerKey) };
        sessionStorage.setItem('qa-push', JSON.stringify(value)); return revive(value);
      };
    });
    let page = await context.newPage();
    const errors = [];
    context.on('page', current => current.on('pageerror', error => errors.push(error.message)));
    page.on('pageerror', error => errors.push(error.message));
    const synced = [];
    context.on('requestfinished', async request => { if (request.url().endsWith('/api/reminders/subscription')) synced.push(JSON.parse(request.postData())); });
    const cdp = await context.newCDPSession(page);
    const registrations = new Map();
    cdp.on('ServiceWorker.workerRegistrationUpdated', event => event.registrations.forEach(reg => registrations.set(reg.registrationId, reg)));
    await cdp.send('ServiceWorker.enable');
    await page.goto(base);
    await page.getByRole('button', { name: 'Start with a blank page', exact: true }).click();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.getByRole('button', { name: 'Add habit', exact: true }).click();
    await page.getByLabel('Habit name', { exact: true }).fill('A private daily goal');
    await page.getByRole('dialog').getByRole('button', { name: 'Add habit', exact: true }).click();
    await page.locator('.bottom-nav').getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Enable evening reminders', exact: true }).click();
    await page.getByRole('button', { name: 'Turn reminders off', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.reminder-settings [role="status"]')?.textContent.includes('Last synced'));
    assert(synced.some(body => body.enabled && body.days[0].needed));
    assert(!JSON.stringify(synced).includes('A private daily goal'));
    console.log('PASS opt-in syncs per-day eligibility without habit titles');
    await page.setViewportSize({ width: 320, height: 800 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: 'test-results/reminders-settings-mobile.png', fullPage: true });
    await page.locator('.bottom-nav').getByRole('button', { name: 'Today', exact: true }).click();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Complete A private daily goal today', exact: true }).click();
    await page.getByRole('button', { name: 'Undo A private daily goal today', exact: true }).waitFor();
    await context.setOffline(false);
    await page.waitForResponse(response => response.url().endsWith('/api/reminders/subscription') && response.ok());
    await page.waitForTimeout(400);
    assert.equal(synced.at(-1).days[0].needed, false);
    console.log('PASS an offline completion suppresses the reminder once the connection returns');
    await page.getByRole('button', { name: 'Undo A private daily goal today', exact: true }).click();
    await page.getByRole('button', { name: 'A moment for today & tomorrow', exact: true }).click();
    await page.getByRole('button', { name: 'That’s enough for today', exact: true }).click();
    await page.waitForResponse(response => response.url().endsWith('/api/reminders/subscription') && response.ok());
    await page.waitForTimeout(400);
    assert.equal(synced.at(-1).days[0].needed, false);
    await page.getByRole('button', { name: 'Complete A private daily goal today', exact: true }).waitFor();
    console.log('PASS closing today suppresses the reminder without inventing a completion or XP');
    await page.goto(`${base}/?evening=1`);
    await page.getByRole('heading', { name: 'A little moment for you.', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Add a goal for tomorrow', exact: true }).click();
    const tomorrow = await page.evaluate(() => { const date = new Date(); date.setDate(date.getDate() + 1); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; });
    assert.equal(await page.getByLabel('Start date', { exact: true }).inputValue(), tomorrow);
    await page.getByLabel('Habit name', { exact: true }).fill('Tomorrow only');
    await page.getByRole('dialog').getByRole('button', { name: 'Add habit', exact: true }).click();
    await page.locator('.bottom-nav').getByRole('button', { name: 'Today', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Complete Tomorrow only today', exact: true }).count(), 0);
    console.log('PASS notification link opens evening review and new tomorrow goals do not become due today');
    // Deliver a real browser push event through Chromium's test interface with
    // the Moris tab closed; this checks system notification display, not FCM.
    const registration = [...registrations.values()].find(reg => reg.scopeURL === base + '/' && !reg.isDeleted);
    assert(registration, 'Expected an active production service worker');
    const control = await context.newPage();
    const controlCDP = await context.newCDPSession(control);
    await controlCDP.send('ServiceWorker.enable');
    await page.close();
    await controlCDP.send('ServiceWorker.deliverPushMessage', { origin: base, registrationId: registration.registrationId, data: JSON.stringify({ title: 'Hello from Moris.', body: 'Real system notification from the QA push event.', test: true }) });
    page = await context.newPage();
    await page.goto(base);
    await page.waitForFunction(async () => (await (await navigator.serviceWorker.ready).getNotifications({ tag: 'moris-test' })).length === 1);
    const notifications = await page.evaluate(async () => (await (await navigator.serviceWorker.ready).getNotifications({ tag: 'moris-test' })).map(n => ({ title: n.title, body: n.body })));
    assert.equal(notifications[0].title, 'Hello from Moris.');
    console.log('PASS real service worker displays a system notification after the app tab is closed (simulated push transport)');
    await page.locator('.bottom-nav').getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Turn reminders off', exact: true }).click();
    await page.getByRole('button', { name: 'Enable evening reminders', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.reminder-settings [role="status"]')?.textContent.includes('Last synced'));
    assert.equal(synced.at(-1).enabled, false);
    assert.equal(await page.evaluate(() => sessionStorage.getItem('qa-push')), null);
    console.log('PASS opt-out disables server delivery and unsubscribes the installation');
    assert.deepEqual(errors, []);
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
