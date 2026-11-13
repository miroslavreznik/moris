import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpFromLine, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Coffee, Footprints, Heart, History, House, Menu, MoreHorizontal, Pencil, Plus, RefreshCw, Settings2, Share, Sparkles, Sun, Volume2, WifiOff, X, Zap, Dumbbell } from 'lucide-react';
import { registerSW } from 'virtual:pwa-register';
import { type Completion, type Day, type Habit, type OneOffPlan, type Revision, type Schedule, type Snapshot, ICONS, COLORS, STAGES, MAX_TITLE_LENGTH, isDay, today, addDays, monday, dates, formatDay, revisionAt, dayState, weekInfo, habitStats, scheduleLabel, xpOf, stageOf, toggleCompletion, uid, scheduled, activeOn, completedOn } from './domain';
import { downloadBackup, parseBackup, backupOf } from './backup';
import { db, isDemo } from './storage';
import { change, useStore, writesFinished } from './store';
import { Moris, type MorisMotion } from './Moris';
import { CompanionEditor } from './CompanionEditor';
import { EvolutionScene } from './EvolutionScene';
import { DEFAULT_APPEARANCE, type Appearance } from './appearance';
import { useReminders, ReminderSettings } from './reminders';
import { remainingForReminder } from './reminder-plan';

type Tab = 'Today' | 'Progress' | 'Moris' | 'Settings';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const glyphs = { book: BookOpen, walk: Footprints, sun: Sun, move: Dumbbell, spark: Sparkles, heart: Heart, coffee: Coffee, pen: Pencil };
function Icon({ name, size = 20 }: { name: string; size?: number }) { const Glyph = glyphs[name as keyof typeof glyphs] || Sparkles; return <Glyph size={size} aria-hidden="true" />; }
const tabIcons = { Today: House, Progress: History, Moris: Sparkles, Settings: Settings2 };
const stateLabels = { completed: 'Completed', due: 'Due today', missed: 'Missed', not_scheduled: 'Not scheduled', future: 'Future' };

function Dialog({ title, children, close, className = '' }: { title: string; children: ReactNode; close: () => void; className?: string }) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(close); closeRef.current = close;
  useEffect(() => { const el = ref.current!; const previous = document.activeElement as HTMLElement | null; el.showModal(); const cancel = (e: Event) => { e.preventDefault(); closeRef.current(); }; el.addEventListener('cancel', cancel); return () => { el.removeEventListener('cancel', cancel); el.close(); previous?.focus(); }; }, []);
  return <dialog ref={ref} className={`dialog ${className}`} onClick={e => { if (e.target === e.currentTarget) close(); }} aria-labelledby={titleId}><div className="dialog-inner"><header className="dialog-header"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={close} aria-label="Close dialog"><X size={22} /></button></header>{children}</div></dialog>;
}

function ScheduleFields({ value, onChange, anchor }: { value: Schedule; onChange: (value: Schedule) => void; anchor: Day }) {
  return <div className="schedule-fields"><label>Repeat<select aria-label="Repeat" value={value.type} onChange={e => { const type = e.target.value; onChange(type === 'daily' ? { type } : type === 'interval' ? { type, everyNDays: 2, anchorDate: anchor } : type === 'weekdays' ? { type, days: [1, 4] } : { type: 'weekly_target', targetCount: 2 }); }}><option value="daily">Every day</option><option value="interval">Every N days</option><option value="weekdays">Selected weekdays</option><option value="weekly_target">X days per week</option></select></label>
    {value.type === 'interval' && <div className="form-columns"><label>Days between repeats<input type="number" min="1" max="365" required value={value.everyNDays} onChange={e => onChange({ ...value, everyNDays: Number(e.target.value) })} /></label><label>Repeat from<input type="date" required value={value.anchorDate} onChange={e => onChange({ ...value, anchorDate: e.target.value })} /></label></div>}
    {value.type === 'weekdays' && <fieldset className="weekday-picker"><legend>Which days?</legend>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => <label key={day}><input type="checkbox" checked={value.days.includes(i + 1)} onChange={e => onChange({ ...value, days: e.target.checked ? [...value.days, i + 1].sort() : value.days.filter(n => n !== i + 1) })} /><span>{day}</span></label>)}</fieldset>}
    {value.type === 'weekly_target' && <label>Different days each week<select aria-label="Different days each week" value={value.targetCount} onChange={e => onChange({ ...value, targetCount: Number(e.target.value) })}>{Array.from({ length: 7 }, (_, i) => <option key={i} value={i + 1}>{i + 1} {i ? 'days' : 'day'} per week</option>)}</select><small>Monday–Sunday. Pick the days as you go; an empty weekday is not a miss.</small></label>}
  </div>;
}

