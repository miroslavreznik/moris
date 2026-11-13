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
    const waitForEligibility = needed => page.waitForResponse(response => {
      const request = response.request();
      return response.ok() && request.url().endsWith('/api/reminders/subscription') &&
        request.postDataJSON()?.days?.every(day => day.needed === needed);
    });
    await Promise.all([
      waitForEligibility(false),
      page.getByRole('button', { name: 'Pause A private daily goal', exact: true }).click(),
    ]);
    await Promise.all([
      waitForEligibility(true),
      page.getByRole('button', { name: 'Resume A private daily goal', exact: true }).click(),
    ]);
    console.log('PASS pausing the only habit suppresses evening reminders and resuming restores eligibility');
    await page.locator('.bottom-nav').getByRole('button', { name: 'Today', exact: true }).click();
    await context.setOffline(true);
    await page.getByRole('button', { name: 'Complete A private daily goal today', exact: true }).click();
    await page.getByRole('button', { name: 'Undo A private daily goal today', exact: true }).waitFor();
    await Promise.all([
      page.waitForResponse(response => response.url().endsWith('/api/reminders/subscription') && response.ok()),
      context.setOffline(false),
    ]);
    await page.waitForTimeout(400);
    assert.equal(synced.at(-1).days[0].needed, false);
    console.log('PASS an offline completion suppresses the reminder once the connection returns');
    await page.getByRole('button', { name: 'Undo A private daily goal today', exact: true }).click();
    await page.getByRole('button', { name: 'A moment for today & tomorrow', exact: true }).click();
    await Promise.all([
      page.waitForResponse(response => response.ok() && response.url().endsWith('/api/reminders/subscription') &&
        response.request().postDataJSON()?.days?.[0]?.needed === false),
      page.getByRole('button', { name: 'That’s enough for today', exact: true }).click(),
    ]);
    await page.waitForTimeout(400);
    assert.equal(synced.at(-1).days[0].needed, false);
    await page.getByRole('button', { name: 'Complete A private daily goal today', exact: true }).waitFor();
    console.log('PASS closing today suppresses the reminder without inventing a completion or XP');
    await page.goto(`${base}/?evening=1`);
    await page.getByRole('heading', { name: 'A little moment for you.', exact: true }).waitFor();
    const dialog = page.getByRole('dialog', { name: 'A little moment for you.', exact: true });
    const habitCheck = dialog.getByRole('button', { name: 'A private daily goal completed today', exact: true });
    assert.equal(await habitCheck.getAttribute('aria-pressed'), 'false');
    await habitCheck.click();
    assert.equal(await habitCheck.getAttribute('aria-pressed'), 'true');
    await habitCheck.press('Space');
    assert.equal(await habitCheck.getAttribute('aria-pressed'), 'false');
    assert(await habitCheck.evaluate(button => button === document.activeElement));
    await page.getByText('SAVED ON THIS DEVICE', { exact: true }).waitFor({ state: 'attached' });
    await page.reload();
    assert.equal(await habitCheck.getAttribute('aria-pressed'), 'false');
    console.log('PASS evening checkoff can be reversed by keyboard and stays undone after reload');

    const { tomorrow, later, originalTime, tomorrowTime, laterTime } = await page.evaluate(() => {
      const format = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const original = new Date();
      const tomorrow = new Date(original);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);
      const later = new Date(tomorrow);
      later.setDate(later.getDate() + 2);
      return { tomorrow: format(tomorrow), later: format(later), originalTime: +original, tomorrowTime: +tomorrow, laterTime: +later };
    });
    const addPlan = dialog.getByRole('button', { name: 'Add a one-off plan', exact: true });
    const planDate = dialog.getByLabel('Date', { exact: true });
    const planName = dialog.getByLabel('Plan name', { exact: true });
    const savePlan = dialog.getByRole('button', { name: 'Save plan', exact: true });
    await addPlan.click();
    assert.equal(await planDate.inputValue(), tomorrow);
    await planName.fill('Tomorrow only');
    await savePlan.click();
    await dialog.getByText('Tomorrow only', { exact: true }).waitFor();
    await addPlan.click();
    await planName.fill('Later only');
    await planDate.fill(later);
    await savePlan.click();
    await dialog.getByText(/^Plan saved for/).waitFor();
    await dialog.getByRole('button', { name: 'Close dialog' }).click();
    const tomorrowCheck = page.getByRole('button', { name: 'Tomorrow only plan completed', exact: true });
    const laterCheck = page.getByRole('button', { name: 'Later only plan completed', exact: true });
    assert.equal(await tomorrowCheck.count(), 0);

    await page.clock.setFixedTime(tomorrowTime);
    await page.goto(base);
    await tomorrowCheck.click();
    assert.equal(await tomorrowCheck.getAttribute('aria-pressed'), 'true');
    await page.getByText('SAVED ON THIS DEVICE', { exact: true }).waitFor();
    assert.equal(await laterCheck.count(), 0);
    await page.clock.setFixedTime(laterTime);
    await page.goto(base);
    await laterCheck.waitFor();
    assert.equal(await tomorrowCheck.count(), 0);
    await page.locator('.bottom-nav').getByRole('button', { name: 'Progress', exact: true }).click();
    await page.locator('summary').filter({ hasText: 'One-off plans' }).click();
    assert.equal(await tomorrowCheck.getAttribute('aria-pressed'), 'true');
    assert.equal(await laterCheck.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.getByRole('button', { name: /Tomorrow only/ }).count(), 1);
    await page.clock.setFixedTime(originalTime);
    console.log('PASS tomorrow and custom-date plans persist, appear once and have separate progress');
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
