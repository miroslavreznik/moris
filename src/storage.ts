import Dexie, { type Table } from 'dexie';
import { type Habit, type Revision, type Completion, type Snapshot, EMPTY, demoSnapshot, today } from './domain';
import { backupOf } from './backup';
export const isDemo = typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');
export class MorisDatabase extends Dexie {
  habits!: Table<Habit, string>;
  revisions!: Table<Revision, string>;
  completions!: Table<Completion, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  constructor(name = isDemo ? 'moris-demo-v1' : 'moris') {
    super(name);
    // Increment with .version(n).stores(...).upgrade(...) for future schema changes.
    // App-shell updates never delete or recreate this database.
    this.version(1).stores({ habits: 'id, startDate, archivedAt', revisions: 'id, habitId, &[habitId+effectiveFrom]', completions: 'id, habitId, localDate, &[habitId+localDate]', meta: 'key' });
  }
}
export const db = new MorisDatabase();
export async function loadSnapshot(database = db): Promise<Snapshot> {
  return database.transaction('r', database.tables, async () => {
    const [habits, revisions, completions, config] = await Promise.all([database.habits.toArray(), database.revisions.toArray(), database.completions.toArray(), database.meta.get('config')]);
    const value = config?.value as Partial<Snapshot> | undefined;
    return { habits, revisions, completions, settings: { ...EMPTY.settings, ...value?.settings }, onboardingComplete: value?.onboardingComplete ?? false };
  });
}
async function delta<T extends { id: string }>(table: Table<T, string>, before: T[], after: T[]): Promise<void> {
  const next = new Set(after.map(row => row.id)), old = new Map(before.map(row => [row.id, JSON.stringify(row)]));
  const removed = before.filter(row => !next.has(row.id)).map(row => row.id);
  const changed = after.filter(row => old.get(row.id) !== JSON.stringify(row));
  if (removed.length) await table.bulkDelete(removed);
  if (changed.length) await table.bulkPut(changed);
}
export async function saveDelta(before: Snapshot, after: Snapshot, database = db): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await delta(database.habits, before.habits, after.habits);
    await delta(database.revisions, before.revisions, after.revisions);
    await delta(database.completions, before.completions, after.completions);
    await database.meta.put({ key: 'config', value: { settings: after.settings, onboardingComplete: after.onboardingComplete } });
  });
}
export async function replaceWithBackup(before: Snapshot, after: Snapshot, database = db): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await database.meta.put({ key: 'safety-backup', value: backupOf(before) });
    await database.habits.clear(); await database.revisions.clear(); await database.completions.clear();
    await database.habits.bulkPut(after.habits); await database.revisions.bulkPut(after.revisions); await database.completions.bulkPut(after.completions);
    await database.meta.put({ key: 'config', value: { settings: after.settings, onboardingComplete: after.onboardingComplete } });
  });
}
export async function initialize(): Promise<Snapshot> {
  let snapshot = await loadSnapshot();
  if (isDemo && !snapshot.onboardingComplete) { const seed = demoSnapshot(today()); await saveDelta(snapshot, seed); snapshot = seed; }
  return snapshot;
}
