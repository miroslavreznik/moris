import { useState } from 'react';
import { STAGES, stageOf, xpOf, type Snapshot } from './domain';
import { BRANCH_LABELS, EVOLUTION_BRANCHES, evolutionLabel, evolutionDescription, selectedEvolutionLine, type EvolutionBranch } from './evolution';
import { Moris } from './Moris';
import './evolution-lab.css';

export function EvolutionLab({ data, onSetStage, onReset, onChoose, onSetLine, onCelebrate }: {
  data: Snapshot; onSetStage: (stage: number) => void; onReset: () => void;
  onChoose: (stage: number) => void; onSetLine: (line: EvolutionBranch) => void; onCelebrate: () => void;
}) {
  const points = xpOf(data.completions), stage = stageOf(points), line = selectedEvolutionLine(data.settings);
  const [silhouettes, setSilhouettes] = useState(false);
  return <section className="evolution-lab" aria-label="Local evolution lab">
    <header><p className="eyebrow">LOCAL EVOLUTION LAB</p><h2>Four ways to become Moris.</h2><p className="evolution-lab-version">REFINED TRANSITIONS · 28 NAMED FORMS · HOLOGRAPHIC FINALES</p><p>Try the original “Dnes” line and the three proposals. These controls use fictional history in a separate local database.</p></header>
    <div className="evolution-lab-controls">
      <label>Test stage<select aria-label="Test stage" value={stage} onChange={event => onSetStage(Number(event.target.value))}>{STAGES.map((item, index) => <option key={index} value={index}>Stage {index}{line ? ` · ${evolutionLabel(index, line)}` : ''} · {item.xp} XP</option>)}</select></label>
      <button type="button" disabled={stage >= 6} onClick={() => onSetStage(stage + 1)}>Next milestone</button>
      <button type="button" disabled={!!line || stage === 0} onClick={() => onChoose(stage)}>Choose your line</button>
      <button type="button" disabled={!line || stage === 0} onClick={onCelebrate}>Replay transformation</button>
      <button type="button" onClick={onReset}>Reset test</button>
    </div>
    <p className="evolution-lab-status"><span>TEST DATA</span><output className="evolution-lab-xp" aria-label="Lab XP">{points} XP</output><span>{line ? BRANCH_LABELS[line] : 'No line chosen yet'}</span></p>
    <div className="evolution-lab-lines">{EVOLUTION_BRANCHES.map(branch => <article key={branch} data-lab-line={branch} className={line === branch ? 'is-selected' : ''}>
      <Moris stage={stage} branch={branch} appearance={data.settings} decorative />
      <span className="evolution-lab-line-name">{BRANCH_LABELS[branch]} · Stage {stage}</span><h3>{evolutionLabel(stage, branch)}</h3><p>{evolutionDescription(stage, branch)}</p>
      <button type="button" onClick={() => onSetLine(branch)} aria-pressed={line === branch}>{line === branch ? 'Testing this line' : 'Test this line'}</button>
    </article>)}</div>
    <p className="evolution-lab-note">To see the rainbow foil, select stage 6 and move over a final form. Its sheen also moves gently on its own. You can switch lines freely here in the lab.</p>
    <details className="evolution-lab-gallery"><summary>Compare all 28 forms</summary><p>Every column follows one fixed line from its first shape to the holographic finale.</p>
      <label className="evolution-lab-silhouettes"><input type="checkbox" checked={silhouettes} onChange={event => setSilhouettes(event.target.checked)} />Show body silhouettes</label>
      <div className={`evolution-lab-forms ${silhouettes ? 'is-silhouette' : ''}`}>{STAGES.flatMap((item, index) => EVOLUTION_BRANCHES.map(branch => <article key={`${index}-${branch}`} data-lab-stage={index} data-lab-branch={branch}><Moris stage={index} branch={branch} appearance={data.settings} decorative /><h3>{evolutionLabel(index, branch)}</h3><p>{BRANCH_LABELS[branch]}<br />Stage {index} · {item.xp} XP</p></article>))}</div>
    </details>
  </section>;
}
