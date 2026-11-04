import { describe, expect, it } from 'vitest';
import { type Habit, type Revision, type Completion, type Schedule, type Snapshot, EMPTY, STAGES, addDays, today, monday, weekday, dayState, habitStats, weekInfo, xpOf, stageOf, toggleCompletion, demoSnapshot, revisionAt } from './domain';
const habit: Habit = { id: 'read', title: 'Read', icon: 'book', color: '#1839d5', createdAt: '2026-10-19T12:00:00Z', startDate: '2026-10-19' };
const rev = (schedule: Schedule, effectiveFrom = habit.startDate): Revision => ({ id: `revision-${effectiveFrom}`, habitId: habit.id, effectiveFrom, schedule });
const done = (...days: string[]): Completion[] => days.map(localDate => ({ id: `${habit.id}:${localDate}`, habitId: habit.id, localDate, timeZone: 'Europe/Budapest', createdAt: `${localDate}T12:00:00Z` }));
const snapshot = (schedule: Schedule = { type: 'daily' }): Snapshot => ({ ...EMPTY, settings: { ...EMPTY.settings }, habits: [habit], revisions: [rev(schedule)], completions: [] });
describe('calendar dates and schedule states', () => {
  it('moves by calendar dates over both daylight-saving transitions', () => {
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29'); expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25'); expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(monday('2026-10-25')).toBe('2026-10-19'); expect(weekday('2026-10-25')).toBe(7);
  });
  it('distinguishes a miss, today, future, and dates before a habit', () => {
    const revisions = [rev({ type: 'daily' })];
    expect(dayState(habit, revisions, [], '2026-10-18', '2026-10-25')).toBe('not_scheduled');
    expect(dayState(habit, revisions, [], '2026-10-24', '2026-10-25')).toBe('missed');
    expect(dayState(habit, revisions, [], '2026-10-25', '2026-10-25')).toBe('due');
    expect(dayState(habit, revisions, [], '2026-10-26', '2026-10-25')).toBe('future');
  });
  it('does not mark unscheduled weekdays as failures', () => {
    const revisions = [rev({ type: 'weekdays', days: [1, 4] })];
    expect(dayState(habit, revisions, [], '2026-10-20', '2026-10-25')).toBe('not_scheduled');
    expect(habitStats(habit, revisions, done('2026-10-19', '2026-10-22'), '2026-10-25').current).toBe(2);
  });
  it('ignores the off days of an interval schedule', () => {
    const revisions = [rev({ type: 'interval', everyNDays: 2, anchorDate: '2026-10-19' })];
    expect(dayState(habit, revisions, [], '2026-10-20', '2026-10-25')).toBe('not_scheduled');
    expect(habitStats(habit, revisions, done('2026-10-19', '2026-10-21', '2026-10-23'), '2026-10-25').current).toBe(3);
  });
  it('keeps earlier obligations under their original schedule', () => {
    const revisions = [rev({ type: 'daily' }), rev({ type: 'weekdays', days: [1] }, '2026-10-23')];
    expect(dayState(habit, revisions, [], '2026-10-22', '2026-10-25')).toBe('missed');
    expect(dayState(habit, revisions, [], '2026-10-24', '2026-10-25')).toBe('not_scheduled');
    expect(revisionAt(revisions, habit.id, '2026-10-22')?.schedule.type).toBe('daily');
  });
});
describe('streaks and weekly quotas', () => {
  it('keeps a daily streak while today is still open', () => {
    expect(habitStats(habit, [rev({ type: 'daily' })], done('2026-10-22', '2026-10-23', '2026-10-24'), '2026-10-25')).toMatchObject({ current: 3, best: 3 });
  });
  it('breaks the current streak at a closed missed opportunity but keeps the best', () => {
    expect(habitStats(habit, [rev({ type: 'daily' })], done('2026-10-21', '2026-10-22', '2026-10-23', '2026-10-25'), '2026-10-25')).toMatchObject({ current: 1, best: 3 });
  });
  it('does not call unchosen weekly weekdays missed', () => {
    expect(dayState(habit, [rev({ type: 'weekly_target', targetCount: 2 })], [], '2026-10-20', '2026-10-25')).toBe('not_scheduled');
  });
  it('fails a quota only after Sunday ends', () => {
    const revisions = [rev({ type: 'weekly_target', targetCount: 2 })];
    expect(weekInfo(habit, revisions, done('2026-10-20'), '2026-10-19', '2026-10-25').state).toBe('due');
    expect(weekInfo(habit, revisions, done('2026-10-20'), '2026-10-19', '2026-10-26').state).toBe('missed');
  });
  it('extends the weekly streak as soon as the current quota is met', () => {
    const olderHabit = { ...habit, startDate: '2026-10-12' };
    const revisions = [rev({ type: 'weekly_target', targetCount: 2 }, '2026-10-12')];
    const records = done('2026-10-13', '2026-10-15', '2026-10-20');
    expect(habitStats(olderHabit, revisions, records, '2026-10-22').current).toBe(1);
    expect(habitStats(olderHabit, revisions, [...records, ...done('2026-10-22')], '2026-10-22').current).toBe(2);
  });
  it('counts distinct dates, including an optional third day, without extra weekly streaks', () => {
    const revisions = [rev({ type: 'weekly_target', targetCount: 2 })];
    const records = [...done('2026-10-20', '2026-10-22', '2026-10-24'), ...done('2026-10-20')];
    expect(weekInfo(habit, revisions, records, '2026-10-19', '2026-10-25')).toMatchObject({ count: 3, target: 2, state: 'completed' });
    expect(habitStats(habit, revisions, records, '2026-10-25').current).toBe(1);
  });
  it('does not penalize a first partial week', () => {
    const h = { ...habit, startDate: '2026-10-21' }, revisions = [rev({ type: 'weekly_target', targetCount: 2 }, '2026-10-21')];
    expect(weekInfo(h, revisions, [], '2026-10-19', '2026-10-26').state).toBe('partial');
    expect(habitStats(h, revisions, done('2026-10-27', '2026-10-29'), '2026-11-01').current).toBe(1);
  });
  it('treats a changed quota as a partial period without rewriting prior weeks', () => {
    const h = { ...habit, startDate: '2026-10-12' };
    const revisions = [rev({ type: 'weekly_target', targetCount: 2 }, '2026-10-12'), rev({ type: 'weekly_target', targetCount: 3 }, '2026-10-22')];
    expect(weekInfo(h, revisions, done('2026-10-13', '2026-10-15'), '2026-10-12', '2026-10-26')).toMatchObject({ target: 2, state: 'completed' });
    expect(weekInfo(h, revisions, [], '2026-10-19', '2026-10-26')).toMatchObject({ target: 3, partial: true, state: 'partial' });
  });
});
describe('completion and rewards', () => {
  it('brings early evolutions closer while preserving later milestones', () => {
    expect(STAGES.map(s => s.xp)).toEqual([0, 30, 100, 250, 700, 1200, 2000]);
    expect(stageOf(20)).toBe(0); expect(stageOf(30)).toBe(1);
    expect(stageOf(90)).toBe(1); expect(stageOf(100)).toBe(2);
    expect(stageOf(240)).toBe(2); expect(stageOf(250)).toBe(3);
    expect(stageOf(1190)).toBe(4);
    expect(STAGES[stageOf(1200)].name).toBe('Cosmic Moris');
    expect(stageOf(1990)).toBe(5);
    expect(STAGES[stageOf(2000)].name).toBe('Moris the Infinite');
    expect(stageOf(5000)).toBe(6);
  });
  it('undoes and redoes a completion without duplicate rewards', () => {
    const first = toggleCompletion(snapshot(), habit.id, '2026-10-25', '2026-10-25', 'Europe/Budapest');
    const undone = toggleCompletion(first, habit.id, '2026-10-25', '2026-10-25');
    const again = toggleCompletion(undone, habit.id, '2026-10-25', '2026-10-25');
    expect(xpOf(first.completions)).toBe(10); expect(xpOf(undone.completions)).toBe(0); expect(again.completions).toHaveLength(1); expect(xpOf(again.completions)).toBe(10);
  });
  it('rejects future or unscheduled corrections', () => {
    expect(() => toggleCompletion(snapshot(), habit.id, '2026-10-26', '2026-10-25')).toThrow('Future');
    expect(() => toggleCompletion(snapshot({ type: 'weekdays', days: [1] }), habit.id, '2026-10-25', '2026-10-25')).toThrow('not scheduled');
  });
  it('captures the historical date and zone, preserving it across travel', () => {
    const first = toggleCompletion(snapshot(), habit.id, '2026-10-24', '2026-10-25', 'Pacific/Auckland');
    expect(first.completions[0]).toMatchObject({ localDate: '2026-10-24', timeZone: 'Pacific/Auckland' });
    expect(dayState(habit, first.revisions, first.completions, '2026-10-24', '2026-10-26')).toBe('completed');
  });
  it('retains archived rewards and never removes XP for missed opportunities', () => {
    const records = done('2026-10-19', '2026-10-20');
    expect(xpOf(records)).toBe(20); expect(xpOf(records)).toBe(20);
    expect(dayState({ ...habit, archivedOn: '2026-10-21', archivedAt: '2026-10-21T12:00:00Z' }, [rev({ type: 'daily' })], records, '2026-10-22', '2026-10-25')).toBe('not_scheduled');
    expect(stageOf(150)).toBe(2); expect(stageOf(700)).toBe(4);
  });
  it('can undo a correction of a completion recorded on the archive date', () => {
    const initial = { ...snapshot(), habits: [{ ...habit, archivedOn: '2026-10-25', archivedAt: '2026-10-25T18:00:00Z' }], completions: done('2026-10-25') };
    const removed = toggleCompletion(initial, habit.id, '2026-10-25', '2026-10-25');
    expect(toggleCompletion(removed, habit.id, '2026-10-25', '2026-10-25').completions).toHaveLength(1);
  });
  it('creates coherent demonstration data under the four-week schedule', () => {
    const demo = demoSnapshot('2026-10-25');
    expect(demo.completions.every(c => dayState(demo.habits.find(h => h.id === c.habitId)!, demo.revisions, demo.completions, c.localDate, '2026-10-25') === 'completed')).toBe(true);
  });
});
