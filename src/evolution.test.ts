import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, STAGES, type Settings } from './domain';
import {
  BRANCH_LABELS, EVOLUTION_BRANCHES, chooseEvolution, choiceForStage,
  evolutionDescription, evolutionForm, evolutionLabel, evolutionLevels,
  evolutionStateOf, nextEvolutionStage, parseEvolutionState,
  previewEvolution, selectedEvolutionLine,
} from './evolution';

const fresh = (): Settings => ({ ...DEFAULT_SETTINGS, evolutionChoices: [] });

describe('one fixed evolution line', () => {
  it('offers a first choice only after reaching the first milestone', () => {
    const settings = fresh();
    expect(selectedEvolutionLine(settings)).toBeNull();
    expect(nextEvolutionStage(settings, 0)).toBeNull();
    expect(nextEvolutionStage(settings, 1)).toBe(1);
    expect(nextEvolutionStage(settings, 6)).toBe(1);
    expect(evolutionForm(settings, 6)).toEqual({ stage: 0 });
    expect(settings.evolutionChoices).toEqual([]);
  });

  it('supports four lines and automatically follows the selected line at every XP level', () => {
    expect(EVOLUTION_BRANCHES).toEqual(['classic', 'zoology', 'origami', 'botanic']);
    for (const branch of EVOLUTION_BRANCHES) {
      const settings = chooseEvolution(fresh(), 1, branch, 6);
      expect(settings.evolutionLine).toBe(branch);
      expect(settings.evolutionChoices).toEqual([{ stage: 1, branch }]);
      for (let stage = 0; stage <= 6; stage++) {
        expect(evolutionForm(settings, stage)).toEqual({ stage, branch });
        expect(nextEvolutionStage(settings, stage)).toBeNull();
      }
      expect(settings.evolutionChoices).toHaveLength(1);
    }
  });

  it('saves the selection once and refuses changing lines at later milestones', () => {
    const settings = chooseEvolution(fresh(), 1, 'botanic', 1);
    expect(chooseEvolution(settings, 1, 'botanic', 6)).toBe(settings);
    expect(chooseEvolution(settings, 6, 'botanic', 6)).toBe(settings);
    expect(() => chooseEvolution(settings, 2, 'origami', 6)).toThrow('already been chosen');
    expect(() => chooseEvolution(settings, 6, 'classic', 6)).toThrow('already been chosen');
    expect(settings.evolutionChoices).toEqual([{ stage: 1, branch: 'botanic' }]);
  });

  it('keeps the line through undo, returning to the seed, re-unlocking and reload', () => {
    const selected = chooseEvolution(fresh(), 1, 'origami', 6);
    const saved = parseEvolutionState(JSON.parse(JSON.stringify(selected)), { requireLine: true });
    for (const stage of [6, 5, 2, 0, 1, 6]) {
      expect(evolutionForm(saved, stage)).toEqual({ stage, branch: 'origami' });
      expect(nextEvolutionStage(saved, stage)).toBeNull();
    }
    expect(saved.evolutionChoices).toEqual(selected.evolutionChoices);
  });

  it('previews an entire candidate fixed line without changing the selected line or old history', () => {
    const settings = { ...chooseEvolution(fresh(), 1, 'zoology', 6), evolutionChoices: [{ stage: 1, branch: 'zoology' as const }, { stage: 6, branch: 'botanic' as const }] };
    const before = structuredClone(settings);
    expect(previewEvolution(settings, 4, 'origami')).toEqual({ stage: 4, branch: 'origami' });
    expect(previewEvolution(settings, 0, 'classic')).toEqual({ stage: 0, branch: 'classic' });
    expect(settings).toEqual(before);
    expect(evolutionForm(settings, 6)).toEqual({ stage: 6, branch: 'zoology' });
    expect(evolutionLevels(evolutionForm(settings, 6))).toEqual({ classic: 0, zoology: 6, origami: 0, botanic: 0 });
  });

  it('rejects locked, invalid and out-of-range selections', () => {
    for (const stage of [-1, 0, 1.5, 7]) expect(() => chooseEvolution(fresh(), stage, 'classic', 6)).toThrow('stages');
    expect(() => chooseEvolution(fresh(), 4, 'classic', 3)).toThrow('unlocked');
    expect(() => chooseEvolution(fresh(), 1, 'other' as 'classic', 6)).toThrow('valid evolution line');
    expect(() => chooseEvolution(fresh(), 1, 'classic', 7)).toThrow('unlocked');
  });

  it('can select a line beside archived prototype history without duplicating a milestone', () => {
    const settings = { ...fresh(), evolutionChoices: [{ stage: 1, branch: 'zoology' as const }] };
    const selected = chooseEvolution(settings, 1, 'classic', 6);
    expect(selected.evolutionLine).toBe('classic');
    expect(selected.evolutionChoices).toEqual(settings.evolutionChoices);
    expect(parseEvolutionState(selected, { requireLine: true })).toMatchObject({ evolutionLine: 'classic' });
    expect(evolutionForm(selected, 6)).toEqual({ stage: 6, branch: 'classic' });
  });
});

