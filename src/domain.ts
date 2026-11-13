import { DEFAULT_APPEARANCE, type Appearance } from './appearance';

export type Day = string;
export type Schedule =
  | { type: 'daily' }
  | { type: 'interval'; everyNDays: number; anchorDate: Day }
  | { type: 'weekdays'; days: number[] }
  | { type: 'weekly_target'; targetCount: number };
export type HabitPause = { from: Day; until?: Day };
export type Habit = { id: string; title: string; icon: string; color: string; createdAt: string; startDate: Day; archivedAt?: string; archivedOn?: Day; pauses?: HabitPause[] };
export type Revision = { id: string; habitId: string; effectiveFrom: Day; schedule: Schedule };
export type Completion = { id: string; habitId: string; localDate: Day; timeZone: string; createdAt: string };
export type OneOffPlan = { id: string; title: string; date: Day; completed: boolean };
export type Settings = Appearance & { soundEnabled: boolean; animationsEnabled: boolean; locale: 'en'; celebratedStage: number };
export type Snapshot = { habits: Habit[]; revisions: Revision[]; completions: Completion[]; plans: OneOffPlan[]; settings: Settings; onboardingComplete: boolean };
export type DayState = 'completed' | 'due' | 'missed' | 'not_scheduled' | 'future';
export const MAX_TITLE_LENGTH = 100;
export const DEFAULT_SETTINGS: Settings = { ...DEFAULT_APPEARANCE, soundEnabled: false, animationsEnabled: true, locale: 'en', celebratedStage: 0 };
export const EMPTY: Snapshot = { habits: [], revisions: [], completions: [], plans: [], settings: DEFAULT_SETTINGS, onboardingComplete: false };
export const STAGES = [
  { name: 'Proto-Moris', xp: 0, description: 'One cell. Several opinions. A tiny beginning with unreasonable potential.' },
  { name: 'Finny Moris', xp: 30, description: 'New fins. No swimming lessons. Your little repetitions are making waves.' },
  { name: 'Leggy Moris', xp: 100, description: 'A pair of legs and absolutely no coordination. Still moving forward.' },
  { name: 'Primate-ish Moris', xp: 250, description: 'A little fluff. A lot of confidence. Definitely not a biology lesson.' },
  { name: 'Super Moris', xp: 700, description: 'A gloriously odd work in progress. There is always another little thing to do.' },
  { name: 'Cosmic Moris', xp: 1200, description: 'Outgrew the pond. Acquired an orbit. Still occasionally bumps into things.' },
  { name: 'Moris the Infinite', xp: 2000, description: 'Has transcended several dimensions. Still needs a little nudge to go for a walk.' },
] as const;
export const ICONS = ['book', 'walk', 'sun', 'move', 'spark', 'heart', 'coffee', 'pen'] as const;
export const COLORS = ['#1839d5', '#c24f24', '#477246', '#8d4b90', '#2d7388'];
export const uid = () => crypto.randomUUID();
export function today(now = new Date()): Day { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export function timeZone(): string { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
// Calendar dates are moved in UTC at noon, independent of DST and the machine's zone.
export function serial(day: Day): number { return Math.floor(new Date(`${day}T12:00:00Z`).getTime() / 86400000); }
export function isDay(value: unknown): value is Day {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(serial(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function addDays(day: Day, amount: number): Day { return new Date((serial(day) + amount) * 86400000).toISOString().slice(0, 10); }
export function weekday(day: Day): number { return new Date(`${day}T12:00:00Z`).getUTCDay() || 7; }
export function monday(day: Day): Day { return addDays(day, 1 - weekday(day)); }
export function dates(from: Day, to: Day): Day[] { const out: Day[] = []; for (let day = from; day <= to; day = addDays(day, 1)) out.push(day); return out; }
export function formatDay(day: Day, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string { return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`)); }
export function revisionAt(revisions: Revision[], habitId: string, day: Day): Revision | undefined {
  return revisions.filter(r => r.habitId === habitId && r.effectiveFrom <= day).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
function pauseAt(habit: Habit, day: Day): HabitPause | undefined {
  return habit.pauses?.find(pause => pause.from <= day && (!pause.until || day < pause.until));
}
export function pausedOn(habit: Habit, day: Day): boolean { return pauseAt(habit, day) !== undefined; }
export function pauseHabit(habit: Habit, day: Day): Habit {
  if (habit.archivedAt || pausedOn(habit, day)) return habit;
  const pauses = [...habit.pauses ?? []];
  const next = pauses.findIndex(pause => pause.from > day);
  // A stored pause can still be in the future after the local date moves backward.
  if (next === -1) pauses.push({ from: day });
  else pauses.splice(next, 0, { from: day, until: pauses[next].from });
  return { ...habit, pauses };
}
export function resumeHabit(habit: Habit, day: Day): Habit {
  const pause = pauseAt(habit, day);
  if (habit.archivedAt || !pause) return habit;
  const { pauses, ...resumed } = habit;
  const history = pauses!.flatMap(period => {
    if (period !== pause) return [period];
    return period.from === day ? [] : [{ ...period, until: day }];
  });
  return history.length ? { ...resumed, pauses: history } : resumed;
}
function withinHabitLifetime(habit: Habit, day: Day): boolean {
  return day >= habit.startDate && (!habit.archivedOn || day < habit.archivedOn);
}
export function activeOn(habit: Habit, day: Day): boolean { return withinHabitLifetime(habit, day) && !pausedOn(habit, day); }
export function scheduled(schedule: Schedule, day: Day): boolean {
  switch (schedule.type) {
    case 'daily': return true;
    case 'interval': return serial(day) >= serial(schedule.anchorDate) && (serial(day) - serial(schedule.anchorDate)) % schedule.everyNDays === 0;
    case 'weekdays': return schedule.days.includes(weekday(day));
    case 'weekly_target': return true;
  }
}
export function completedOn(completions: Completion[], id: string, day: Day): boolean { return completions.some(c => c.habitId === id && c.localDate === day); }
export function dayState(habit: Habit, revisions: Revision[], completions: Completion[], day: Day, now: Day): DayState {
  if (completedOn(completions, habit.id, day)) return 'completed';
  const revision = revisionAt(revisions, habit.id, day);
  if (!activeOn(habit, day) || !revision || !scheduled(revision.schedule, day)) return 'not_scheduled';
  if (day > now) return 'future';
  if (revision.schedule.type === 'weekly_target') return day === now ? 'due' : 'not_scheduled';
  return day === now ? 'due' : 'missed';
}
export type Week = { start: Day; end: Day; count: number; target: number; state: 'completed' | 'due' | 'missed' | 'partial' | 'not_scheduled' | 'future'; partial: boolean; completionDates: Day[] };
export function weekInfo(habit: Habit, revisions: Revision[], completions: Completion[], start: Day, now: Day): Week {
  const end = addDays(start, 6);
  const recorded = new Set(completions.filter(c => c.habitId === habit.id && c.localDate >= start && c.localDate <= end).map(c => c.localDate));
  const weeklyDays = dates(start, end)
    .filter(day => withinHabitLifetime(habit, day) && (!pausedOn(habit, day) || recorded.has(day)))
    .map(day => ({ day, revision: revisionAt(revisions, habit.id, day) }))
    .filter(({ revision }) => revision?.schedule.type === 'weekly_target');
  if (!weeklyDays.length) return { start, end, count: 0, target: 0, state: 'not_scheduled', partial: true, completionDates: [] };
  const lastRevision = weeklyDays[weeklyDays.length - 1].revision!;
  const target = (lastRevision.schedule as Extract<Schedule, { type: 'weekly_target' }>).targetCount;
  const applicableDays = weeklyDays.filter(({ revision }) => revision?.id === lastRevision.id).map(({ day }) => day);
  const completionDates = applicableDays.filter(day => recorded.has(day));
  const count = completionDates.length;
  const activeDays = applicableDays.filter(day => !pausedOn(habit, day));
  // A shortened quota period does not break a streak if it is unfinished.
  const partial = activeDays.length < 7;
  const open = end >= now && (!pausedOn(habit, now) || activeDays.some(day => day >= now));
  const state = start > now ? 'future' : count >= target ? 'completed' : open ? 'due' : partial ? 'partial' : 'missed';
  return { start, end, count, target, state, partial, completionDates };
}
export function habitStats(habit: Habit, revisions: Revision[], completions: Completion[], now: Day): { current: number; best: number; unit: string; total: number } {
  const type = revisionAt(revisions, habit.id, now)?.schedule.type;
  const recorded = new Set(completions.filter(c => c.habitId === habit.id).map(c => c.localDate));
  const total = recorded.size;
  let run = 0, best = 0;
  const events: { done: boolean; open: boolean }[] = [];
  if (type === 'weekly_target') {
    for (let start = monday(habit.startDate); start <= now; start = addDays(start, 7)) {
      const week = weekInfo(habit, revisions, completions, start, now);
      if (week.state === 'not_scheduled' || week.state === 'partial') continue;
      events.push({ done: week.state === 'completed', open: week.end >= now });
    }
  } else {
    for (const day of dates(habit.startDate, now)) {
      const revision = revisionAt(revisions, habit.id, day);
      const done = recorded.has(day);
      if (!withinHabitLifetime(habit, day) || (!done && pausedOn(habit, day)) || !revision || revision.schedule.type === 'weekly_target' || !scheduled(revision.schedule, day)) continue;
      events.push({ done, open: day === now });
    }
  }
  for (const event of events) { if (event.done) { run++; best = Math.max(best, run); } else if (!event.open) run = 0; }
  return { current: run, best, unit: type === 'weekly_target' ? 'weeks' : 'scheduled completions', total };
}

export function plannedProgress(habit: Habit, revisions: Revision[], completions: Completion[], from: Day, through: Day) {
  const recorded = new Set(completions.filter(entry => entry.habitId === habit.id).map(entry => entry.localDate));
  const weekly = new Map<Day, { target: number; available: number; completed: number; completedBefore: number }>();
  let planned = 0;
  let completed = 0;

  for (const day of dates(monday(from), through)) {
    if (!activeOn(habit, day)) continue;
    const revision = revisionAt(revisions, habit.id, day);
    if (!revision || !scheduled(revision.schedule, day)) continue;
    const done = Number(recorded.has(day));
    if (revision.schedule.type !== 'weekly_target') {
      if (day < from) continue;
      planned++;
      completed += done;
      continue;
    }

    const week = monday(day);
    const quota = weekly.get(week) ?? { target: 0, available: 0, completed: 0, completedBefore: 0 };
    // Apply one quota per calendar week. A revision can change it without erasing earlier entries.
    quota.target = revision.schedule.targetCount;
    if (day < from) quota.completedBefore += done;
    else {
      quota.available++;
      quota.completed += done;
    }
    weekly.set(week, quota);
  }

  for (const quota of weekly.values()) {
    // A completion outside the window can already have filled part of its first week's quota.
    const opportunities = Math.min(Math.max(0, quota.target - quota.completedBefore), quota.available);
    planned += opportunities;
    completed += Math.min(quota.completed, opportunities);
  }
  return { completed, planned };
}

export function scheduleLabel(schedule: Schedule): string {
  switch (schedule.type) {
    case 'daily': return 'Every day';
    case 'interval': return `Every ${schedule.everyNDays} days`;
    case 'weekdays': return schedule.days.map(d => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][d - 1]).join(' · ');
    case 'weekly_target': return `${schedule.targetCount} ${schedule.targetCount === 1 ? 'day' : 'days'} a week`;
  }
}
export function xpOf(completions: Completion[]): number { return new Set(completions.map(c => `${c.habitId}:${c.localDate}`)).size * 10; }
export function stageOf(xp: number): number { return STAGES.reduce((stage, item, i) => xp >= item.xp ? i : stage, 0); }
export function toggleCompletion(snapshot: Snapshot, habitId: string, day: Day, now: Day, zone = timeZone()): Snapshot {
  const existing = snapshot.completions.find(c => c.habitId === habitId && c.localDate === day);
  const habit = snapshot.habits.find(h => h.id === habitId);
  if (!habit) throw new Error('This habit could not be found.');
  if (day > now) throw new Error('Future days cannot be completed.');
  if (existing) return { ...snapshot, completions: snapshot.completions.filter(c => c.id !== existing.id) };
  const revision = revisionAt(snapshot.revisions, habitId, day);
  if (pausedOn(habit, day) || (!withinHabitLifetime(habit, day) && day !== habit.archivedOn) || !revision || !scheduled(revision.schedule, day)) throw new Error('This habit was not scheduled on that date.');
  return { ...snapshot, completions: [...snapshot.completions, { id: `${habitId}:${day}`, habitId, localDate: day, timeZone: zone, createdAt: new Date().toISOString() }] };
}

export function demoSnapshot(now: Day): Snapshot {
  const start = addDays(monday(now), -21);
  const templates: { title: string; icon: string; schedule: Schedule }[] = [
    { title: 'Read a few pages', icon: 'book', schedule: { type: 'daily' } },
    { title: 'Go for a walk', icon: 'walk', schedule: { type: 'interval', everyNDays: 2, anchorDate: now } },
    { title: 'Move your body', icon: 'move', schedule: { type: 'weekly_target', targetCount: 2 } },
  ];
  const habits = templates.map((t, i) => ({ id: `demo-${i}`, title: t.title, icon: t.icon, color: COLORS[i], createdAt: `${start}T10:00:00Z`, startDate: start }));
  // An interval anchor in the past keeps the historical two-day plan visible.
  templates[1].schedule = { type: 'interval', everyNDays: 2, anchorDate: addDays(now, -28) };
  const revisions = templates.map((t, i) => ({ id: `demo-rev-${i}`, habitId: habits[i].id, effectiveFrom: start, schedule: t.schedule }));
  const completions: Completion[] = [];
  for (const [index, habit] of habits.entries()) for (const day of dates(start, now)) {
    const age = serial(now) - serial(day), due = scheduled(revisions[index].schedule, day);
    const done = index === 0 ? (age === 0 || age % 7 !== 2 && age % 7 !== 5) : index === 1 ? age > 0 && age % 6 !== 0 : [2, 4].includes(weekday(day)) && age > 0;
    if (due && done) completions.push({ id: `${habit.id}:${day}`, habitId: habit.id, localDate: day, timeZone: timeZone(), createdAt: `${day}T12:00:00Z` });
  }
  return { habits, revisions, completions, plans: [], settings: { ...DEFAULT_SETTINGS, celebratedStage: 4 }, onboardingComplete: true };
}
