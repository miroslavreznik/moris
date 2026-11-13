import { describe, expect, it } from 'vitest';
import { EMPTY, type Snapshot } from './domain';
import { reminderPlan, remainingForReminder } from './reminder-plan';

function sample(schedule: Snapshot['revisions'][number]['schedule'] = { type: 'daily' }): Snapshot {
  return { ...EMPTY, habits: [{ id: 'gym', title: 'Gym', icon: 'move', color: '#1839d5', startDate: '2026-11-02', createdAt: '2026-11-02T12:00:00Z' }], revisions: [{ id: 'r1', habitId: 'gym', effectiveFrom: '2026-11-02', schedule }], completions: [] };
}
describe('gentle reminder eligibility', () => {
  it('sends only an incomplete scheduled day, never a completed day or rest day', () => {
    const data = sample({ type: 'weekdays', days: [1, 3] });
    data.completions.push({ id: 'done', habitId: 'gym', localDate: '2026-11-04', timeZone: 'Europe/Budapest', createdAt: '2026-11-04T12:00:00Z' });
    expect(reminderPlan(data, '2026-11-04').slice(0, 6)).toEqual([
      { date: '2026-11-04', needed: false }, { date: '2026-11-05', needed: false }, { date: '2026-11-06', needed: false },
      { date: '2026-11-07', needed: false }, { date: '2026-11-08', needed: false }, { date: '2026-11-09', needed: true },
    ]);
  });
  it('does not turn weekly flexibility into a daily debt and stops after meeting the quota', () => {
    const data = sample({ type: 'weekly_target', targetCount: 1 });
    expect(remainingForReminder(data, '2026-11-04')).toHaveLength(0);
    expect(remainingForReminder(data, '2026-11-08')).toHaveLength(1);
    data.completions.push({ id: 'done', habitId: 'gym', localDate: '2026-11-04', timeZone: 'Europe/Budapest', createdAt: '2026-11-04T12:00:00Z' });
    expect(remainingForReminder(data, '2026-11-08')).toHaveLength(0);
  });
  it('respects future revisions, archiving and a consciously closed day', () => {
    const data = sample();
    data.revisions.push({ id: 'r2', habitId: 'gym', effectiveFrom: '2026-11-05', schedule: { type: 'weekdays', days: [5] } });
    data.habits[0].archivedOn = '2026-11-07';
    const plan = reminderPlan(data, '2026-11-04', '2026-11-04');
    expect(plan).toHaveLength(14);
    expect(plan.filter(day => day.needed)).toEqual([{ date: '2026-11-06', needed: true }]);
    expect(data.completions).toEqual([]);
  });
  it('includes open one-off plans on their own dates and respects dismissal', () => {
    const data: Snapshot = { ...EMPTY, plans: [
      { id: 'done', title: 'Call Eva', date: '2026-11-04', completed: true },
      { id: 'open', title: 'Meet a friend', date: '2026-11-05', completed: false },
    ] };

    expect(reminderPlan(data, '2026-11-04').slice(0, 3)).toEqual([
      { date: '2026-11-04', needed: false },
      { date: '2026-11-05', needed: true },
      { date: '2026-11-06', needed: false },
    ]);
    expect(reminderPlan(data, '2026-11-05', '2026-11-05').some(day => day.needed)).toBe(false);
  });
});
