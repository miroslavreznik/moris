import { STAGES, type Settings } from './domain';

export const EVOLUTION_BRANCHES = ['classic', 'zoology', 'origami', 'botanic'] as const;
export type EvolutionBranch = typeof EVOLUTION_BRANCHES[number];
/** Retained as importable history from the earlier branching prototype. */
export type EvolutionChoice = { stage: number; branch: EvolutionBranch };
export const MAX_EVOLUTION_STAGE = 6;
export const BRANCH_LABELS: Record<EvolutionBranch, string> = {
  classic: 'Original Moris', zoology: 'Odd Zoology', origami: 'Paper Life', botanic: 'Botanic Creature',
};
export type EvolutionState = Pick<Settings, 'evolutionLine' | 'evolutionChoices' | 'evolutionLegacyStage'>;
// Older descriptor fields stay type-compatible with imported preview tools.
// Fixed-line rendering uses only stage and branch.
export type EvolutionForm = { stage: number; branch?: EvolutionBranch; inheritedBranch?: EvolutionBranch; evolutionPath?: readonly EvolutionChoice[]; baseStage?: number };

const formNames: Record<EvolutionBranch, readonly string[]> = {
  classic: STAGES.map(stage => stage.name),
  zoology: ['Droplet Moris', 'Tidal Moris', 'Tripod Moris', 'Crawler Moris', 'Sailfin Moris', 'Manta Moris', 'Infinity Moris'],
  origami: ['Pyramid Moris', 'Concertina Moris', 'Paper Strider Moris', 'Wingfold Moris', 'Kite Moris', 'Ribbon Moris', 'Grand Rosette Moris'],
  botanic: ['Seed Moris', 'Sprout Moris', 'Bud Moris', 'Blossom Moris', 'Chalice Moris', 'Canopy Bloom Moris', 'Grand Bloom Moris'],
};
const formDescriptions: Record<EvolutionBranch, readonly string[]> = {
  classic: STAGES.map(stage => stage.description),
  zoology: [
    'A little teardrop with its familiar eye and a wonderfully odd future.',
    'A long swimming body and cobalt fins discover a new kind of motion.',
    'Three crooked legs find an entirely new way to stand.',
    'A long six-legged body keeps every little step moving.',
    'Its long body broadens, and six little legs begin to open into connected sailing fins.',
    'Its body opens into a generous, floating manta shape.',
    'A living infinity loop, with the same familiar eye and smile.',
  ],
  origami: [
    'A tiny folded beginning, orange on one side and cobalt on the other.',
    'The little paper body opens into a long concertina.',
    'A compact folded creature discovers its pointed supports.',
    'Its folded shoulders open into a larger winged silhouette.',
    'One folded keel opens into a broad, continuous kite, with its lower fold beginning to turn back.',
    'One continuous ribbon twists into an open paper loop.',
    'One interwoven ribbon unfolds into a grand sixfold rosette around a clear open centre.',
  ],
  botanic: [
    'A small living seed carries the familiar Moris face.',
    'The first leaves rise while little roots find their feet.',
    'A closed petal bud cups the same little centre, ready to open into a flower.',
    'The bud opens its eight petals around the same familiar centre and curling roots.',
    'The open flower grows into a cupped blossom, its broad petals beginning to curve over the roots.',
    'The same petal cup spreads into an overhanging bloom above long trailing roots.',
    'Layered petals unfold into a grand blossom, carried by the same roots as they form sweeping supports.',
  ],
};

function boundedStage(stage: number): number { return Number.isFinite(stage) ? Math.min(MAX_EVOLUTION_STAGE, Math.max(0, Math.floor(stage))) : 0; }
export function isEvolutionBranch(value: unknown): value is EvolutionBranch { return EVOLUTION_BRANCHES.includes(value as EvolutionBranch); }
export function evolutionLabel(stage: number, branch?: EvolutionBranch): string { return formNames[branch ?? 'classic'][boundedStage(stage)]; }
export function evolutionDescription(stage: number, branch?: EvolutionBranch): string { return formDescriptions[branch ?? 'classic'][boundedStage(stage)]; }
export function evolutionGrowth(branch: EvolutionBranch, level: number): string { return evolutionDescription(level, branch); }

/** A missing field is v5; an explicit null means no line has been selected. */
export function selectedEvolutionLine(settings: Partial<EvolutionState>): EvolutionBranch | null {
  if (settings.evolutionLine !== undefined) return settings.evolutionLine;
  return [...settings.evolutionChoices ?? []].sort((a, b) => a.stage - b.stage)[0]?.branch ?? null;
}

