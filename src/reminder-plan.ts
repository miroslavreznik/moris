import { type Day, type Snapshot, activeOn, addDays, completedOn, monday, revisionAt, scheduled, weekday, weekInfo } from './domain';

export const REMINDER_ZONE = 'Europe/Budapest';
export const REMINDER_TIME = '19:30';
export const REMINDER_DAYS = 14;
export type ReminderDay = { date: Day; needed: boolean };

// Flexible weekly goals are an opportunity, not a daily obligation. Only mention
// an unfinished quota on Sunday, and never after an entry was made that day.
export function remainingForReminder(data: Snapshot, date: Day) {
  return data.habits.filter(habit => {
    if (!activeOn(habit, date) || completedOn(data.completions, habit.id, date)) return false;
    const revision = revisionAt(data.revisions, habit.id, date);
    if (!revision || !scheduled(revision.schedule, date)) return false;
    if (revision.schedule.type !== 'weekly_target') return true;
    return weekday(date) === 7 && weekInfo(habit, data.revisions, data.completions, monday(date), date).state !== 'completed';
  });
}

export function reminderPlan(data: Snapshot, from: Day, dismissedDay?: Day): ReminderDay[] {
  return Array.from({ length: REMINDER_DAYS }, (_, index) => {
    const date = addDays(from, index);
    const needed = date !== dismissedDay && (
      data.plans.some(plan => plan.date === date && !plan.completed) ||
      remainingForReminder(data, date).length > 0
    );
    return { date, needed };
  });
}
