import { useSyncExternalStore } from 'react';
import { type Snapshot, EMPTY } from './domain';
import { initialize, saveDelta, replaceWithBackup, loadSnapshot } from './storage';
type View = { data: Snapshot; loaded: boolean; pending: number; error: string | null };
let view: View = { data: EMPTY, loaded: false, pending: 0, error: null };
let queue: Promise<void> = Promise.resolve();
let failed = false;
const listeners = new Set<() => void>();
function publish(next: View) { view = next; listeners.forEach(listener => listener()); }
export async function boot() {
  try { publish({ data: await initialize(), loaded: true, pending: 0, error: null }); failed = false; }
  catch { publish({ ...view, loaded: true, error: 'Your local storage could not be opened. Check browser storage permissions, then reload. Your existing data has not been removed.' }); failed = true; }
}
export function change(updater: (data: Snapshot) => Snapshot, replace = false): Promise<void> {
  if (failed) return Promise.reject(new Error('Local storage is unavailable. Reload before making more changes.'));
  const before = view.data, after = updater(before);
  publish({ ...view, data: after, pending: view.pending + 1 });
  const job = queue.then(async () => {
    if (failed) throw new Error('A previous storage write failed.');
    await (replace ? replaceWithBackup(before, after) : saveDelta(before, after));
  });
  queue = job.then(() => { publish({ ...view, pending: view.pending - 1 }); }).catch(async () => {
    failed = true;
    const data = await loadSnapshot().catch(() => view.data);
    publish({ ...view, data, pending: Math.max(0, view.pending - 1), error: 'This change could not be saved. Your stored records have been reloaded. Export a backup and check available storage before reloading.' });
  });
  return job;
}
export async function writesFinished() { await queue; if (failed) throw new Error('Finish resolving the storage error before updating.'); }
export function useStore() { return useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => view); }