export function parseEvolutionState(value: unknown, options: { requireLine?: boolean } = {}): EvolutionState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Evolution settings are missing or invalid.');
  const state = value as Record<string, unknown>;
  if (!Array.isArray(state.evolutionChoices) || state.evolutionChoices.length > MAX_EVOLUTION_STAGE) throw new Error('Evolution choices are missing or invalid.');
  if (!Number.isInteger(state.evolutionLegacyStage) || (state.evolutionLegacyStage as number) < 0 || (state.evolutionLegacyStage as number) > MAX_EVOLUTION_STAGE) throw new Error('The legacy evolution stage is invalid.');
  if ((options.requireLine && state.evolutionLine === undefined) || (state.evolutionLine !== undefined && state.evolutionLine !== null && !isEvolutionBranch(state.evolutionLine))) throw new Error('The evolution line is missing or invalid.');
  const stages = new Set<number>();
  const evolutionChoices: EvolutionChoice[] = state.evolutionChoices.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('An evolution choice is invalid.');
    const choice = value as Record<string, unknown>;
    if (!Number.isInteger(choice.stage) || (choice.stage as number) < 1 || (choice.stage as number) > MAX_EVOLUTION_STAGE || !isEvolutionBranch(choice.branch)) throw new Error('An evolution choice is invalid.');
    const stage = choice.stage as number;
    if (stages.has(stage)) throw new Error('Evolution choices contain a duplicate stage.');
    stages.add(stage);
    return { stage, branch: choice.branch };
  });
  evolutionChoices.sort((a, b) => a.stage - b.stage);
  const evolutionLine = state.evolutionLine === undefined ? evolutionChoices[0]?.branch ?? null : state.evolutionLine as EvolutionBranch | null;
  return { evolutionLine, evolutionChoices, evolutionLegacyStage: state.evolutionLegacyStage as number };
}

export function evolutionStateOf(value: unknown, unlocked: number): EvolutionState {
  const state = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  if (state?.evolutionChoices === undefined && state?.evolutionLegacyStage === undefined) {
    if (state?.evolutionLine !== undefined) throw new Error('Evolution history is missing or invalid.');
    return { evolutionLine: null, evolutionChoices: [], evolutionLegacyStage: boundedStage(unlocked) };
  }
  return parseEvolutionState(value);
}

export function choiceForStage(settings: EvolutionState, stage: number): EvolutionChoice | undefined { return settings.evolutionChoices.find(choice => choice.stage === stage); }
export function nextEvolutionStage(settings: EvolutionState, unlocked: number): number | null {
  if (selectedEvolutionLine(settings) !== null) return null;
  const available = boundedStage(unlocked), next = Math.max(1, settings.evolutionLegacyStage + 1);
  return next <= available ? next : null;
}
export function evolutionForm(settings: EvolutionState, unlocked: number): EvolutionForm {
  const available = boundedStage(unlocked), branch = selectedEvolutionLine(settings);
  return branch ? { stage: available, branch } : { stage: Math.min(settings.evolutionLegacyStage, available) };
}
export function previewEvolution(_settings: EvolutionState, stage: number, branch: EvolutionBranch): EvolutionForm {
  if (!isEvolutionBranch(branch)) throw new Error('Choose a valid evolution line.');
  return { stage: boundedStage(stage), branch };
}
export function chooseEvolution(settings: Settings, stage: number, branch: EvolutionBranch, unlocked: number): Settings {
  if (!Number.isInteger(stage) || stage < 1 || stage > MAX_EVOLUTION_STAGE) throw new Error('Choose a transformation from stages 1–6.');
  if (!isEvolutionBranch(branch)) throw new Error('Choose a valid evolution line.');
  if (!Number.isInteger(unlocked) || unlocked < 0 || unlocked > MAX_EVOLUTION_STAGE || stage > unlocked) throw new Error('This evolution has not been unlocked yet.');
  const existing = selectedEvolutionLine(settings);
  if (existing) {
    if (existing !== branch) throw new Error('Your evolution line has already been chosen.');
    return settings;
  }
  const history = settings.evolutionChoices.some(choice => choice.stage === stage)
    ? settings.evolutionChoices.map(choice => ({ ...choice }))
    : [...settings.evolutionChoices, { stage, branch }].sort((a, b) => a.stage - b.stage);
  return { ...settings, evolutionLine: branch, evolutionChoices: history };
}

/** Compatibility helper: a fixed line has no contribution from other families. */
export function evolutionLevels(form: EvolutionForm): Record<EvolutionBranch, number> {
  const levels: Record<EvolutionBranch, number> = { classic: 0, zoology: 0, origami: 0, botanic: 0 };
  if (form.branch) levels[form.branch] = boundedStage(form.stage);
  return levels;
}
