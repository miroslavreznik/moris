import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { MorisDatabase, saveDelta, loadSnapshot, replaceWithBackup } from './storage';
import { demoSnapshot, EMPTY, toggleCompletion } from './domain';
const databases: MorisDatabase[] = [];
const fresh = () => { const db = new MorisDatabase(`test-${crypto.randomUUID()}`); databases.push(db); return db; };
const plan = { id: 'one', title: 'Meet a friend', date: '2026-10-25', completed: false };
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())); });
describe('IndexedDB persistence and safety', () => {
  it('upgrades a version 1 database with an empty plans table and preserves existing records', async () => {
    const db = fresh(), sample = demoSnapshot('2026-10-25');
    const legacy = new Dexie(db.name);
    legacy.version(1).stores({ habits: 'id, startDate, archivedAt', revisions: 'id, habitId, &[habitId+effectiveFrom]', completions: 'id, habitId, localDate, &[habitId+localDate]', meta: 'key' });
    try {
      await legacy.transaction('rw', legacy.tables, async () => {
        await legacy.table('habits').bulkPut(sample.habits);
        await legacy.table('revisions').bulkPut(sample.revisions);
        await legacy.table('completions').bulkPut(sample.completions);
        await legacy.table('meta').put({ key: 'config', value: { settings: sample.settings, onboardingComplete: true } });
      });
    } finally {
      legacy.close();
    }
    expect(await loadSnapshot(db)).toEqual(sample);
  });
  it('opens an older settings record without losing habits or requiring a database reset', async () => {
    const db = fresh(), sample = demoSnapshot('2026-10-25'); await saveDelta(EMPTY, sample, db);
    await db.meta.put({ key: 'config', value: { settings: { soundEnabled: false, animationsEnabled: true, locale: 'en', celebratedStage: 4 }, onboardingComplete: true } });
    const loaded = await loadSnapshot(db);
    expect(loaded.settings).toMatchObject({ morisColor: 'tangerine', morisDetail: 'freckles', celebratedStage: 4 });
    expect(loaded.habits).toEqual(sample.habits); expect(loaded.completions).toEqual(sample.completions);
  });
  it('survives a database close and reopen', async () => { const db = fresh(), sample = demoSnapshot('2026-10-25'); await saveDelta(EMPTY, sample, db); db.close(); await db.open(); expect(await loadSnapshot(db)).toEqual(sample); });
  it('enforces unique habit/date completions in the database', async () => { const db = fresh(), sample = demoSnapshot('2026-10-25'); await saveDelta(EMPTY, sample, db); await expect(db.completions.add({ ...sample.completions[0], id: 'duplicate' })).rejects.toThrow(); });
  it('persists undo as a deletion, without touching other history', async () => { const db = fresh(), sample = demoSnapshot('2026-10-25'); await saveDelta(EMPTY, sample, db); const changed = toggleCompletion(sample, sample.habits[0].id, '2026-10-25', '2026-10-25'); await saveDelta(sample, changed, db); expect(await loadSnapshot(db)).toEqual(changed); });
  it('persists one-off plan creation, changes, and removal independently of habits', async () => {
    const db = fresh();
    const sample = { ...demoSnapshot('2026-10-25'), plans: [plan] };
    await saveDelta(EMPTY, sample, db);
    const changed = { ...sample, plans: [{ ...plan, completed: true }] };
    await saveDelta(sample, changed, db);
    db.close();
    await db.open();
    expect(await loadSnapshot(db)).toEqual(changed);
    await saveDelta(changed, { ...sample, plans: [] }, db);
    expect(await loadSnapshot(db)).toEqual({ ...sample, plans: [] });
  });
  it('backs up current records atomically before replacing', async () => {
    const db = fresh(), sample = { ...demoSnapshot('2026-10-25'), plans: [plan] };
    const restored = { ...EMPTY, plans: [{ ...plan, id: 'two', completed: true }], onboardingComplete: true };
    await saveDelta(EMPTY, sample, db);
    await replaceWithBackup(sample, restored, db);
    expect(await loadSnapshot(db)).toEqual(restored);
    expect((await db.meta.get('safety-backup'))?.value).toMatchObject({ schemaVersion: 3, habits: sample.habits, plans: sample.plans });
  });
  it('rolls a failed restore back, keeping both current records and the previous safety backup', async () => {
    const db = fresh(), sample = { ...demoSnapshot('2026-10-25'), plans: [plan] };
    const previous = { ...EMPTY, plans: [{ ...plan, id: 'previous' }] };
    await saveDelta(EMPTY, previous, db);
    await replaceWithBackup(previous, sample, db);
    const previousBackup = await db.meta.get('safety-backup');
    const invalid = { ...sample, plans: [], completions: [...sample.completions, { ...sample.completions[0], id: 'collision' }] };
    await expect(replaceWithBackup(sample, invalid, db)).rejects.toThrow();
    expect(await loadSnapshot(db)).toEqual(sample);
    expect(await db.meta.get('safety-backup')).toEqual(previousBackup);
  });
});
