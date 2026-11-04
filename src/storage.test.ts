import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { MorisDatabase, saveDelta, loadSnapshot, replaceWithBackup } from './storage';
import { demoSnapshot, EMPTY, toggleCompletion } from './domain';
const databases: MorisDatabase[] = [];
const fresh = () => { const db = new MorisDatabase(`test-${crypto.randomUUID()}`); databases.push(db); return db; };
afterEach(async () => { await Promise.all(databases.splice(0).map(db => db.delete())); });
describe('IndexedDB persistence and safety', () => {
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
  it('backs up current records atomically before replacing', async () => { const db = fresh(), sample = demoSnapshot('2026-10-25'); await saveDelta(EMPTY, sample, db); await replaceWithBackup(sample, { ...EMPTY, onboardingComplete: true }, db); expect((await loadSnapshot(db)).habits).toHaveLength(0); expect((await db.meta.get('safety-backup'))?.value).toMatchObject({ schemaVersion: 1, habits: sample.habits }); });
  it('rolls a failed restore back, keeping both current records and the previous safety backup', async () => { const db = fresh(), sample = demoSnapshot('2026-10-25'); await saveDelta(EMPTY, sample, db); const invalid = { ...sample, completions: [...sample.completions, { ...sample.completions[0], id: 'collision' }] }; await expect(replaceWithBackup(sample, invalid, db)).rejects.toThrow(); expect(await loadSnapshot(db)).toEqual(sample); expect(await db.meta.get('safety-backup')).toBeUndefined(); });
});
