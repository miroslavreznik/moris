import { MorisCore } from './MorisCore';
import { ZoologyFixed, zoologyFace } from './MorisZoologyFixed';
import { OrigamiFixed, origamiFace } from './MorisOrigamiFixed';
import { BotanicFixed, botanicFace } from './MorisBotanicFixed';
import { evolutionDescription, type EvolutionBranch } from './evolution';
import type { LineagePalette } from './moris-lineage';

export function morisFormDescription(stage: number, branch?: EvolutionBranch): string { return evolutionDescription(stage, branch); }
export function morisFace(stage: number, branch?: EvolutionBranch) {
  return branch === 'zoology' ? zoologyFace(stage) : branch === 'origami' ? origamiFace(stage) : branch === 'botanic' ? botanicFace(stage) : { x: 102, y: 91, scale: 1 };
}
export function MorisForm({ stage, branch, palette }: { stage: number; branch?: EvolutionBranch; palette: LineagePalette }) {
  return branch === 'zoology' ? <ZoologyFixed stage={stage} palette={palette} />
    : branch === 'origami' ? <OrigamiFixed stage={stage} palette={palette} />
      : branch === 'botanic' ? <BotanicFixed stage={stage} palette={palette} />
        : <MorisCore stage={stage} palette={palette} detail="freckles" hideFace />;
}