describe('legacy and prototype compatibility', () => {
  it('retains the original legacy form until a voluntary fixed-line selection', () => {
    const migrated = { ...fresh(), ...evolutionStateOf(undefined, 4), morisColor: 'lagoon' as const, morisDetail: 'antenna' as const, celebratedStage: 4 };
    expect(evolutionForm(migrated, 4)).toEqual({ stage: 4 });
    expect(evolutionForm(migrated, 2)).toEqual({ stage: 2 });
    expect(nextEvolutionStage(migrated, 4)).toBeNull();
    expect(nextEvolutionStage(migrated, 5)).toBe(5);
    const adopted = chooseEvolution(migrated, 4, 'classic', 4);
    expect(evolutionForm(adopted, 4)).toEqual({ stage: 4, branch: 'classic' });
    expect(evolutionForm(adopted, 6)).toEqual({ stage: 6, branch: 'classic' });
    expect(adopted).toMatchObject({ evolutionLine: 'classic', morisColor: 'lagoon', morisDetail: 'antenna', celebratedStage: 4, evolutionLegacyStage: 4 });
    expect(nextEvolutionStage(adopted, 6)).toBeNull();
  });

  it('migrates mixed v5 history using its earliest recorded direction and retains every old record', () => {
    const old = { evolutionChoices: [{ stage: 6, branch: 'botanic' }, { stage: 2, branch: 'origami' }, { stage: 4, branch: 'zoology' }], evolutionLegacyStage: 1 };
    const before = structuredClone(old);
    const migrated = evolutionStateOf(old, 1);
    expect(migrated).toEqual({ evolutionLine: 'origami', evolutionChoices: [{ stage: 2, branch: 'origami' }, { stage: 4, branch: 'zoology' }, { stage: 6, branch: 'botanic' }], evolutionLegacyStage: 1 });
    expect(evolutionForm(migrated, 1)).toEqual({ stage: 1, branch: 'origami' });
    expect(evolutionForm(migrated, 6)).toEqual({ stage: 6, branch: 'origami' });
    expect(nextEvolutionStage(migrated, 6)).toBeNull();
    expect(choiceForStage(migrated, 6)).toEqual({ stage: 6, branch: 'botanic' });
    expect(old).toEqual(before);
  });

  it('honors an explicitly saved line over old mixed history and preserves explicit null', () => {
    const saved = { evolutionLine: 'classic' as const, evolutionChoices: [{ stage: 1, branch: 'botanic' as const }], evolutionLegacyStage: 0 };
    expect(parseEvolutionState(saved, { requireLine: true })).toEqual(saved);
    expect(evolutionForm(saved, 6)).toEqual({ stage: 6, branch: 'classic' });
    expect(selectedEvolutionLine({ ...saved, evolutionLine: null })).toBeNull();
    expect(evolutionStateOf({}, 5)).toEqual({ evolutionLine: null, evolutionChoices: [], evolutionLegacyStage: 5 });
    expect(() => evolutionStateOf({ evolutionChoices: [] }, 5)).toThrow('legacy evolution');
  });

  it('rejects malformed current line settings and invalid historical choices', () => {
    const base = { evolutionLine: null, evolutionChoices: [], evolutionLegacyStage: 0 };
    expect(() => parseEvolutionState({ evolutionChoices: [], evolutionLegacyStage: 0 }, { requireLine: true })).toThrow('evolution line');
    for (const evolutionLine of ['', 'unknown', [], {}, 1, false]) expect(() => parseEvolutionState({ ...base, evolutionLine })).toThrow('evolution line');
    for (const evolutionChoices of [null, {}, [{ stage: 0, branch: 'zoology' }], [{ stage: 7, branch: 'botanic' }], [{ stage: 1.5, branch: 'origami' }], [{ stage: 1, branch: 'unknown' }], [{ stage: 1, branch: 'zoology' }, { stage: 1, branch: 'zoology' }]]) {
      expect(() => parseEvolutionState({ ...base, evolutionChoices })).toThrow(/evolution/i);
    }
    for (const evolutionLegacyStage of [-1, 7, 1.5, null, '2']) expect(() => parseEvolutionState({ ...base, evolutionLegacyStage })).toThrow('legacy evolution');
  });

  it('provides seven forms for each fixed line while preserving every classic stage name', () => {
    for (const branch of EVOLUTION_BRANCHES) for (let stage = 0; stage <= 6; stage++) {
      expect(BRANCH_LABELS[branch]).toBeTruthy();
      expect(evolutionLabel(stage, branch)).toBeTruthy();
      expect(evolutionDescription(stage, branch)).toBeTruthy();
    }
    const allNames = EVOLUTION_BRANCHES.flatMap(branch => STAGES.map((_, stage) => evolutionLabel(stage, branch)));
    expect(new Set(allNames).size).toBe(28);
    for (let stage = 0; stage <= 6; stage++) {
      expect(evolutionLabel(stage, 'classic')).toBe(STAGES[stage].name);
      expect(evolutionLabel(stage)).toBe(STAGES[stage].name);
      expect(evolutionDescription(stage, 'classic')).toBe(STAGES[stage].description);
    }
  });
});
