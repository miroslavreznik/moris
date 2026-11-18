import { DEFAULT_SETTINGS, STAGES, addDays, today, type Settings, type Snapshot } from './domain';

/** Synthetic records for the separate development-only evolution database. */
export function createEvolutionLabSnapshot(stage = 0, settings?: Partial<Settings>): Snapshot {
  const selected = Math.min(STAGES.length - 1, Math.max(0, Math.trunc(Number.isFinite(stage) ? stage : 0)));
  const now = today(), startDate = addDays(now, -250), habitId = 'evolution-lab-practice';
  return {
    habits: [{ id: habitId, title: 'Lab daily practice', icon: 'spark', color: '#1839d5', startDate, createdAt: `${startDate}T12:00:00Z` }],
    revisions: [{ id: 'evolution-lab-schedule', habitId, effectiveFrom: startDate, schedule: { type: 'daily' } }],
    completions: Array.from({ length: STAGES[selected].xp / 10 }, (_, index) => {
      const day = addDays(now, -index - 1);
      return { id: `${habitId}:${day}`, habitId, localDate: day, timeZone: 'Europe/Budapest', createdAt: `${day}T12:00:00Z` };
    }),
    plans: [],
    settings: { ...DEFAULT_SETTINGS, ...settings, evolutionChoices: settings?.evolutionChoices?.map(choice => ({ ...choice })) ?? [] },
    onboardingComplete: true,
  };
}
