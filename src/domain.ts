export type Day = string;
export type Schedule =
  | { type: 'daily' }
  | { type: 'interval'; everyNDays: number; anchorDate: Day }
  | { type: 'weekdays'; days: number[] }
  | { type: 'weekly_target'; targetCount: number };
export type Habit = { id: string; title: string; icon: string; color: string; createdAt: string; startDate: Day; archivedAt?: string; archivedOn?: Day };
export type Revision = { id: string; habitId: string; effectiveFrom: Day; schedule: Schedule };
export type Completion = { id: string; habitId: string; localDate: Day; timeZone: string; createdAt: string };
export type Settings = { soundEnabled: boolean; animationsEnabled: boolean; locale: 'en'; celebratedStage: number };
export type Snapshot = { habits: Habit[]; revisions: Revision[]; completions: Completion[]; settings: Settings; onboardingComplete: boolean };
export type DayState = 'completed' | 'due' | 'missed' | 'not_scheduled' | 'future';
export const DEFAULT_SETTINGS: Settings = { soundEnabled: false, animationsEnabled: true, locale: 'en', celebratedStage: 0 };
export const EMPTY: Snapshot = { habits: [], revisions: [], completions: [], settings: DEFAULT_SETTINGS, onboardingComplete: false };
export const STAGES = [
  { name: 'Proto-Moris', xp: 0, description: 'One cell. Several opinions. A tiny beginning with unreasonable potential.' },
  { name: 'Finny Moris', xp: 50, description: 'New fins. No swimming lessons. Your little repetitions are making waves.' },
  { name: 'Leggy Moris', xp: 150, description: 'A pair of legs and absolutely no coordination. Still moving forward.' },
  { name: 'Primate-ish Moris', xp: 350, description: 'A little fluff. A lot of confidence. Definitely not a biology lesson.' },
  { name: 'Super Moris', xp: 700, description: 'A gloriously odd work in progress. There is always another little thing to do.' },
] as const;
export const ICONS = ['book', 'walk', 'sun', 'move', 'spark', 'heart', 'coffee', 'pen'] as const;
export const COLORS = ['#1839d5', '#c24f24', '#477246', '#8d4b90', '#2d7388'];
export const uid = () => crypto.randomUUID();
export function today(now = new Date()): Day { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; }
export function timeZone(): string { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
// Calendar dates are moved in UTC at noon, independent of DST and the machine's zone.
export function serial(day: Day): number { return Math.floor(new Date(`${day}T12:00:00Z`).getTime() / 86400000); }
export function addDays(day: Day, amount: number): Day { return new Date((serial(day) + amount) * 86400000).toISOString().slice(0, 10); }
export function weekday(day: Day): number { return new Date(`${day}T12:00:00Z`).getUTCDay() || 7; }
export function monday(day: Day): Day { return addDays(day, 1 - weekday(day)); }
export function dates(from: Day, to: Day): Day[] { const out: Day[] = []; for (let day = from; day <= to; day = addDays(day, 1)) out.push(day); return out; }
export function formatDay(day: Day, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string { return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(`${day}T12:00:00Z`)); }
export function revisionAt(revisions: Revision[], habitId: string, day: Day): Revision | undefined {
  return revisions.filter(r => r.habitId === habitId && r.effectiveFrom <= day).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
}
export function activeOn(habit: Habit, day: Day): boolean { return day >= habit.startDate && (!habit.archivedOn || day < habit.archivedOn); }
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
  const days = dates(start, end).filter(day => activeOn(habit, day));
  // A changed or newly introduced quota is a partial period: never retroactively fail it.
  const weeklyDays = days.filter(day => revisionAt(revisions, habit.id, day)?.schedule.type === 'weekly_target');
  if (!weeklyDays.length) return { start, end, count: 0, target: 0, state: 'not_scheduled', partial: true, completionDates: [] };
  const lastRevision = revisionAt(revisions, habit.id, weeklyDays[weeklyDays.length - 1])!;
  const target = (lastRevision.schedule as Extract<Schedule, { type: 'weekly_target' }>).targetCount;
  const applicableDays = weeklyDays.filter(day => revisionAt(revisions, habit.id, day)?.id === lastRevision.id);
  const unique = new Set(completions.filter(c => c.habitId === habit.id && applicableDays.includes(c.localDate)).map(c => c.localDate));
  const count = unique.size;
  const partial = applicableDays.length < 7;
  const state = start > now ? 'future' : count >= target ? 'completed' : end >= now ? 'due' : partial ? 'partial' : 'missed';
  return { start, end, count, target, state, partial, completionDates: [...unique].sort() };
}
export function habitStats(habit: Habit, revisions: Revision[], completions: Completion[], now: Day): { current: number; best: number; unit: string; total: number } {
  const type = revisionAt(revisions, habit.id, now)?.schedule.type;
  const total = new Set(completions.filter(c => c.habitId === habit.id).map(c => c.localDate)).size;
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
      if (!activeOn(habit, day) || !revision || revision.schedule.type === 'weekly_target' || !scheduled(revision.schedule, day)) continue;
      events.push({ done: completedOn(completions, habit.id, day), open: day === now });
    }
  }
  for (const event of events) { if (event.done) { run++; best = Math.max(best, run); } else if (!event.open) run = 0; }
  return { current: run, best, unit: type === 'weekly_target' ? 'weeks' : 'scheduled completions', total };
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
  if ((!activeOn(habit, day) && day !== habit.archivedOn) || !revision || !scheduled(revision.schedule, day)) throw new Error('This habit was not scheduled on that date.');
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
  return { habits, revisions, completions, settings: { ...DEFAULT_SETTINGS, celebratedStage: 4 }, onboardingComplete: true };
}
