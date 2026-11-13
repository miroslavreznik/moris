import { describe, expect, it } from 'vitest';
import { type Habit, type Revision, type Completion, type Schedule, type Snapshot, EMPTY, STAGES, activeOn, addDays, monday, weekday, dayState, habitStats, plannedProgress, weekInfo, xpOf, stageOf, toggleCompletion, demoSnapshot, revisionAt, pauseHabit, pausedOn, resumeHabit } from './domain';
const habit: Habit = { id: 'read', title: 'Read', icon: 'book', color: '#1839d5', createdAt: '2026-10-19T12:00:00Z', startDate: '2026-10-19' };
const rev = (schedule: Schedule, effectiveFrom = habit.startDate): Revision => ({ id: `revision-${effectiveFrom}`, habitId: habit.id, effectiveFrom, schedule });
const done = (...days: string[]): Completion[] => days.map(localDate => ({ id: `${habit.id}:${localDate}`, habitId: habit.id, localDate, timeZone: 'Europe/Budapest', createdAt: `${localDate}T12:00:00Z` }));
const snapshot = (schedule: Schedule = { type: 'daily' }): Snapshot => ({ ...EMPTY, settings: { ...EMPTY.settings }, habits: [habit], revisions: [rev(schedule)], completions: [] });

describe('planned progress', () => {
  it('counts scheduled dates in the window, uses their original schedule and omits pauses', () => {
    const paused = { ...habit, pauses: [{ from: '2026-10-21', until: '2026-10-23' }] };
    const revisions = [rev({ type: 'daily' }), rev({ type: 'weekdays', days: [5, 7] }, '2026-10-23')];
    const records = done('2026-10-19', '2026-10-21', '2026-10-23', '2026-10-25', '2026-10-30');
    expect(plannedProgress(paused, revisions, records, '2026-10-20', '2026-10-25')).toEqual({ completed: 2, planned: 3 });
  });

  it('respects the interval anchor, start and archive boundaries', () => {
    const archived = { ...habit, archivedOn: '2026-10-26' };
    const revisions = [rev({ type: 'interval', everyNDays: 3, anchorDate: '2026-10-19' })];
    expect(plannedProgress(archived, revisions, done('2026-10-19', '2026-10-22'), '2026-10-01', '2026-10-31')).toEqual({ completed: 2, planned: 3 });
    expect(plannedProgress(archived, revisions, [], '2026-10-26', '2026-11-22')).toEqual({ completed: 0, planned: 0 });
  });

  it('counts one weekly quota, caps extra completions and omits fully paused weeks', () => {
    const paused = { ...habit, pauses: [{ from: '2026-10-26', until: '2026-11-07' }] };
    const revisions = [rev({ type: 'weekly_target', targetCount: 3 })];
    const records = done('2026-10-20', '2026-10-21', '2026-10-21', '2026-10-23', '2026-10-24', '2026-11-03', '2026-11-07', '2026-11-08');
    expect(plannedProgress(paused, revisions, records, '2026-10-12', '2026-11-07')).toEqual({ completed: 4, planned: 4 });
  });

  it('uses earlier entries toward a revised weekly quota and accounts for completions before a partial first week', () => {
    const revisions = [rev({ type: 'weekly_target', targetCount: 2 }), rev({ type: 'weekly_target', targetCount: 3 }, '2026-10-23')];
    const records = done('2026-10-19', '2026-10-21', '2026-10-24', '2026-10-25');
    expect(plannedProgress(habit, revisions, records, '2026-10-20', '2026-10-25')).toEqual({ completed: 2, planned: 2 });
  });
});

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
describe('pausing and resuming habits', () => {
  it('pauses immediately and resumes on the chosen day without a missed date or broken streak', () => {
    const revisions = [rev({ type: 'daily' })];
    const paused = pauseHabit(habit, '2026-10-21');
    expect(pauseHabit(paused, '2026-10-22')).toBe(paused);
    const resumed = resumeHabit(paused, '2026-10-24');
    expect(resumed.pauses).toEqual([{ from: '2026-10-21', until: '2026-10-24' }]);
    expect(resumeHabit(resumed, '2026-10-25')).toBe(resumed);
    expect(activeOn(resumed, '2026-10-20')).toBe(true);
    expect(activeOn(resumed, '2026-10-21')).toBe(false);
    expect(dayState(resumed, revisions, [], '2026-10-23', '2026-10-24')).toBe('not_scheduled');
    expect(dayState(resumed, revisions, [], '2026-10-24', '2026-10-24')).toBe('due');
    expect(habitStats(resumed, revisions, done('2026-10-19', '2026-10-20', '2026-10-24'), '2026-10-24')).toMatchObject({ current: 3, best: 3 });
  });
  it('cancels a same-day pause and lets future habits remain paused after their start date', () => {
    const day = '2026-10-17';
    const paused = pauseHabit(habit, day);
    expect(resumeHabit(paused, day)).toEqual(habit);
    expect(pausedOn(paused, day)).toBe(true);
    expect(activeOn(paused, habit.startDate)).toBe(false);
    const resumed = resumeHabit(paused, '2026-10-18');
    expect(activeOn(resumed, '2026-10-18')).toBe(false);
    expect(activeOn(resumed, habit.startDate)).toBe(true);
  });
  it('keeps a recorded completion and lets it be removed while blocking new completions on paused days', () => {
    const pauseDay = '2026-10-20', later = '2026-10-22';
    const paused = pauseHabit(habit, pauseDay);
    const state = { ...snapshot(), habits: [paused], completions: done('2026-10-19', pauseDay) };
    expect(dayState(paused, state.revisions, state.completions, pauseDay, later)).toBe('completed');
    expect(habitStats(paused, state.revisions, state.completions, later)).toMatchObject({ current: 2, best: 2, total: 2 });
    const corrected = toggleCompletion(state, habit.id, pauseDay, later);
    expect(xpOf(corrected.completions)).toBe(10);
    expect(dayState(paused, state.revisions, corrected.completions, pauseDay, later)).toBe('not_scheduled');
    expect(() => toggleCompletion(corrected, habit.id, pauseDay, later)).toThrow('not scheduled');
    expect(() => toggleCompletion(corrected, habit.id, later, later)).toThrow('not scheduled');
  });
  it('skips weeks within a pause and closes an unfinished boundary week without a miss', () => {
    const olderHabit = { ...habit, startDate: '2026-10-12' };
    const paused = pauseHabit(olderHabit, '2026-10-21');
    const revisions = [rev({ type: 'weekly_target', targetCount: 2 }, olderHabit.startDate)];
    const records = done('2026-10-12', '2026-10-13', '2026-10-20');
    expect(weekInfo(paused, revisions, records, '2026-10-19', '2026-10-20').state).toBe('due');
    expect(weekInfo(paused, revisions, records, '2026-10-19', '2026-10-21')).toMatchObject({ count: 1, target: 2, state: 'partial', partial: true });
    expect(weekInfo(paused, revisions, records, '2026-10-26', '2026-10-31').state).toBe('not_scheduled');
    const resumed = resumeHabit(paused, '2026-11-04');
    expect(weekInfo(resumed, revisions, records, '2026-11-02', '2026-11-04')).toMatchObject({ state: 'due', partial: true });
    expect(habitStats(resumed, revisions, records, '2026-11-09')).toMatchObject({ current: 1, best: 1 });
  });
  it('includes a completion made on the first day of a weekly pause even when it is the only day with a record', () => {
    const paused = pauseHabit(habit, '2026-10-19');
    const revisions = [rev({ type: 'weekly_target', targetCount: 1 })];
    const records = done('2026-10-19');
    expect(weekInfo(paused, revisions, records, '2026-10-19', '2026-10-21')).toMatchObject({ count: 1, target: 1, state: 'completed', partial: true, completionDates: ['2026-10-19'] });
    expect(habitStats(paused, revisions, records, '2026-10-26')).toMatchObject({ current: 1, best: 1, total: 1 });
  });
  it('leaves a later pause intact if another pause is started after the local date moves backward', () => {
    const later = pauseHabit(habit, '2026-10-25');
    const earlier = pauseHabit(later, '2026-10-23');
    expect(earlier.pauses).toEqual([{ from: '2026-10-23', until: '2026-10-25' }, { from: '2026-10-25' }]);
    const resumed = resumeHabit(earlier, '2026-10-24');
    expect(pausedOn(resumed, '2026-10-24')).toBe(false);
    expect(pausedOn(resumed, '2026-10-25')).toBe(true);
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
