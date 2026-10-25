import { describe, it, expect } from 'vitest';
import { backupOf, parseBackup } from './backup';
import { demoSnapshot } from './domain';
const sample = () => backupOf(demoSnapshot('2026-10-25'));
describe('safe backup parsing', () => {
  it('round-trips all local records and their dates', () => {
    const backup = sample(); expect(parseBackup(JSON.parse(JSON.stringify(backup)))).toEqual(demoSnapshot('2026-10-25'));
  });
  it('rejects unsupported versions before changing anything', () => { expect(() => parseBackup({ ...sample(), schemaVersion: 2 })).toThrow('version'); });
  it('rejects orphaned completions', () => { const backup = sample(); backup.completions[0].habitId = 'missing'; expect(() => parseBackup(backup)).toThrow('completion'); });
  it('rejects duplicate habit-date rewards', () => { const backup = sample(); backup.completions.push({ ...backup.completions[0], id: 'different-id' }); expect(() => parseBackup(backup)).toThrow('more than once'); });
  it('rejects invalid calendar dates and empty schedules', () => { const backup = sample(); backup.revisions[0].schedule = { type: 'weekdays', days: [] }; expect(() => parseBackup(backup)).toThrow('schedule'); const other = sample(); other.habits[0].startDate = '2026-02-30'; expect(() => parseBackup(other)).toThrow('habit'); });
  it('rejects missing starting revisions and invalid time zones', () => { const backup = sample(); backup.revisions.shift(); expect(() => parseBackup(backup)).toThrow('starting schedule'); const other = sample(); other.completions[0].timeZone = 'MadeUp/Place'; expect(() => parseBackup(other)).toThrow('time zone'); });
  it('keeps valid archived history and earned XP', () => { const backup = sample(); backup.habits[0].archivedOn = '2026-10-25'; backup.habits[0].archivedAt = '2026-10-25T18:00:00Z'; expect(parseBackup(backup).completions.length).toBe(backup.completions.length); });
  it('can archive a planned habit before its future start date', () => { const backup = sample(); backup.habits[0].startDate = '2026-11-01'; backup.revisions[0].effectiveFrom = '2026-11-01'; backup.habits[0].archivedOn = '2026-10-25'; backup.habits[0].archivedAt = '2026-10-25T18:00:00Z'; backup.completions = backup.completions.filter(c => c.habitId !== backup.habits[0].id); expect(parseBackup(backup).habits[0].archivedOn).toBe('2026-10-25'); });
});
