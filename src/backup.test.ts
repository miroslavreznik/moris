import { describe, it, expect } from 'vitest';
import { backupOf, parseBackup } from './backup';
import { demoSnapshot, STAGES } from './domain';
const sample = () => backupOf(demoSnapshot('2026-10-25'));
describe('safe backup parsing', () => {
  it('preserves a personal Moris across export and restore', () => {
    const backup = sample();
    backup.settings.morisColor = 'lagoon'; backup.settings.morisDetail = 'antenna';
    expect(parseBackup(JSON.parse(JSON.stringify(backup))).settings).toMatchObject({ morisColor: 'lagoon', morisDetail: 'antenna' });
  });
  it('restores older backups with the original color and default quirk', () => {
    const backup = JSON.parse(JSON.stringify({ ...sample(), schemaVersion: 1 }));
    delete backup.settings.morisColor; delete backup.settings.morisDetail; delete backup.plans;
    const restored = parseBackup(backup);
    expect(restored.settings).toMatchObject({ morisColor: 'tangerine', morisDetail: 'freckles' });
    expect(restored.plans).toEqual([]);
  });
  it('restores v2 plans and defaults to no pauses', () => {
    const plans = [{ id: 'one', title: 'Meet a friend', date: '2026-10-25', completed: true }];
    const backup = { ...sample(), schemaVersion: 2, plans };
    const restored = parseBackup(backup);
    expect(restored.plans).toEqual(plans);
    expect(restored.habits.every(habit => habit.pauses === undefined)).toBe(true);
  });
  it('rejects invalid appearance values before touching records', () => {
    const backup = JSON.parse(JSON.stringify(sample())); backup.settings.morisColor = 'unknown';
    expect(() => parseBackup(backup)).toThrow('color');
    backup.settings.morisColor = 'moss'; backup.settings.morisDetail = 'unknown';
    expect(() => parseBackup(backup)).toThrow('detail');
  });
  it('keeps celebrations for the added forms when restoring a backup', () => {
    const backup = sample();
    backup.settings.celebratedStage = 6;
    expect(parseBackup(backup).settings.celebratedStage).toBe(6);
    backup.settings.celebratedStage = 999;
    expect(parseBackup(backup).settings.celebratedStage).toBe(STAGES.length - 1);
  });
  it('restores an original five-form backup without changing its progress or unlock history', () => {
    const backup = sample(); backup.settings.celebratedStage = 4;
    const restored = parseBackup(backup);
    expect(restored.settings.celebratedStage).toBe(4);
    expect(restored.completions).toEqual(backup.completions);
    expect(restored.habits).toEqual(backup.habits);
  });
  it('round-trips all local records and their dates', () => {
    const state = {
      ...demoSnapshot('2026-10-25'),
      plans: [
        { id: 'one', title: 'Meet a friend', date: '2026-10-24', completed: true },
        { id: 'two', title: 'Visit the museum', date: '2026-10-29', completed: false },
      ],
    };
    expect(parseBackup(JSON.parse(JSON.stringify(backupOf(state))))).toEqual(state);
  });
  it('round-trips pauses, including ones before the start date, and keeps scheduled completions', () => {
    const backup = sample();
    const habit = backup.habits[0];
    habit.pauses = [{ from: '2026-09-20', until: '2026-09-25' }, { from: '2026-10-19' }];
    habit.archivedOn = '2026-10-25';
    habit.archivedAt = '2026-10-25T18:00:00Z';
    const corrected = backup.completions.find(c => c.habitId === habit.id && c.localDate === '2026-10-24')!;
    corrected.createdAt = '2026-10-25T15:00:00Z';
    backup.habits[1].pauses = [{ from: '2026-10-05', until: '2026-10-10' }, { from: '2026-10-10', until: '2026-10-25' }];
    backup.habits[1].archivedOn = '2026-10-25';
    backup.habits[1].archivedAt = '2026-10-25T18:00:00Z';

    const restored = parseBackup(JSON.parse(JSON.stringify(backup)));
    expect(backup.schemaVersion).toBe(3);
    expect(restored.habits).toEqual(backup.habits);
    expect(restored.completions).toEqual(backup.completions);
    const completionDays = restored.completions.filter(c => c.habitId === habit.id).map(c => c.localDate);
    expect(completionDays).toEqual(expect.arrayContaining(['2026-10-19', corrected.localDate, habit.archivedOn]));
  });
  it('rejects malformed, empty, reversed, overlapping, or out-of-order pause intervals', () => {
    const backup = sample();
    for (const pauses of [
      null,
      [{}],
      [{ from: '2026-02-30' }],
      [{ from: '2026-02-01', until: '2026-02-30' }],
      [{ from: '2026-10-05', until: '2026-10-05' }],
      [{ from: '2026-10-06', until: '2026-10-05' }],
      [{ from: '2026-10-01', until: '2026-10-05' }, { from: '2026-10-04' }],
      [{ from: '2026-10-05', until: '2026-10-06' }, { from: '2026-10-01', until: '2026-10-02' }],
      [{ from: '2026-10-01' }, { from: '2026-10-05', until: '2026-10-06' }],
    ]) {
      const habits = [{ ...backup.habits[0], pauses }, ...backup.habits.slice(1)];
      expect(() => parseBackup({ ...backup, habits })).toThrow('habit pause');
    }
  });
  it('rejects unsupported versions before changing anything', () => { expect(() => parseBackup({ ...sample(), schemaVersion: 4 })).toThrow('version'); });
  it('rejects a current backup without a plans array', () => {
    expect(() => parseBackup({ ...sample(), plans: undefined })).toThrow('plan records');
  });
  it('rejects invalid or duplicate plan records', () => {
    const plan = { id: 'one', title: 'Meet a friend', date: '2026-10-25', completed: false };
    for (const plans of [
      [{ ...plan, title: ' ' }],
      [{ ...plan, date: '2026-02-30' }],
      [{ ...plan, completed: 'false' }],
      [plan, { ...plan, date: '2026-10-26' }],
    ]) expect(() => parseBackup({ ...sample(), plans })).toThrow('plan is invalid or duplicated');
  });
  it('rejects orphaned completions', () => { const backup = sample(); backup.completions[0].habitId = 'missing'; expect(() => parseBackup(backup)).toThrow('completion'); });
  it('rejects duplicate habit-date rewards', () => { const backup = sample(); backup.completions.push({ ...backup.completions[0], id: 'different-id' }); expect(() => parseBackup(backup)).toThrow('more than once'); });
  it('rejects invalid calendar dates and empty schedules', () => { const backup = sample(); backup.revisions[0].schedule = { type: 'weekdays', days: [] }; expect(() => parseBackup(backup)).toThrow('schedule'); const other = sample(); other.habits[0].startDate = '2026-02-30'; expect(() => parseBackup(other)).toThrow('habit'); });
  it('rejects missing starting revisions and invalid time zones', () => { const backup = sample(); backup.revisions.shift(); expect(() => parseBackup(backup)).toThrow('starting schedule'); const other = sample(); other.completions[0].timeZone = 'MadeUp/Place'; expect(() => parseBackup(other)).toThrow('time zone'); });
  it('keeps valid archived history and earned XP', () => { const backup = sample(); backup.habits[0].archivedOn = '2026-10-25'; backup.habits[0].archivedAt = '2026-10-25T18:00:00Z'; expect(parseBackup(backup).completions.length).toBe(backup.completions.length); });
  it('can archive a planned habit before its future start date', () => { const backup = sample(); backup.habits[0].startDate = '2026-11-01'; backup.revisions[0].effectiveFrom = '2026-11-01'; backup.habits[0].archivedOn = '2026-10-25'; backup.habits[0].archivedAt = '2026-10-25T18:00:00Z'; backup.completions = backup.completions.filter(c => c.habitId !== backup.habits[0].id); expect(parseBackup(backup).habits[0].archivedOn).toBe('2026-10-25'); });
});