function HabitForm({ habit, snapshot, now, close, saved, report }: { habit?: Habit; snapshot: Snapshot; now: Day; close: () => void; saved: (id: string) => void; report: (message: string) => void }) {
  const [title, setTitle] = useState(habit?.title || '');
  const [icon, setIcon] = useState(habit?.icon || 'spark');
  const [color, setColor] = useState(habit?.color || COLORS[0]);
  const [startDate, setStart] = useState(habit?.startDate || now);
  const earliestChange = habit && completedOn(snapshot.completions, habit.id, now) ? addDays(now, 1) : habit && habit.startDate > now ? habit.startDate : now;
  const [effective, setEffective] = useState(earliestChange);
  const original = habit ? revisionAt(snapshot.revisions, habit.id, now)?.schedule : undefined;
  const [schedule, setSchedule] = useState<Schedule>(original || { type: 'daily' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const changed = habit && JSON.stringify(schedule) !== JSON.stringify(original);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Give your habit a short name.'); return; }
    if (schedule.type === 'weekdays' && !schedule.days.length) { setError('Choose at least one weekday.'); return; }
    if (schedule.type === 'interval' && (!Number.isInteger(schedule.everyNDays) || schedule.everyNDays < 1 || schedule.everyNDays > 365)) { setError('Choose an interval between 1 and 365 days.'); return; }
    const id = habit?.id || uid(); setBusy(true);
    try {
      await change(data => {
        const nextHabit: Habit = habit ? { ...data.habits.find(h => h.id === id)!, title: title.trim(), icon, color } : { id, title: title.trim(), icon, color, startDate, createdAt: new Date().toISOString() };
        let revisions = data.revisions;
        if (!habit || changed) {
          const from = habit ? effective : startDate;
          // Replacing today's not-yet-historical revision does not rewrite prior dates.
          const sameDate = revisions.find(r => r.habitId === id && r.effectiveFrom === from);
          revisions = [...revisions.filter(r => r.id !== sameDate?.id), { id: sameDate?.id || uid(), habitId: id, effectiveFrom: from, schedule }];
        }
        return { ...data, habits: habit ? data.habits.map(h => h.id === id ? nextHabit : h) : [...data.habits, nextHabit], revisions };
      });
      close(); saved(id); report(habit ? 'Habit updated. Earlier dates keep their original schedule.' : 'A new little commitment. Make it your own.');
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <Dialog title={habit ? 'Make it yours.' : 'A little commitment.'} close={close}><form onSubmit={submit} className="habit-form"><label>Habit name<input autoFocus maxLength={100} required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Read a few pages" /></label><fieldset className="icon-picker"><legend>A little personality</legend>{ICONS.map(name => <button type="button" key={name} className={icon === name ? 'selected' : ''} aria-label={`Use ${name} icon`} aria-pressed={icon === name} onClick={() => setIcon(name)}><Icon name={name} /></button>)}</fieldset><fieldset className="color-picker"><legend>Habit color</legend>{COLORS.map((value, i) => <button type="button" style={{ '--habit-color': value } as React.CSSProperties} className={color === value ? 'selected' : ''} key={value} aria-label={`Use ${['cobalt', 'rust', 'green', 'purple', 'teal'][i]}`} aria-pressed={color === value} onClick={() => setColor(value)}>{color === value && <Check size={18} />}</button>)}</fieldset><ScheduleFields value={schedule} onChange={setSchedule} anchor={startDate} />{!habit && <label>Start date<input type="date" required value={startDate} onChange={e => { setStart(e.target.value); if (schedule.type === 'interval') setSchedule({ ...schedule, anchorDate: e.target.value }); }} /></label>}{changed && <label>New schedule starts<input type="date" min={earliestChange} required value={effective} onChange={e => setEffective(e.target.value)} /><small>Earlier dates keep their original schedule. If today is already complete, changes start tomorrow or later. A changed weekly quota gets a partial first week.</small></label>}{error && <p className="form-error" role="alert">{error}</p>}<button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : habit ? 'Save changes' : 'Add habit'}<ArrowRight size={18} /></button></form></Dialog>;
}

function PlanForm({ now, plan, close, saved }: { now: Day; plan?: OneOffPlan; close: () => void; saved?: (date: Day) => void }) {
  const [title, setTitle] = useState(plan?.title ?? '');
  const [date, setDate] = useState(plan?.date ?? addDays(now, 1));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = title.trim();
    if (!name || name.length > MAX_TITLE_LENGTH) { setError('Give your plan a short name.'); return; }
    if (!isDay(date) || (date < today() && date !== plan?.date)) { setError('Choose today or a later date.'); return; }
    setBusy(true);
    setError('');
    try {
      await change(current => {
        if (plan) {
          return { ...current, plans: current.plans.map(item => item.id === plan.id ? { ...item, title: name, date } : item) };
        }
        return { ...current, plans: [...current.plans, { id: uid(), title: name, date, completed: false }] };
      });
      saved?.(date);
      close();
    } catch (cause) {
      setError((cause as Error).message);
      setBusy(false);
    }
  }

  return <form className="habit-form plan-form" onSubmit={submit}>
    <label>Plan name<input autoFocus required maxLength={MAX_TITLE_LENGTH} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Join the board game night after work" /></label>
    <label>Date<input type="date" required min={plan && plan.date < now ? plan.date : now} max="9999-12-31" value={date} onChange={e => setDate(e.target.value)} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="plan-form-actions">
      <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving…' : plan ? 'Save changes' : 'Save plan'}</button>
      <button type="button" className="text-button" onClick={close} disabled={busy}>Cancel</button>
    </div>
  </form>;
}

function PlanCheck({ plan, toggle }: { plan: OneOffPlan; toggle: (plan: OneOffPlan) => void }) {
  return <button type="button" className="outline-button plan-check" aria-pressed={plan.completed} aria-label={`${plan.title} plan completed`} onClick={() => toggle(plan)}>
    {plan.completed ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
    <span>{plan.title}{plan.completed && <small> · Undo</small>}</span>
  </button>;
}

function PlansProgress({ plans, now, toggle, edit }: { plans: OneOffPlan[]; now: Day; toggle: (plan: OneOffPlan) => void; edit: (plan: OneOffPlan) => void }) {
  if (!plans.length) return null;
  const upcoming = plans.filter(plan => plan.date > now).sort((a, b) => a.date.localeCompare(b.date));
  const history = plans.filter(plan => plan.date <= now).sort((a, b) => b.date.localeCompare(a.date));
  const completed = history.filter(plan => plan.completed).length;

  return <details className="plans-progress">
    <summary>One-off plans <small>{completed} completed · {upcoming.length} upcoming</small></summary>
    <ul className="plan-history">
      {[...upcoming, ...history].map(plan => <li key={plan.id}>
        <time dateTime={plan.date}>{formatDay(plan.date, { month: 'short', day: 'numeric', year: 'numeric' })}</time>
        {plan.date <= now ? <PlanCheck plan={plan} toggle={toggle} /> : <span>{plan.title}</span>}
        {!plan.completed && <button type="button" className="icon-button" aria-label={`Edit plan ${plan.title}`} onClick={() => edit(plan)}><Pencil size={16} /></button>}
      </li>)}
    </ul>
  </details>;
}

function Onboarding({ now, report }: { now: Day; report: (message: string) => void }) {
  const suggestions = [ ['Read a few pages', 'book'], ['Go for a walk', 'walk'], ['Phone-free morning', 'sun'], ['Move your body', 'move'], ['A moment to meditate', 'heart'] ];
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [chooseMoris, setChooseMoris] = useState(false);
  const [choices, setChoices] = useState<{ title: string; icon: string; schedule: Schedule }[]>([]);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  async function begin() {
    if (choices.some(c => c.schedule.type === 'weekdays' && !c.schedule.days.length)) { report('Choose at least one weekday for each selected habit.'); return; }
    if (choices.some(c => c.schedule.type === 'interval' && (!Number.isInteger(c.schedule.everyNDays) || c.schedule.everyNDays < 1 || c.schedule.everyNDays > 365))) { report('Choose an interval between 1 and 365 days.'); return; }
    setBusy(true);
    try { await change(data => {
      const habits = choices.map((choice, i) => ({ id: uid(), title: choice.title, icon: choice.icon, color: COLORS[i % COLORS.length], startDate: now, createdAt: new Date().toISOString() }));
      return { ...data, habits, revisions: habits.map((h, i) => ({ id: uid(), habitId: h.id, effectiveFrom: now, schedule: choices[i].schedule })), settings: { ...data.settings, ...appearance }, onboardingComplete: true };
    }); } catch (e) { report((e as Error).message); setBusy(false); }
  }
  return <main className="welcome"><div className="welcome-brand">MORIS <span>A LITTLE WORK IN PROGRESS</span></div><div className="welcome-heading"><p className="eyebrow">NO ACCOUNT. JUST YOU & THE WEIRDO.</p><h1>Every repetition<br />changes you.</h1><Moris appearance={appearance} motion="idle" /></div><p className="welcome-intro">Pick one small thing. Do it again. Watch something wonderfully strange happen.</p><div className="welcome-companion"><p><strong>Meet your Moris.</strong>A color and a little quirk, just for you.</p><button className="text-button" onClick={() => setChooseMoris(true)}>Choose your Moris<ArrowRight size={16} /></button></div><h2>What would you like to show up for?</h2><div className="suggestions">{suggestions.map(([title, icon]) => {
    const selected = choices.find(c => c.title === title);
    return <div className={`suggestion ${selected ? 'chosen' : ''}`} key={title}><label className="suggestion-label"><Icon name={icon} /><span>{title}</span><input type="checkbox" checked={!!selected} onChange={e => setChoices(e.target.checked ? [...choices, { title, icon, schedule: icon === 'move' ? { type: 'weekly_target', targetCount: 2 } : { type: 'daily' } }] : choices.filter(c => c.title !== title))} /></label>{selected && <ScheduleFields value={selected.schedule} anchor={now} onChange={schedule => setChoices(choices.map(c => c.title === title ? { ...c, schedule } : c))} />}</div>;
  })}{choices.filter(c => !suggestions.some(([title]) => title === c.title)).map(choice => <div className="suggestion chosen" key={choice.title}><div className="suggestion-label"><Icon name="spark" /><span>{choice.title}</span><button className="icon-button" aria-label={`Remove ${choice.title}`} onClick={() => setChoices(choices.filter(c => c.title !== choice.title))}><X size={18} /></button></div><ScheduleFields value={choice.schedule} anchor={now} onChange={schedule => setChoices(choices.map(c => c.title === choice.title ? { ...c, schedule } : c))} /></div>)}</div><form className="custom-habit" onSubmit={e => { e.preventDefault(); if (custom.trim() && !choices.some(c => c.title === custom.trim())) { setChoices([...choices, { title: custom.trim(), icon: 'spark', schedule: { type: 'daily' } }]); setCustom(''); } }}><label className="sr-only" htmlFor="custom-habit">Your own habit</label><input id="custom-habit" maxLength={100} value={custom} onChange={e => setCustom(e.target.value)} placeholder="Or create your own little thing" /><button type="submit" className="icon-button" aria-label="Add your own habit" disabled={!custom.trim()}><Plus /></button></form><button onClick={() => void begin()} className="primary-button" disabled={busy}>{busy ? 'Getting your little world ready…' : choices.length ? `Let's begin with ${choices.length}` : 'Start with a blank page'}<ArrowRight size={20} /></button><p className="local-note">Saved on this device. Works offline after your first visit.<br />Back up regularly — there is no automatic cloud sync.</p>{chooseMoris && <Dialog title="One Moris. Yours." close={() => setChooseMoris(false)} className="companion-dialog"><CompanionEditor appearance={appearance} onSave={async next => { setAppearance(next); setChooseMoris(false); }} /></Dialog>}</main>;
}

function Legend({ weekly = false }: { weekly?: boolean }) { return <div className="calendar-legend"><span><i className="cell completed">✓</i>Done</span>{!weekly && <span><i className="cell missed">·</i>Missed</span>}<span><i className="cell due">○</i>Today</span><span><i className="cell not_scheduled">—</i>{weekly ? 'No entry' : 'Not scheduled'}</span><span><i className="cell future">·</i>Future</span></div>; }

function MiniHistory({ habit, data, now, choose }: { habit: Habit; data: Snapshot; now: Day; choose: () => void }) {
  const days = dates(addDays(now, -6), now);
  return <button type="button" className="mini-history" onClick={choose} aria-label={`View history for ${habit.title}`}><span>VIEW HISTORY</span><span className="mini-cells" aria-label="Last 7 days">{days.map(day => { const state = dayState(habit, data.revisions, data.completions, day, now); return <span className={`mini-cell ${state}`} key={day} aria-label={`${formatDay(day)}: ${stateLabels[state]}`}>{state === 'completed' ? '✓' : state === 'not_scheduled' ? '—' : '·'}</span>; })}</span><ArrowRight size={14} aria-hidden="true" /></button>;
}

function HabitTicket({ habit, data, now, index, complete, select }: { habit: Habit; data: Snapshot; now: Day; index: number; complete: (habit: Habit, day: Day) => void; select: () => void }) {
  const schedule = revisionAt(data.revisions, habit.id, now)?.schedule;
  const done = completedOn(data.completions, habit.id, now);
  const weekly = schedule?.type === 'weekly_target';
  const week = weekly ? weekInfo(habit, data.revisions, data.completions, monday(now), now) : null;
  return <article className={`habit-ticket ${done ? 'is-done' : ''} ${weekly ? 'is-weekly' : ''}`} style={{ '--habit-color': habit.color } as React.CSSProperties}>
    <button type="button" className="ticket-main" aria-label={`${done ? 'Undo' : 'Complete'} ${habit.title} today`} aria-pressed={done} onClick={() => complete(habit, now)}>
      <span className="ticket-name"><span className="ticket-number">Nº {String(index + 1).padStart(3, '0')} <Icon name={habit.icon} size={15} /></span><span className="ticket-title">{habit.title}</span><span className="ticket-context">{done ? 'Done today · tap to undo' : 'Tap to mark today'}{week ? ` · ${week.count}/${week.target} this week${week.partial ? ' · partial period' : ''}${week.state === 'completed' ? ' · goal reached' : ''}` : !done && schedule ? ` · ${scheduleLabel(schedule)}` : ''}</span></span>
      <span className="ticket-check" aria-hidden="true">{done ? <Check size={30} strokeWidth={2} /> : <Plus size={30} strokeWidth={1.5} />}</span>
    </button>
    {week && <div className="weekly-slots" aria-label={`${week.count} of ${week.target} days completed this week`}>{Array.from({ length: week.target }, (_, i) => <span key={i} className={i < week.count ? 'filled' : ''}>{i < week.count ? <Check size={13} /> : null}</span>)}</div>}<MiniHistory habit={habit} data={data} now={now} choose={select} />
  </article>;
}

function Progress({ data, now, selected, select, edit, correct }: { data: Snapshot; now: Day; selected: string | null; select: (id: string | null) => void; edit: (habit: Habit) => void; correct: (habit: Habit, day: Day) => void }) {
  const [offset, setOffset] = useState(0);
  const [showArchived, setShowArchived] = useState(false);
  const habit = data.habits.find(h => h.id === selected);
  useEffect(() => setOffset(0), [selected]);
  const visible = data.habits.filter(h => showArchived || !h.archivedAt);
  if (!habit) return <><PageTitle kicker="YOUR LITTLE THINGS, ADDING UP" title="A record of showing up." description="A separate story for every goal. Gaps and all." /><div className="progress-toolbar"><span>{visible.length} {visible.length === 1 ? 'habit' : 'habits'}</span><label className="small-check"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />Show archived</label></div>{!visible.length ? <Empty title="Your first mark is waiting." text="Add a habit from Today and its own progress story will appear here." /> : <div className="goal-overviews">{visible.map(h => {
    const stats = habitStats(h, data.revisions, data.completions, now), schedule = revisionAt(data.revisions, h.id, now)?.schedule;
    const weekly = schedule?.type === 'weekly_target', week = weekly ? weekInfo(h, data.revisions, data.completions, monday(now), now) : null;
    return <button key={h.id} className="goal-overview" onClick={() => select(h.id)} style={{ '--habit-color': h.color } as React.CSSProperties}><div className="goal-overview-heading"><Icon name={h.icon} size={20} /><h2>{h.title}</h2><ArrowRight size={18} /></div><span className="goal-schedule">{h.archivedAt ? 'Archived · ' : ''}{schedule && scheduleLabel(schedule)}</span>{week ? <><div className="quota-line"><strong>{week.count}<span>/{week.target}</span></strong><span>This week{week.partial ? ' · partial start' : ''}</span></div><div className="quota-meter"><i style={{ width: `${Math.min(100, week.count / week.target * 100)}%` }} /></div></> : <div className="overview-cells">{dates(addDays(now, -13), now).map(day => { const state = dayState(h, data.revisions, data.completions, day, now); return <span className={`cell ${state}`} key={day} aria-label={`${formatDay(day)}: ${stateLabels[state]}`}>{state === 'completed' ? '✓' : state === 'not_scheduled' ? '—' : '·'}</span>; })}</div>}<div className="goal-summary"><span><b>{stats.current}</b> {weekly ? 'week streak' : 'in a row'}</span><span><b>{stats.total}</b> total completions</span></div></button>;
  })}</div>}<p className="page-footnote">A blank unscheduled day is a rest day, not a failure.</p></>;
  const stats = habitStats(habit, data.revisions, data.completions, now), schedule = revisionAt(data.revisions, habit.id, now)?.schedule;
  const weekly = schedule?.type === 'weekly_target';
  const end = addDays(monday(now), 6 + offset * 7), start = addDays(end, -34);
  const gridDays = dates(start, end);
  const weekStarts = Array.from({ length: 12 }, (_, i) => addDays(monday(now), -7 * i));
  return <><button className="text-button back-button" onClick={() => select(null)}><ArrowLeft size={17} />All habits</button><div className="detail-heading"><PageTitle kicker={habit.archivedAt ? 'ARCHIVED / HISTORY KEPT' : schedule ? scheduleLabel(schedule).toUpperCase() : 'HABIT HISTORY'} title={habit.title} />{!habit.archivedAt && <button className="outline-button" onClick={() => edit(habit)}><Pencil size={15} />Edit</button>}</div><div className="streak-facts"><div><span>Current streak</span><strong>{stats.current}<small>{stats.unit}</small></strong></div><div><span>Personal best</span><strong>{stats.best}<small>{stats.unit}</small></strong></div><div><span>All the little wins</span><strong>{stats.total}<small>completions</small></strong></div></div>
    {weekly && <section className="weekly-history"><div className="section-heading"><h2>One week at a time.</h2><span>LAST 12 WEEKS</span></div>{weekStarts.map(start => { const week = weekInfo(habit, data.revisions, data.completions, start, now); if (!week.target) return null; return <div className={`week-row ${week.state}`} key={start}><div className="week-row-title"><span>{formatDay(start)}–{formatDay(week.end)}</span><strong>{week.count}/{week.target}</strong><span className="week-status">{week.state === 'completed' ? <><Check size={13} />Achieved</> : week.state === 'due' ? 'In progress' : week.state === 'partial' ? 'Partial week' : week.state === 'future' ? 'Upcoming' : 'Below target'}</span></div><div className="week-dates">{dates(start, week.end).map(day => { const done = completedOn(data.completions, habit.id, day); const available = day <= now && activeOn(habit, day) && revisionAt(data.revisions, habit.id, day)?.schedule.type === 'weekly_target'; return <button key={day} className={`week-date ${done ? 'completed' : ''}`} disabled={!done && !available} aria-label={`${formatDay(day, { weekday: 'long', month: 'short', day: 'numeric' })}: ${done ? 'completed' : 'no entry'}`} onClick={() => correct(habit, day)}><span>{formatDay(day, { weekday: 'narrow' })}</span><b>{done ? <Check size={14} /> : formatDay(day, { day: 'numeric' })}</b></button>; })}</div>{week.partial && <p className="week-note">Partial schedule period · an unfinished week does not break your streak.</p>}</div>; })}</section>}
    <section className="calendar-panel"><div className="calendar-header"><div><p className="eyebrow">{weekly ? 'THE ACTUAL DAYS YOU DID IT' : 'YOUR SCHEDULE, IN REAL LIFE'}</p><h2>{formatDay(start)} – {formatDay(end, { month: 'short', day: 'numeric', year: 'numeric' })}</h2></div><div className="calendar-arrows"><button className="icon-button" aria-label="Previous weeks" disabled={start <= habit.startDate} onClick={() => setOffset(offset - 5)}><ChevronLeft /></button><button className="icon-button" aria-label="Next weeks" disabled={offset === 0} onClick={() => setOffset(Math.min(0, offset + 5))}><ChevronRight /></button></div></div><div className="calendar-weekdays">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div><div className="calendar-grid">{gridDays.map(day => { const state = dayState(habit, data.revisions, data.completions, day, now); return <button type="button" key={day} className={`cell ${state} ${day === now ? 'is-today' : ''}`} disabled={state === 'future' || state === 'not_scheduled'} onClick={() => correct(habit, day)} aria-label={`${formatDay(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}: ${stateLabels[state]}`}><span>{formatDay(day, { day: 'numeric' })}</span>{state === 'completed' ? <Check size={16} /> : state === 'not_scheduled' ? <i>—</i> : state === 'due' ? <i>○</i> : null}</button>; })}</div><Legend weekly={weekly} /><p className="calendar-hint">{weekly ? 'Use the weekly rows above to record or correct a day. Empty weekdays are not misses.' : 'Tap a scheduled date to correct its record. Historical entries are clearly marked before saving.'}</p></section><section className="schedule-history"><h2>The plan, as it changed.</h2>{data.revisions.filter(r => r.habitId === habit.id).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom)).map(r => <div key={r.id}><span>From {formatDay(r.effectiveFrom, { month: 'short', day: 'numeric', year: 'numeric' })}</span><strong>{scheduleLabel(r.schedule)}</strong></div>)}</section></>;
}

function PageTitle({ kicker, title, description }: { kicker: string; title: string; description?: string }) { return <header className="page-title"><p className="eyebrow">{kicker}</p><h1>{title}</h1>{description && <p className="page-description">{description}</p>}</header>; }
function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) { return <section className="empty-state"><Moris /><h2>{title}</h2><p>{text}</p>{children}</section>; }

