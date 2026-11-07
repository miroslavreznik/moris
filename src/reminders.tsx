import { useCallback, useEffect, useRef, useState } from 'react';
import { type Snapshot, today } from './domain';
import { db, isDemo } from './storage';
import { reminderPlan } from './reminder-plan';

type Preferences = { id: string; token: string; enabled: boolean; version: number; dismissedDay?: string; lastSync?: string; pendingSync: boolean };
type Config = { ready: boolean; publicKey: string; time: string; timeZone: string };
const PREF_KEY = 'reminder-device';
const api = import.meta.env.VITE_REMINDERS_API_URL || `${import.meta.env.BASE_URL}api/reminders/`;
const supported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
const keyBytes = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')), c => c.charCodeAt(0));
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function post(path: string, body: unknown) {
  const response = await fetch(`${api}${path}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', keepalive: true });
  if (response.status === 401) throw new Error('Open Moris online and sign in again to sync reminders.');
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Reminders could not sync. They will retry when you are online.');
}

export function useReminders(data: Snapshot, loaded: boolean, pending: number) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const prefsRef = useRef(preferences); prefsRef.current = preferences;
  const dataRef = useRef(data); dataRef.current = data;
  const [config, setConfig] = useState<Config | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [online, setOnline] = useState(navigator.onLine);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const signature = JSON.stringify(preferences ? { enabled: preferences.enabled, days: reminderPlan(data, today(), preferences.dismissedDay) } : null);

  const save = useCallback(async (next: Preferences) => {
    await db.meta.put({ key: PREF_KEY, value: next });
    prefsRef.current = next; setPreferences(next);
  }, []);

  const sync = useCallback(() => {
    const job = queue.current.catch(() => {}).then(async () => {
      const current = prefsRef.current;
      if (!current) return;
      const next = { ...current, version: Math.max(Date.now(), current.version + 1), pendingSync: true };
      await save(next);
      if (!navigator.onLine) return;
      const subscription = next.enabled ? await (await navigator.serviceWorker.ready).pushManager.getSubscription() : null;
      if (next.enabled && !subscription) throw new Error('This browser’s subscription has expired. Turn reminders off and on again.');
      await post('subscription', { id: next.id, token: next.token, enabled: next.enabled, version: next.version, ...(subscription ? { subscription: subscription.toJSON(), days: reminderPlan(dataRef.current, today(), next.dismissedDay) } : {}) });
      const latest = prefsRef.current;
      if (latest?.version === next.version) await save({ ...latest, pendingSync: false, lastSync: new Date().toISOString() });
      setError('');
    });
    queue.current = job;
    return job;
  }, [save]);

  useEffect(() => {
    if (isDemo) { setReady(true); return; }
    let alive = true;
    void db.meta.get(PREF_KEY).then(row => { if (alive) { setPreferences((row?.value as Preferences) || null); setReady(true); } }).catch(() => { if (alive) setError('Reminder preferences could not be opened.'); });
    const refresh = () => { setOnline(navigator.onLine); setRetry(n => n + 1); };
    const visible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('online', refresh); window.addEventListener('offline', refresh); document.addEventListener('visibilitychange', visible);
    return () => { alive = false; window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); document.removeEventListener('visibilitychange', visible); };
  }, []);

  useEffect(() => {
    if (isDemo || !supported() || !online) return;
    const controller = new AbortController();
    void fetch(`${api}config`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('The reminder service is unavailable. Open Moris online and sign in if needed.');
      const result: Config = await response.json();
      if (!result.ready || !result.publicKey) throw new Error('Evening reminders are not available yet.');
      setConfig(result);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message); });
    return () => controller.abort();
  }, [online, retry]);

  useEffect(() => {
    if (!ready || !loaded || pending || !preferences || isDemo || !config || !online) return;
    void sync().catch(reason => setError(reason.message));
    // Signature captures actual plan changes; lastSync/version must not resync.
  }, [signature, ready, loaded, pending, !!config, online, retry, sync]);

  async function enable() {
    if (!supported() || !config) return;
    setBusy(true); setError('');
    try {
      // Permission is requested only from the user's button click.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notifications are not allowed. You can enable them in your browser or phone settings.');
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (subscription && btoa(String.fromCharCode(...new Uint8Array(subscription.options.applicationServerKey!))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== config.publicKey) {
        await subscription.unsubscribe(); subscription = null;
      }
      if (!subscription) await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(config.publicKey) });
      await save({ ...(prefsRef.current || { id: crypto.randomUUID(), token: randomToken(), version: 0, pendingSync: true }), enabled: true });
      await sync();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Notifications could not be enabled.'); }
    finally { setBusy(false); }
  }
  async function disable() {
    if (!prefsRef.current) return;
    setBusy(true); setError('');
    try {
      await save({ ...prefsRef.current, enabled: false, pendingSync: true });
      // Unsubscribing also stops delivery if the server update cannot reach us.
      const registration = await navigator.serviceWorker.getRegistration();
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
      await sync();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'The server update is waiting for a connection.'); }
    finally { setBusy(false); }
  }
  async function test() {
    const current = prefsRef.current;
    if (!current?.enabled) return;
    setBusy(true); setError('');
    try { await sync(); await post('test', { id: current.id, token: current.token }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'The test could not be sent.'); }
    finally { setBusy(false); }
  }
  async function dismissToday() {
    if (!prefsRef.current) return;
    await save({ ...prefsRef.current, dismissedDay: today(), pendingSync: true });
    await sync().catch(reason => setError(reason.message));
    const registration = await navigator.serviceWorker.getRegistration();
    for (const notification of await registration?.getNotifications({ tag: 'moris-evening' }) || []) notification.close();
  }
  return { preferences, config, ready, busy, error, online, enable, disable, test, dismissToday };
}

export type ReminderControls = ReturnType<typeof useReminders>;
export function ReminderSettings({ controls }: { controls: ReminderControls }) {
  const { preferences, config, ready, busy, error, online, enable, disable, test } = controls;
  const canUse = supported() && !isDemo;
  const homeScreenNeeded = !canUse && /iPad|iPhone|iPod/.test(navigator.userAgent);
  return <section className="settings-section reminder-settings"><h2>A gentle evening reminder.</h2><p>One system notification around 7:30 pm, Central European time. Nothing when your day is complete or there’s nothing scheduled. Tap it to review today and look at tomorrow.</p>
    {canUse ? <div className="backup-actions"><button className="outline-button" disabled={busy || !ready || (!preferences?.enabled && (!online || !config))} onClick={() => void (preferences?.enabled ? disable() : enable())}>{busy ? 'Updating reminders…' : preferences?.enabled ? 'Turn reminders off' : 'Enable evening reminders'}</button>{preferences?.enabled && <button className="text-button" disabled={busy || !online} onClick={() => void test()}>Send a test notification</button>}</div> : <p className="small-note">{isDemo ? 'Reminders are available in your own Moris, outside the demo.' : homeScreenNeeded ? 'On iPhone or iPad, add Moris to your Home Screen in Safari, then open it from there to enable notifications.' : 'This browser does not support web push. Try a current version of Chrome, Edge, Firefox, or an installed Safari web app.'}</p>}
    {preferences && <p className="small-note" role="status">{preferences.enabled ? 'Reminders are on for this installation.' : 'Reminders are off for this installation.'}{preferences.pendingSync ? ' Server update waiting for a connection.' : preferences.lastSync ? ` Last synced ${new Date(preferences.lastSync).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}.` : ''}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <details className="reminder-details"><summary>Privacy & delivery limits</summary><p className="small-note">Your goals and history stay on this device. Enabling reminders sends only delivery details and which of the next 14 days need a reminder. Offline changes sync when you reconnect, so a reminder may occasionally arrive after you’ve finished offline. Reminders pause after 14 days without a visit. Your phone’s notification and battery settings can delay delivery.</p></details>
  </section>;
}
