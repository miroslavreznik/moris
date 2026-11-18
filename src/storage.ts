import Dexie, { type Table } from 'dexie';
import { type Habit, type Revision, type Completion, type OneOffPlan, type Snapshot, EMPTY, demoSnapshot, today, xpOf, stageOf } from './domain';
import { backupOf } from './backup';
import { evolutionStateOf } from './evolution';
import { createEvolutionLabSnapshot } from './evolution-lab';
export const isEvolutionLab = import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('evolutionLab') === '1';
export const isDemo = !isEvolutionLab && typeof location !== 'undefined' && new URLSearchParams(location.search).has('demo');
export class MorisDatabase extends Dexie {
  habits!: Table<Habit, string>;
  revisions!: Table<Revision, string>;
  completions!: Table<Completion, string>;
  plans!: Table<OneOffPlan, string>;
  meta!: Table<{ key: string; value: unknown }, string>;
  constructor(name = isEvolutionLab ? 'moris-evolution-lab-v1' : isDemo ? 'moris-demo-v1' : 'moris') {
    super(name);
    // Increment with .version(n).stores(...).upgrade(...) for future schema changes.
    // App-shell updates never delete or recreate this database.
    this.version(1).stores({ habits: 'id, startDate, archivedAt', revisions: 'id, habitId, &[habitId+effectiveFrom]', completions: 'id, habitId, localDate, &[habitId+localDate]', meta: 'key' });
    this.version(2).stores({ plans: 'id' });
  }
}
export const db = new MorisDatabase();
export async function loadSnapshot(database = db): Promise<Snapshot> {
  return database.transaction('r', database.tables, async () => {
    const [habits, revisions, completions, plans, config] = await Promise.all([
      database.habits.toArray(), database.revisions.toArray(), database.completions.toArray(), database.plans.toArray(), database.meta.get('config'),
    ]);
    const value = config?.value as Partial<Snapshot> | undefined;
    // Keep legacy preference fields compatible while always enabling completion feedback.
    const evolution = evolutionStateOf(value?.settings, stageOf(xpOf(completions)));
    return { habits, revisions, completions, plans, settings: { ...EMPTY.settings, ...value?.settings, ...evolution, soundEnabled: true, animationsEnabled: true }, onboardingComplete: value?.onboardingComplete ?? false };
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
    await delta(database.plans, before.plans, after.plans);
    await database.meta.put({ key: 'config', value: { settings: after.settings, onboardingComplete: after.onboardingComplete } });
  });
}
export async function replaceWithBackup(before: Snapshot, after: Snapshot, database = db): Promise<void> {
  await database.transaction('rw', database.tables, async () => {
    await database.meta.put({ key: 'safety-backup', value: backupOf(before) });
    await database.habits.clear(); await database.revisions.clear(); await database.completions.clear(); await database.plans.clear();
    await database.habits.bulkPut(after.habits); await database.revisions.bulkPut(after.revisions); await database.completions.bulkPut(after.completions); await database.plans.bulkPut(after.plans);
    await database.meta.put({ key: 'config', value: { settings: after.settings, onboardingComplete: after.onboardingComplete } });
  });
}
export async function initialize(): Promise<Snapshot> {
  let snapshot = await loadSnapshot();
  if (isEvolutionLab && !snapshot.onboardingComplete) { const seed = createEvolutionLabSnapshot(); await saveDelta(snapshot, seed); snapshot = seed; }
  else if (isDemo && !snapshot.onboardingComplete) { const seed = demoSnapshot(today()); await saveDelta(snapshot, seed); snapshot = seed; }
  return snapshot;
}
