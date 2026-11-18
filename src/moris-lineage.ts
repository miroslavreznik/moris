import { evolutionDescription, type EvolutionForm } from './evolution';

export type LineagePalette = { body: string; shade: string; highlight: string; infinite: string };
/** Fixed lines use their authored stage description, without mixed anatomy. */
export function lineageChange(form: EvolutionForm): string { return evolutionDescription(form.stage, form.branch); }
