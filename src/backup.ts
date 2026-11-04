import { MORIS_COLORS, MORIS_DETAILS, appearanceOf } from './appearance';
import { type Snapshot, type Schedule, type Habit, type Revision, type Completion, DEFAULT_SETTINGS, STAGES, serial, revisionAt, scheduled, activeOn } from './domain';
export type Backup = Snapshot & { schemaVersion: 1; exportedAt: string };
export function backupOf(state: Snapshot): Backup { return { ...state, schemaVersion: 1, exportedAt: new Date().toISOString() }; }
export function downloadBackup(state: Snapshot, prefix = 'moris-backup'): void {
  const blob = new Blob([JSON.stringify(backupOf(state), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function fail(message: string): never { throw new Error(`Cannot import this backup: ${message}`); }
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function text(value: unknown, max = 120): value is string { return typeof value === 'string' && value.length > 0 && value.length <= max; }
function day(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(serial(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value; }
function instant(value: unknown): value is string { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
function schedule(value: unknown): value is Schedule {
  if (!object(value)) return false;
  if (value.type === 'daily') return true;
  if (value.type === 'interval') return Number.isInteger(value.everyNDays) && (value.everyNDays as number) >= 1 && (value.everyNDays as number) <= 365 && day(value.anchorDate);
  if (value.type === 'weekly_target') return Number.isInteger(value.targetCount) && (value.targetCount as number) >= 1 && (value.targetCount as number) <= 7;
  if (value.type === 'weekdays') return Array.isArray(value.days) && value.days.length > 0 && value.days.length <= 7 && new Set(value.days).size === value.days.length && value.days.every(d => Number.isInteger(d) && d >= 1 && d <= 7);
  return false;
}
export function parseBackup(input: unknown): Snapshot {
  if (!object(input) || input.schemaVersion !== 1) fail('the format version is not supported.');
  if (!Array.isArray(input.habits) || !Array.isArray(input.revisions) || !Array.isArray(input.completions)) fail('habit, schedule, or completion records are missing.');
  if (input.habits.length > 1000 || input.revisions.length > 10000 || input.completions.length > 100000) fail('the backup contains too many records.');
  const ids = new Set<string>();
  const habits: Habit[] = input.habits.map(h => {
    if (!object(h) || !text(h.id) || ids.has(h.id) || !text(h.title, 100) || !h.title.trim() || !text(h.icon, 30) || typeof h.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(h.color) || !instant(h.createdAt) || !day(h.startDate)) return fail('a habit is invalid or duplicated.');
    ids.add(h.id);
    if ((h.archivedAt !== undefined || h.archivedOn !== undefined) && (!instant(h.archivedAt) || !day(h.archivedOn))) fail('an archive date is invalid.');
    return { id: h.id, title: h.title.trim(), icon: h.icon, color: h.color, createdAt: h.createdAt, startDate: h.startDate, ...(h.archivedAt ? { archivedAt: h.archivedAt as string, archivedOn: h.archivedOn as string } : {}) };
  });
  const revisionIds = new Set<string>(), revisionDates = new Set<string>();
  const revisions: Revision[] = input.revisions.map(r => {
    if (!object(r) || !text(r.id) || revisionIds.has(r.id) || !text(r.habitId) || !ids.has(r.habitId) || !day(r.effectiveFrom) || !schedule(r.schedule)) return fail('a schedule revision is invalid.');
    const key = `${r.habitId}:${r.effectiveFrom}`;
    if (revisionDates.has(key) || r.effectiveFrom < habits.find(h => h.id === r.habitId)!.startDate) fail('schedule dates overlap or precede a habit.');
    revisionIds.add(r.id); revisionDates.add(key);
    return { id: r.id, habitId: r.habitId, effectiveFrom: r.effectiveFrom, schedule: r.schedule };
  });
  for (const habit of habits) if (!revisionAt(revisions, habit.id, habit.startDate)) fail('a habit has no starting schedule.');
  const pairs = new Set<string>(), completionIds = new Set<string>();
  const completions: Completion[] = input.completions.map(c => {
    if (!object(c) || !text(c.id, 180) || completionIds.has(c.id) || !text(c.habitId) || !ids.has(c.habitId) || !day(c.localDate) || !instant(c.createdAt) || !text(c.timeZone)) return fail('a completion is invalid.');
    const key = `${c.habitId}:${c.localDate}`;
    if (pairs.has(key)) fail('the same habit and date appear more than once.');
    try { new Intl.DateTimeFormat('en', { timeZone: c.timeZone }).format(); } catch { fail('a completion has an unknown time zone.'); }
    const habit = habits.find(h => h.id === c.habitId)!;
    const revision = revisionAt(revisions, habit.id, c.localDate);
    // Archive-day completions recorded before archiving are retained legitimately.
    if (c.localDate < habit.startDate || habit.archivedOn && c.localDate > habit.archivedOn || !revision || !scheduled(revision.schedule, c.localDate)) fail('a completion is outside its historical schedule.');
    pairs.add(key); completionIds.add(c.id);
    return { id: c.id, habitId: c.habitId, localDate: c.localDate, createdAt: c.createdAt, timeZone: c.timeZone };
  });
  if (!object(input.settings) || typeof input.settings.soundEnabled !== 'boolean' || typeof input.settings.animationsEnabled !== 'boolean') fail('settings are missing or invalid.');
  const settings = input.settings;
  if (settings.morisColor !== undefined && !MORIS_COLORS.some(color => color.id === settings.morisColor)) fail('the Moris color is invalid.');
  if (settings.morisDetail !== undefined && !MORIS_DETAILS.some(detail => detail.id === settings.morisDetail)) fail('the Moris detail is invalid.');
  return { habits, revisions, completions, settings: { ...DEFAULT_SETTINGS, ...appearanceOf(input.settings as Parameters<typeof appearanceOf>[0]), soundEnabled: input.settings.soundEnabled, animationsEnabled: input.settings.animationsEnabled, celebratedStage: Number.isInteger(input.settings.celebratedStage) ? Math.min(STAGES.length - 1, Math.max(0, input.settings.celebratedStage as number)) : 0 }, onboardingComplete: true };
}
