const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdir, readFile } = require('node:fs/promises');
const path = require('node:path');
const base = process.env.MORIS_TEST_URL || 'http://127.0.0.1:4173';
const output = path.resolve('test-results');
const nav = (page, name) => page.locator('.bottom-nav').getByRole('button', { name, exact: true }).click();
const saved = page => page.locator('.workspace-footer').getByText('SAVED ON THIS DEVICE', { exact: true }).waitFor();
let browser;

async function exportBackup(page, filename) {
  await nav(page, 'Settings');
  await saved(page);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadEvent, file = path.join(output, filename);
  await download.saveAs(file);
  return JSON.parse(await readFile(file));
}

async function addHabit(page, title, repeat, duration) {
  await nav(page, 'Today');
  await page.getByRole('button', { name: 'Add habit', exact: true }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Habit name', { exact: true }).fill(title);
  await form.getByLabel('Repeat', { exact: true }).selectOption(repeat);
  assert.equal(await form.getByLabel('Duration', { exact: true }).inputValue(), 'ongoing');
  if (duration) {
    await form.getByLabel('Duration', { exact: true }).selectOption(duration.mode);
    if (duration.mode === 'period') {
      await form.getByLabel('How long?', { exact: true }).fill(String(duration.amount));
      await form.getByLabel('Period', { exact: true }).selectOption(duration.unit);
    } else await form.getByLabel('End date', { exact: true }).fill(duration.endDate);
    await form.getByText(/^Through /).waitFor();
  }
  await form.getByRole('button', { name: 'Add habit', exact: true }).click();
  await saved(page);
}

(async () => {
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: process.env.MORIS_BROWSER || 'msedge' } : {}) });
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Budapest', acceptDownloads: true });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.clock.setFixedTime(new Date('2026-11-18T12:00:00+01:00'));
  await page.goto(base);
  await page.getByRole('checkbox', { name: 'Move your body', exact: true }).check();
  await page.getByLabel('Duration', { exact: true }).selectOption('period');
  assert.equal(await page.getByLabel('How long?', { exact: true }).inputValue(), '3');
  assert.equal(await page.getByLabel('Period', { exact: true }).inputValue(), 'months');
  await page.getByLabel('Repeat', { exact: true }).selectOption('daily');
  await page.getByLabel('Repeat', { exact: true }).selectOption('weekly_target');
  assert.equal(await page.getByLabel('Duration', { exact: true }).inputValue(), 'period');
  assert.equal(await page.getByLabel('How long?', { exact: true }).inputValue(), '3');
  await page.getByText(/^Through /).waitFor();
  await page.getByRole('button', { name: "Let's begin with 1", exact: true }).click();
  await page.getByRole('button', { name: 'Complete Move your body today', exact: true }).click();
  await page.getByRole('button', { name: 'Undo Move your body today', exact: true }).waitFor();
  await saved(page);
  console.log('PASS onboarding combines a two-day weekly quota with three calendar months independently of Repeat');

  await addHabit(page, 'Daily reading', 'daily', { mode: 'period', amount: 7, unit: 'days' });
  await page.getByRole('button', { name: 'Complete Daily reading today', exact: true }).click();
  await page.getByRole('button', { name: 'Undo Daily reading today', exact: true }).waitFor();
  await saved(page);
  await addHabit(page, 'Every other day', 'interval', { mode: 'date', endDate: '2026-11-25' });
  await addHabit(page, 'Weekday walk', 'weekdays', { mode: 'period', amount: 2, unit: 'weeks' });
  await addHabit(page, 'Ongoing practice', 'daily');
  await nav(page, 'Settings');
  await page.getByRole('button', { name: 'Edit Move your body', exact: true }).click();
  const edit = page.getByRole('dialog');
  assert.equal(await edit.getByLabel('Duration', { exact: true }).inputValue(), 'date');
  assert.equal(await edit.getByLabel('End date', { exact: true }).inputValue(), '2027-02-17');
  assert.equal(await edit.getByLabel('Repeat', { exact: true }).inputValue(), 'weekly_target');
  assert.equal(await edit.getByLabel('Different days each week', { exact: true }).inputValue(), '2');
  const research = edit.locator('details.habit-research');
  assert.equal(await research.evaluate(element => element.open), false);
  await research.locator('summary').press('Enter');
  await research.locator('p').first().waitFor();
  assert.equal(await research.getByRole('link').count(), 2);
  await research.locator('summary').press('Enter');
  await page.setViewportSize({ width: 320, height: 800 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await edit.evaluate(dialog => dialog.scrollWidth > dialog.clientWidth), false);
  await edit.getByLabel('End date', { exact: true }).scrollIntoViewIfNeeded();
  await edit.screenshot({ path: path.join(output, 'habit-duration-form-mobile.png') });
  await edit.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const backup = await exportBackup(page, 'habit-duration-backup.json');
  assert.equal(backup.schemaVersion, 6);
  const endDates = Object.fromEntries(backup.habits.map(habit => [habit.title, habit.endDate ?? null]));
  assert.deepEqual(endDates, {
    'Move your body': '2027-02-17', 'Daily reading': '2026-11-24',
    'Every other day': '2026-11-25', 'Weekday walk': '2026-12-01', 'Ongoing practice': null,
  });
  assert.equal(backup.completions.length, 2);
  console.log('PASS all four repeat schedules accept duration; days, weeks, months and exact dates persist without changing ongoing habits');

  const restoredContext = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Europe/Budapest', acceptDownloads: true });
  restoredContext.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  const restored = await restoredContext.newPage();
  restored.setDefaultTimeout(12000);
  await restored.clock.setFixedTime(new Date('2026-11-18T12:00:00+01:00'));
  await restored.goto(base);
  await restored.getByRole('button', { name: 'Start with a blank page', exact: true }).click();
  await nav(restored, 'Settings');
  await restored.getByLabel('Choose Moris backup file', { exact: true }).setInputFiles({ name: 'duration-backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await restored.getByRole('button', { name: 'Back up & replace records', exact: true }).click();
  await restored.getByRole('button', { name: /Download the safety copy/ }).waitFor();
  const restoredBackup = await exportBackup(restored, 'habit-duration-restored-backup.json');
  assert.deepEqual(restoredBackup.habits, backup.habits);
  assert.deepEqual(restoredBackup.revisions, backup.revisions);
  assert.deepEqual(restoredBackup.completions, backup.completions);
  console.log('PASS export and restore retain exact end dates, schedules and earned completions');

  await restored.clock.setFixedTime(new Date('2027-02-17T12:00:00+01:00'));
  await restored.reload();
  await nav(restored, 'Today');
  await restored.getByRole('button', { name: 'Complete Move your body today', exact: true }).waitFor();
  await restored.clock.setFixedTime(new Date('2027-02-18T12:00:00+01:00'));
  await restored.reload();
  await restored.getByRole('button', { name: 'Complete Ongoing practice today', exact: true }).waitFor();
  assert.equal(await restored.getByRole('button', { name: 'Complete Move your body today', exact: true }).count(), 0);
  await nav(restored, 'Progress');
  const ended = restored.locator('details.ended-progress');
  await ended.waitFor();
  assert.equal(await ended.evaluate(element => element.open), false);
  assert.equal(await ended.locator('.goal-overview').count(), 4);
  assert.equal(await restored.locator('.main-content > .goal-overviews .goal-overview').count(), 1);
  await ended.locator('summary').focus();
  await restored.keyboard.press('Enter');
  await ended.locator('.goal-overview').filter({ hasText: 'Move your body' }).click();
  await restored.getByRole('heading', { name: 'Move your body', exact: true }).waitFor();
  const afterEnd = restored.locator('.calendar-grid').getByRole('button', { name: /February 18, 2027:/ });
  assert(await afterEnd.isDisabled());
  await restored.getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await restored.getByLabel('End date', { exact: true }).inputValue(), '2027-02-17');
  await restored.getByLabel('End date', { exact: true }).fill('2027-03-18');
  await restored.getByRole('button', { name: 'Save changes', exact: true }).click();
  await nav(restored, 'Today');
  await restored.getByRole('button', { name: 'Complete Move your body today', exact: true }).waitFor();
  const extended = await exportBackup(restored, 'habit-duration-extended-backup.json');
  const extendedHabit = extended.habits.find(habit => habit.title === 'Move your body');
  assert.equal(extendedHabit.startDate, '2026-11-18'); assert.equal(extendedHabit.endDate, '2027-03-18');
  assert.deepEqual(extended.completions, backup.completions);
  assert.deepEqual(extended.revisions, backup.revisions);
  await nav(restored, 'Progress');
  assert.equal(await ended.locator('.goal-overview').count(), 3);
  assert.equal(await restored.locator('.main-content > .goal-overviews .goal-overview').count(), 2);
  const dismiss = restored.getByRole('button', { name: 'Dismiss message', exact: true });
  if (await dismiss.count()) await dismiss.click();
  await restored.screenshot({ path: path.join(output, 'habit-duration-ended-progress-mobile.png'), fullPage: true });
  console.log('PASS the last date remains active; expiry moves habits to collapsed history and extending restores Today without rewriting records');

  await nav(page, 'Today');
  await page.getByRole('button', { name: 'Add habit', exact: true }).click();
  const futureForm = page.getByRole('dialog');
  await futureForm.getByLabel('Habit name', { exact: true }).fill('Future gym plan');
  await futureForm.getByLabel('Repeat', { exact: true }).selectOption('weekly_target');
  await futureForm.getByLabel('Start date', { exact: true }).fill('2027-03-01');
  await futureForm.getByLabel('Duration', { exact: true }).selectOption('date');
  await futureForm.getByLabel('End date', { exact: true }).fill('2027-03-31');
  await futureForm.getByRole('button', { name: 'Add habit', exact: true }).click();
  const beforeFutureEdit = await exportBackup(page, 'habit-duration-future-before-edit.json');
  const futureHabit = beforeFutureEdit.habits.find(habit => habit.title === 'Future gym plan');
  const futureRevisions = beforeFutureEdit.revisions.filter(revision => revision.habitId === futureHabit.id);
  assert.equal(futureRevisions.length, 1);
  assert.deepEqual(futureRevisions[0].schedule, { type: 'weekly_target', targetCount: 2 });
  await page.getByRole('button', { name: 'Edit Future gym plan', exact: true }).click();
  assert.equal(await page.getByLabel('Repeat', { exact: true }).inputValue(), 'weekly_target');
  assert.equal(await page.getByLabel('Different days each week', { exact: true }).inputValue(), '2');
  await page.getByLabel('End date', { exact: true }).fill('2027-04-30');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  const afterFutureEdit = await exportBackup(page, 'habit-duration-future-after-edit.json');
  assert.equal(afterFutureEdit.habits.find(habit => habit.id === futureHabit.id).startDate, '2027-03-01');
  assert.equal(afterFutureEdit.habits.find(habit => habit.id === futureHabit.id).endDate, '2027-04-30');
  assert.deepEqual(afterFutureEdit.revisions.filter(revision => revision.habitId === futureHabit.id), futureRevisions);
  assert.deepEqual(afterFutureEdit.completions, beforeFutureEdit.completions);
  console.log('PASS editing a future-start end date preserves its original weekly quota, start date and schedule revision');
  assert.deepEqual(errors, []);
  await browser.close();
})().catch(async error => {
  console.error(error);
  if (browser) for (const [i, context] of browser.contexts().entries()) for (const [j, page] of context.pages().entries()) {
    await page.screenshot({ path: path.join(output, `duration-failure-${i}-${j}.png`), fullPage: true }).catch(() => {});
  }
  await browser?.close(); process.exitCode = 1;
});