export default function App() {
  const { data, loaded, pending, error } = useStore();
  const [tab, setTab] = useState<Tab>(() => new URLSearchParams(location.search).get('view') === 'progress' ? 'Progress' : 'Today');
  const [now, setNow] = useState(today());
  const [selected, setSelected] = useState<string | null>(() => new URLSearchParams(location.search).get('goal'));
  const [form, setForm] = useState<Habit | 'new' | null>(null);
  const [editingPlan, setEditingPlan] = useState<OneOffPlan | null>(null);
  const [evening, setEvening] = useState(() => new URLSearchParams(location.search).has('evening'));
  const reminders = useReminders(data, loaded, pending);
  useEffect(() => {
    const open = (event: MessageEvent) => { if (event.data?.type === 'OPEN_EVENING_REVIEW') setEvening(true); };
    navigator.serviceWorker?.addEventListener('message', open);
    return () => navigator.serviceWorker?.removeEventListener('message', open);
  }, []);
  const [correction, setCorrection] = useState<{ habit: Habit; day: Day } | null>(null);
  const [archive, setArchive] = useState<Habit | null>(null);
  const [imported, setImported] = useState<Snapshot | null>(null);
  const [celebration, setCelebration] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [lastAction, setLastAction] = useState<{ habit: Habit; day: Day } | null>(null);
  const [happy, setHappy] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [motion, setMotion] = useState<{ kind: MorisMotion; key: number }>({ kind: 'still', key: 0 });
  const greetingPlayed = useRef(false);
  const completionReactions = useRef(0);
  const [online, setOnline] = useState(navigator.onLine);
  const [update, setUpdate] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [safetyBackup, setSafetyBackup] = useState<Snapshot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);
  const artTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStage = useRef<number | null>(null);
  const celebrationFrom = useRef(0);
  const animateMoris = useCallback((kind: MorisMotion) => {
    setMotion(current => ({ kind, key: current.key + 1 })); setHappy(kind !== 'idle' && kind !== 'still');
    if (artTimer.current) clearTimeout(artTimer.current);
    artTimer.current = setTimeout(() => { setMotion(current => ({ ...current, kind: 'idle' })); setHappy(false); }, kind === 'all-done' ? 1900 : 1700);
  }, []);
  useEffect(() => {
    if (loaded && data.onboardingComplete && !greetingPlayed.current) { greetingPlayed.current = true; animateMoris('greet'); }
  }, [loaded, data.onboardingComplete, animateMoris]);
  useEffect(() => () => { if (artTimer.current) clearTimeout(artTimer.current); }, []);
  const points = xpOf(data.completions), stage = stageOf(points);
  const report = (message: string) => { setNotice(message); if (noticeTimer.current) clearTimeout(noticeTimer.current); noticeTimer.current = setTimeout(() => { setNotice(''); setLastAction(null); }, 7000); };
  useEffect(() => {
    const refreshDate = () => setNow(today());
    const interval = setInterval(refreshDate, 30000);
    let hiddenSince: number | null = null;
    const visible = () => {
      if (document.hidden) { hiddenSince = Date.now(); return; }
      refreshDate();
      if (greetingPlayed.current && hiddenSince !== null && Date.now() - hiddenSince >= 60000) animateMoris('greet');
      hiddenSince = null;
    };
    const connect = () => setOnline(navigator.onLine);
    const install = (e: Event) => { e.preventDefault(); setInstallEvent(e as InstallEvent); };
    const installed = () => { setInstallEvent(null); setInstallDismissed(true); };
    document.addEventListener('visibilitychange', visible); window.addEventListener('online', connect); window.addEventListener('offline', connect); window.addEventListener('beforeinstallprompt', install); window.addEventListener('appinstalled', installed);
    updateRef.current = registerSW({ onNeedRefresh: () => setUpdate(true), onRegisterError: () => report('Offline setup could not finish. Reconnect and reload once to try again.') });
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', visible); window.removeEventListener('online', connect); window.removeEventListener('offline', connect); window.removeEventListener('beforeinstallprompt', install); window.removeEventListener('appinstalled', installed); };
  }, []);
  useEffect(() => {
    if (!loaded || evening) return;
    if ((previousStage.current === null || stage > previousStage.current) && stage > data.settings.celebratedStage) {
      celebrationFrom.current = previousStage.current ?? Math.min(stage - 1, Math.max(0, data.settings.celebratedStage));
      setCelebration(stage);
      void change(current => ({ ...current, settings: { ...current.settings, celebratedStage: stage } })).catch(() => {});
    }
    previousStage.current = stage;
  }, [loaded, evening, stage, data.settings.celebratedStage]);
  useEffect(() => { if (tab === 'Settings') void db.meta.get('safety-backup').then(row => { if (row) { try { setSafetyBackup(parseBackup(row.value)); } catch {} } }); }, [tab, data]);
  function go(next: Tab) { setTab(next); setSelected(null); window.scrollTo({ top: 0, behavior: 'instant' }); }
  function goal(id: string | null) { setSelected(id); setTab('Progress'); window.scrollTo({ top: 0, behavior: 'instant' }); }
  async function complete(habit: Habit, day: Day) {
    const actionToday = today(); if (actionToday !== now) setNow(actionToday);
    const wasDone = completedOn(data.completions, habit.id, day);
    try {
      let completedData = data;
      const job = change(current => { completedData = toggleCompletion(current, habit.id, day, actionToday); return completedData; });
      if (!wasDone) {
        const fixedToday = completedData.habits.filter(h => { const revision = revisionAt(completedData.revisions, h.id, actionToday); return activeOn(h, actionToday) && revision && revision.schedule.type !== 'weekly_target' && scheduled(revision.schedule, actionToday); });
        const allDone = day === actionToday && fixedToday.some(h => h.id === habit.id) && fixedToday.every(h => completedOn(completedData.completions, h.id, actionToday));
        const reactions: MorisMotion[] = ['hop', 'wiggle', 'spin'];
        animateMoris(allDone ? 'all-done' : reactions[completionReactions.current++ % reactions.length]!);
        if (data.settings.soundEnabled) playSound();
        if (typeof navigator.vibrate === 'function') navigator.vibrate(15);
      }
      setLastAction({ habit, day }); report(wasDone ? 'Stamp removed. Your other progress stays.' : day === now ? '+10 XP. One little thing, done.' : `Recorded for ${formatDay(day)}. +10 XP.`);
      await job;
    } catch (e) { report((e as Error).message); }
  }
  function togglePlan(plan: OneOffPlan) {
    const actionToday = today();
    if (actionToday !== now) setNow(actionToday);
    if (plan.date > actionToday) return;
    void change(current => ({
      ...current,
      plans: current.plans.map(item => item.id === plan.id && item.date <= actionToday ? { ...item, completed: !item.completed } : item),
    })).catch(error => report(error.message));
  }
  async function importFile(file: File) { try { if (file.size > 20_000_000) throw new Error('Choose a backup smaller than 20 MB.'); setImported(parseBackup(JSON.parse(await file.text()))); } catch (e) { report(e instanceof SyntaxError ? 'That file is not valid JSON. Your current records are unchanged.' : (e as Error).message); } }
  async function restore() { if (!imported) return; try { await writesFinished(); downloadBackup(data, 'moris-before-restore'); await change(() => imported, true); setSafetyBackup(data); setImported(null); setSelected(null); report('Backup restored. A safety copy of your previous data is also saved on this device.'); } catch (e) { report((e as Error).message); } }
  const activeHabits = data.habits.filter(h => !h.archivedAt);
  const relevant = activeHabits.filter(h => { const revision = revisionAt(data.revisions, h.id, now); return activeOn(h, now) && revision && scheduled(revision.schedule, now); });
  const fixed = relevant.filter(h => revisionAt(data.revisions, h.id, now)?.schedule.type !== 'weekly_target');
  const flexible = relevant.filter(h => revisionAt(data.revisions, h.id, now)?.schedule.type === 'weekly_target');
  const todayPlans = data.plans.filter(plan => plan.date === now);
  const dueCount = fixed.filter(h => completedOn(data.completions, h.id, now)).length;
  const installed = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone;
  if (!loaded) return <div className="loading"><Moris /><p>Getting your little world ready…</p></div>;
  return <div className={`app-shell ${!data.settings.animationsEnabled ? 'no-extra-motion' : ''}`}>
    {error && <div className="storage-error" role="alert"><strong>Your data needs attention.</strong><p>{error}</p><button onClick={() => downloadBackup(data)} className="outline-button">Export available records</button><button onClick={() => location.reload()} className="text-button">Reload</button></div>}
    {!data.onboardingComplete && !error ? <Onboarding now={now} report={report} /> : <>
      <aside className="sidebar"><button className="desktop-brand" onClick={() => go('Today')}>moris<span>EVERY REPETITION CHANGES YOU.</span></button><nav aria-label="Main navigation">{(['Today', 'Progress', 'Moris', 'Settings'] as Tab[]).map(name => { const Glyph = tabIcons[name]; return <button key={name} aria-current={tab === name ? 'page' : undefined} onClick={() => go(name)}><Glyph size={20} /><span>{name}</span>{tab === name && <span className="nav-dot" aria-hidden="true">●</span>}</button>; })}</nav><div className="sidebar-pet"><Moris stage={stage} happy={happy} appearance={data.settings} motion={motion.kind} motionKey={motion.key} /><span>YOUR LITTLE WORK IN PROGRESS</span><strong>{STAGES[stage].name}</strong><p>{points} XP. Every little thing counts.</p></div><p className="sidebar-bottom">YOUR DEVICE. YOUR PACE.<br />NO ACCOUNT REQUIRED.</p></aside>
      <div className="workspace"><header className="masthead"><button className="mobile-brand" onClick={() => go('Today')}>MORIS</button><span className="masthead-note">A LITTLE WORK IN PROGRESS</span><span className="masthead-date">{formatDay(now, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}</span></header>
        {(isDemo || !online) && <div className="status-banner">{isDemo ? <><span>DEMO EDITION · Sample data, separate from your own habits.</span><a href={import.meta.env.BASE_URL}>Start your own</a></> : <><WifiOff size={15} />Offline. Your habits still work and save here.</>}</div>}
        <main id="main-content" className={`main-content tab-${tab.toLowerCase()}`}>
          {tab === 'Today' && <><section className="today-heading"><div><p className="eyebrow">ANOTHER DAY. A FEW LITTLE THINGS.</p><h1>Show up.<br /><span>Get a little stranger.</span></h1></div><div className={`today-moris ${happy ? 'reacting' : ''}`}><button className="companion-hello" aria-label="Say hello to Moris" onClick={() => animateMoris('greet')}><Moris stage={stage} happy={happy} appearance={data.settings} motion={motion.kind} motionKey={motion.key} />{happy && motion.kind !== 'greet' && <i className="companion-xp" key={motion.key} aria-hidden="true">+10 XP</i>}</button><span>{STAGES[stage].name.toUpperCase()}</span><span className="moris-moment">{motion.kind === 'greet' ? 'Good to see you.' : motion.kind === 'all-done' ? 'Your little wins add up.' : 'Your little work in progress.'}</span></div></section><button className="evolution-strip" onClick={() => go('Moris')} aria-label="See Moris evolution"><span>{STAGES[stage + 1] ? `${STAGES[stage + 1].xp - points} XP TO THE NEXT KIND OF WEIRD` : 'STILL GROWING. STILL WONDERFULLY YOU.'}</span><strong>{points} XP <ArrowRight size={15} /></strong><i><b style={{ width: `${STAGES[stage + 1] ? (points - STAGES[stage].xp) / (STAGES[stage + 1].xp - STAGES[stage].xp) * 100 : 100}%` }} /></i></button><section className="today-habits"><div className="section-heading"><h2>Today's little commitments.</h2><button className="text-button" onClick={() => setForm('new')}><Plus size={16} />Add habit</button></div><div className="daily-summary"><span>{fixed.length ? `${dueCount} OF ${fixed.length} SCHEDULED HABITS STAMPED` : 'NO FIXED-DAY HABITS DUE TODAY'}</span><span>ONE TAP. THAT'S IT.</span></div>{!activeHabits.length ? <Empty title="A blank page. A good place to start." text="Choose one small habit. We'll keep a place for every time you show up."><button className="primary-button" onClick={() => setForm('new')}>Add your first habit<Plus size={18} /></button></Empty> : !fixed.length ? <div className="quiet-state"><Sun size={24} /><p>No fixed commitments today.<br />Your unscheduled days count as rest.</p></div> : <div className="ticket-list">{fixed.map((habit, index) => <HabitTicket key={habit.id} habit={habit} data={data} now={now} index={index} complete={(h) => void complete(h, today())} select={() => goal(habit.id)} />)}</div>}</section>{flexible.length > 0 && <section className="flexible-section"><div className="section-heading"><h2>At your own pace.</h2><span>THIS WEEK / MON–SUN</span></div><p className="section-intro">A weekly goal. You choose the days.</p><div className="ticket-list">{flexible.map((habit, index) => <HabitTicket key={habit.id} habit={habit} data={data} now={now} index={fixed.length + index} complete={(h) => void complete(h, today())} select={() => goal(habit.id)} />)}</div></section>}{activeHabits.length > relevant.length && <section className="not-today"><h2>Resting today. Still part of the plan.</h2>{activeHabits.filter(h => !relevant.includes(h)).map(h => <button key={h.id} onClick={() => goal(h.id)}><Icon name={h.icon} size={16} /><span>{h.title}</span><ArrowRight size={15} /></button>)}</section>}{todayPlans.length > 0 && <section className="today-plans">
            <div className="section-heading"><h2>Today’s one-off plans</h2></div>
            <div className="evening-actions">{todayPlans.map(plan => <PlanCheck key={plan.id} plan={plan} toggle={togglePlan} />)}</div>
          </section>}<button className="outline-button evening-entry" onClick={() => setEvening(true)}>A moment for today & tomorrow<ArrowRight size={16} /></button><p className="page-footnote">Slow is still forward. Moris agrees.</p>{!installed && !installDismissed && data.completions.length > 0 && <aside className="install-nudge"><div><strong>A little closer to home.</strong><p>Add Moris to your Home Screen for easy offline visits.</p></div><button className="text-button" onClick={() => setInstallHelp(true)}>Show me<ArrowRight size={15} /></button><button className="icon-button" aria-label="Dismiss installation suggestion" onClick={() => setInstallDismissed(true)}><X size={16} /></button></aside>}</>}
          {tab === 'Progress' && <>
            <Progress data={data} now={now} selected={selected} select={goal} edit={setForm} correct={(habit, day) => setCorrection({ habit, day })} />
            {!selected && <PlansProgress plans={data.plans} now={now} toggle={togglePlan} edit={setEditingPlan} />}
          </>}
          {tab === 'Moris' && <><PageTitle kicker="A FICTIONAL METAMORPHOSIS. A REAL LITTLE EFFORT." title="Still becoming." description="Every repetition changes you. And this little weirdo." /><div className="evolution-portrait"><Moris stage={stage} happy={happy} appearance={data.settings} motion={motion.kind} motionKey={motion.key} /><div><p className="eyebrow">YOUR CURRENT EDITION</p><h2>{STAGES[stage].name}</h2><p>{STAGES[stage].description}</p><strong>{points} XP</strong></div></div><button className="outline-button companion-customize" onClick={() => setCustomizing(true)}>Make this Moris yours<ArrowRight size={16} /></button><EvolutionProgress points={points} /><div className="evolution-ladder">{STAGES.map((item, i) => <article className={i <= stage ? 'unlocked' : 'locked'} key={item.name}><span className="edition-number">ED. 0{i + 1}</span><Moris stage={i} appearance={data.settings} /><div><h3>{item.name}</h3><span>{item.xp} XP · {i <= stage ? 'Unlocked' : 'Still to come'}</span><p>{item.description}</p></div>{i <= stage && <Check size={19} />}</article>)}</div><p className="page-footnote">A missed day never takes away earned XP. Undoing an entry recalculates it.</p></>}
          {tab === 'Settings' && <><PageTitle kicker="MAKE YOURSELF AT HOME" title="The little details." description="Your habits. Your pace. Your preferences." /><section className="settings-section"><h2>Your own little weirdo.</h2><p>Choose your Moris’s color and one little quirk. They stay with every evolution.</p><button className="outline-button" onClick={() => setCustomizing(true)}>Choose your Moris<ArrowRight size={16} /></button></section><ReminderSettings controls={reminders} /><section className="settings-section"><h2>A little more delight.</h2><label className="setting-toggle"><span><strong>Completion sounds</strong><small>A soft pop and a tiny chime. Off by default.</small></span><input type="checkbox" checked={data.settings.soundEnabled} onChange={e => void change(current => ({ ...current, settings: { ...current.settings, soundEnabled: e.target.checked } })).catch(e => report(e.message))} /></label><label className="setting-toggle"><span><strong>Extra animations</strong><small>Your device's reduced-motion preference always comes first.</small></span><input type="checkbox" checked={data.settings.animationsEnabled} onChange={e => void change(current => ({ ...current, settings: { ...current.settings, animationsEnabled: e.target.checked } })).catch(e => report(e.message))} /></label></section><section className="settings-section"><h2>Your habits live here.</h2><p>Everything is saved on this device. Clearing browser data, removing the app, or losing your device can erase your records. There is no automatic cloud backup or sync.</p><div className="backup-actions"><button className="primary-button" onClick={() => { downloadBackup(data); report('Your JSON backup is ready to save. Keep it somewhere safe.'); }}><ArrowDownToLine size={18} />Export backup</button><button className="outline-button" onClick={() => fileRef.current?.click()}><ArrowUpFromLine size={18} />Restore backup</button></div><input ref={fileRef} type="file" className="sr-only" accept="application/json,.json" aria-label="Choose Moris backup file" onChange={e => { const file = e.target.files?.[0]; if (file) void importFile(file); e.target.value = ''; }} />{safetyBackup && <button className="text-button" onClick={() => downloadBackup(safetyBackup, 'moris-safety-copy')}>Download the safety copy from your last restore<ArrowDownToLine size={15} /></button>}<p className="small-note">Restoring replaces current records after downloading a fresh backup. A safety copy also stays on this device.</p></section><section className="settings-section"><h2>A place on your Home Screen.</h2><p>{installed ? 'Moris is running as an installed app. Make yourself at home.' : 'Add Moris to your Home Screen. After the first successful load, your habits work without an internet connection.'}</p><button className="outline-button" onClick={() => setInstallHelp(true)}><Plus size={17} />{installed ? 'Installation help' : 'Add to Home Screen'}</button></section><section className="settings-section"><div className="section-heading"><h2>All your little commitments.</h2><button className="text-button" onClick={() => setForm('new')}>Add<Plus size={15} /></button></div>{data.habits.map(h => <div className="manage-habit" key={h.id}><Icon name={h.icon} /><span><strong>{h.title}</strong><small>{h.archivedAt ? `Archived ${formatDay(h.archivedOn!)}` : scheduleLabel(revisionAt(data.revisions, h.id, now)?.schedule || { type: 'daily' })}</small></span>{h.archivedAt ? <button className="text-button" onClick={() => goal(h.id)}>History</button> : <><button className="icon-button" onClick={() => setForm(h)} aria-label={`Edit ${h.title}`}><Pencil size={17} /></button><button className="text-button" onClick={() => setArchive(h)}>Archive</button></>}</div>)}</section><p className="page-footnote">MORIS / FIRST EDITION · ENGLISH · MADE FOR REPEATING</p></>}
        </main><footer className="workspace-footer"><span>EVERY REPETITION CHANGES YOU.</span><span>{pending ? 'SAVING TO THIS DEVICE…' : 'SAVED ON THIS DEVICE'}</span></footer>
      </div><nav className="bottom-nav" aria-label="Mobile navigation">{(['Today', 'Progress', 'Moris', 'Settings'] as Tab[]).map(name => { const Glyph = tabIcons[name]; return <button key={name} onClick={() => go(name)} aria-current={tab === name ? 'page' : undefined}><Glyph size={20} /><span>{name}</span></button>; })}</nav>
    </>}
    {notice && <div className="toast" role="status"><Check size={17} /><span>{notice}</span>{lastAction && <button onClick={() => { const action = lastAction; setLastAction(null); void complete(action.habit, action.day); }}>Undo</button>}<button className="toast-close" onClick={() => { setNotice(''); setLastAction(null); }} aria-label="Dismiss message"><X size={16} /></button></div>}
    {customizing && <Dialog title="One Moris. Yours." close={() => setCustomizing(false)} className="companion-dialog"><CompanionEditor stage={stage} appearance={data.settings} onSave={async appearance => { await change(current => ({ ...current, settings: { ...current.settings, ...appearance } })); setCustomizing(false); report('Your color. Your little quirk. Your Moris.'); animateMoris('greet'); }} /></Dialog>}
    {evening && <EveningReview data={data} now={now} complete={(habit) => void complete(habit, now)} togglePlan={togglePlan} close={() => setEvening(false)} finish={() => { void reminders.dismissToday().catch(e => report(e.message)); setEvening(false); }} />}
    {form && <HabitForm habit={typeof form === 'string' ? undefined : form} snapshot={data} now={now} close={() => setForm(null)} saved={() => {}} report={report} />}
    {editingPlan && <Dialog title="Edit one-off plan" close={() => setEditingPlan(null)}><PlanForm now={now} plan={editingPlan} close={() => setEditingPlan(null)} /></Dialog>}
    {correction && <Dialog title={correction.day === now ? 'Today’s little record.' : 'A little correction.'} close={() => setCorrection(null)}><p className="dialog-kicker">{correction.habit.title}</p><h3 className="correction-date">{formatDay(correction.day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3><p>{completedOn(data.completions, correction.habit.id, correction.day) ? 'This date is marked complete. Removing it recalculates XP and streaks.' : `This will record a ${correction.day === now ? 'completion for today' : 'retrospective completion'}. It earns 10 XP, once for this habit and date.`}</p>{completedOn(data.completions, correction.habit.id, correction.day) && <p className="small-note">Recorded in {data.completions.find(c => c.habitId === correction.habit.id && c.localDate === correction.day)?.timeZone}. Travel never shifts this historical date.</p>}<button className="primary-button" onClick={() => { void complete(correction.habit, correction.day); setCorrection(null); }}>{completedOn(data.completions, correction.habit.id, correction.day) ? 'Remove completion' : 'Mark as done'}<Check size={18} /></button></Dialog>}
    {archive && <Dialog title="Give this one a rest?" close={() => setArchive(null)}><p><strong>{archive.title}</strong> will leave Today. Its history and earned XP stay with you.</p><button className="primary-button" onClick={() => { void change(current => ({ ...current, habits: current.habits.map(h => h.id === archive.id ? { ...h, archivedAt: new Date().toISOString(), archivedOn: now } : h) })).then(() => { setArchive(null); report('Archived. A little rest, with all your progress kept.'); }).catch(e => report(e.message)); }}>Archive habit<ArrowRight size={17} /></button></Dialog>}
    {imported && <Dialog title="Bring your little world back." close={() => setImported(null)}><p>This backup contains <strong>{imported.habits.length} habits</strong> and <strong>{imported.completions.length} completions</strong>.</p><p>It will replace your current records. First, Moris will download a backup of what is here now and store a safety copy on this device.</p><button className="primary-button" onClick={() => void restore()}>Back up & replace records<RefreshCw size={17} /></button><button className="text-button" onClick={() => setImported(null)}>Keep my current records</button></Dialog>}
    {celebration !== null && <Dialog title="A new kind of weird." close={() => setCelebration(null)} className="celebration"><EvolutionScene key={celebration} from={celebrationFrom.current} to={celebration} appearance={data.settings} quiet={!data.settings.animationsEnabled} /><p className="eyebrow">EDITION 0{celebration + 1} UNLOCKED</p><h3>{STAGES[celebration].name}</h3><p>{STAGES[celebration].description}</p><button className="primary-button" onClick={() => setCelebration(null)}>Keep showing up<ArrowRight size={18} /></button></Dialog>}
    {installHelp && <Dialog title="A little closer to home." close={() => setInstallHelp(false)}>{installEvent ? <><p>Install Moris for a place on your Home Screen and a clean app window.</p><button className="primary-button" onClick={() => { void installEvent.prompt().then(() => installEvent.userChoice).then(choice => { if (choice.outcome === 'accepted') setInstallHelp(false); setInstallEvent(null); }).catch(() => report('Use your browser menu to add Moris to your Home Screen.')); }}>Install Moris<Plus size={18} /></button></> : <><h3>On iPhone or iPad</h3><p>Open Moris in Safari. Tap <strong>Share</strong>, choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>. If needed, find Share in Safari’s menu.</p><h3>On Android</h3><p>Open Moris in Chrome. Open the browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p></>}<p className="small-note">Load Moris once while connected so offline setup can finish. Installation availability depends on your browser.</p></Dialog>}
    {update && <div className="update-banner"><span>A fresh edition of Moris is ready.</span><button disabled={pending > 0} onClick={() => { void writesFinished().then(() => updateRef.current?.(true)).catch(e => report(e.message)); }}>Save & update<RefreshCw size={14} /></button><button aria-label="Update later" onClick={() => setUpdate(false)}><X size={16} /></button></div>}
  </div>;
}

function EveningReview({ data, now, complete, togglePlan, close, finish }: { data: Snapshot; now: Day; complete: (habit: Habit) => void; togglePlan: (plan: OneOffPlan) => void; close: () => void; finish: () => void }) {
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [addingPlan, setAddingPlan] = useState(false);
  const [savedPlanDate, setSavedPlanDate] = useState<Day | null>(null);
  const addPlanButton = useRef<HTMLButtonElement>(null);
  const remaining = new Set(remainingForReminder(data, now).map(habit => habit.id));
  const habits = data.habits.map(habit => ({ habit, done: completedOn(data.completions, habit.id, now), key: `${now}:${habit.id}` }))
    .filter(({ habit, done, key }) => done || remaining.has(habit.id) || reviewed.includes(key));
  const tomorrow = addDays(now, 1);
  const planned = data.habits.filter(habit => { const revision = revisionAt(data.revisions, habit.id, tomorrow); return activeOn(habit, tomorrow) && revision && scheduled(revision.schedule, tomorrow); });
  const todayPlans = data.plans.filter(plan => plan.date === now);
  const tomorrowPlans = data.plans.filter(plan => plan.date === tomorrow);
  const closePlanForm = () => { setAddingPlan(false); addPlanButton.current?.focus(); };
  return <Dialog title="A little moment for you." close={close} className="evening-review">
    <p>Whatever today held, you’re welcome here. Mark what you did, then leave a little room for tomorrow.</p>
    <section>
      <h3>Today, in little wins.</h3>
      {habits.length ? <div className="evening-actions">{habits.map(({ habit, done, key }) => (
        <button key={key} type="button" className="outline-button" aria-pressed={done} aria-label={`${habit.title} completed today`} onClick={() => {
          // Keep corrected entries available even if they are outside today's reminder prompts.
          setReviewed(current => current.includes(key) ? current : [...current, key]);
          complete(habit);
        }}>
          {done ? <Check size={17} aria-hidden="true" /> : <Plus size={17} aria-hidden="true" />}
          <span>{habit.title}{done && <small> · Undo</small>}</span>
        </button>
      ))}</div> : !todayPlans.length && <p className="small-note">Nothing needs checking in today.</p>}
    </section>
    {todayPlans.length > 0 && <section>
      <h3>Today’s one-off plans</h3>
      <div className="evening-actions">{todayPlans.map(plan => <PlanCheck key={plan.id} plan={plan} toggle={togglePlan} />)}</div>
    </section>}
    <section>
      <h3>A little look at tomorrow.</h3>
      {planned.length + tomorrowPlans.length > 0 && <ul className="evening-list">
        {planned.map(habit => <li key={`habit:${habit.id}`}><Icon name={habit.icon} size={17} /><span>{habit.title}</span>{revisionAt(data.revisions, habit.id, tomorrow)?.schedule.type === 'weekly_target' && <small>At your own pace this week</small>}</li>)}
        {tomorrowPlans.map(plan => <li key={`plan:${plan.id}`}><span>{plan.title}</span><small>One-off plan</small></li>)}
      </ul>}
      <button ref={addPlanButton} type="button" className="text-button" aria-expanded={addingPlan} onClick={() => { setSavedPlanDate(null); setAddingPlan(open => !open); }}><Plus size={16} />Add a one-off plan</button>
      {addingPlan && <PlanForm now={now} close={closePlanForm} saved={setSavedPlanDate} />}
      <div role="status">{savedPlanDate && <p className="small-note">Plan saved for {formatDay(savedPlanDate, { weekday: 'short', month: 'short', day: 'numeric' })}.</p>}</div>
    </section>
    <button className="primary-button" onClick={finish}>That’s enough for today<ArrowRight size={17} /></button>
    <p className="small-note">Unfinished goals stay unchanged. No more reminder for today once this choice syncs.</p>
  </Dialog>;
}

function EvolutionProgress({ points }: { points: number }) {
  const stage = stageOf(points), current = STAGES[stage], next = STAGES[stage + 1];
  const wins = next ? Math.ceil((next.xp - points) / 10) : 0;
  return <section className="next-evolution" aria-label="Next Moris evolution">{next ? <>
    <div><p className="eyebrow">THE NEXT KIND OF WEIRD</p><h2>{next.name}</h2><p>{wins} little {wins === 1 ? 'win' : 'wins'} away. One completion = 10 XP.</p></div>
    <strong>{points} / {next.xp} XP</strong>
    <div className="next-evolution-meter" role="progressbar" aria-label="Progress toward next evolution" aria-valuemin={current.xp} aria-valuemax={next.xp} aria-valuenow={points}><i style={{ width: `${(points - current.xp) / (next.xp - current.xp) * 100}%` }} /></div>
  </> : <><div><p className="eyebrow">SEVEN EDITIONS. STILL YOU.</p><h2>Infinite potential. Tiny daily steps.</h2><p>Keep collecting the little wins. Your XP and history keep growing.</p></div><Sparkles size={28} /></>}</section>;
}

function playSound() {
  try { const Audio = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!Audio) return; const context = new Audio(); const gain = context.createGain(); gain.gain.setValueAtTime(0.045, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.24); gain.connect(context.destination); const oscillator = context.createOscillator(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(560, context.currentTime); oscillator.frequency.exponentialRampToValueAtTime(850, context.currentTime + 0.12); oscillator.connect(gain); oscillator.start(); oscillator.stop(context.currentTime + 0.25); oscillator.onended = () => void context.close(); } catch { /* The visible completion state remains the reward when audio is unavailable. */ }
}
