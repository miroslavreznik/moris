import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { STAGES, type Settings } from './domain';
import { BRANCH_LABELS, EVOLUTION_BRANCHES, evolutionDescription, evolutionLabel, evolutionForm, previewEvolution, type EvolutionBranch } from './evolution';
import { Moris } from './Moris';
import './evolution.css';

export function EvolutionChooser({ stage, settings, choose, later }: { stage: number; settings: Settings; choose: (branch: EvolutionBranch) => Promise<void>; later: () => void }) {
  const current = evolutionForm(settings, stage);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function select(branch: EvolutionBranch) {
    setBusy(true); setError('');
    try { await choose(branch); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Your choice could not be saved.'); setBusy(false); }
  }
  return <div className="evolution-chooser">
    <p className="dialog-kicker">FOUR LINES · ONE LITTLE FRIEND</p>
    <p>Choose your Moris once. All six transformations follow this line as you earn XP. Each final form has a holographic finish.</p>
    <div className="evolution-current"><Moris {...current} appearance={settings} motion="still" decorative /><div><p className="eyebrow">YOUR MORIS SO FAR</p><p>Your habits, XP and personal color stay with you.</p></div></div>
    <div className="evolution-choices">
      {EVOLUTION_BRANCHES.map(branch => <article className={`evolution-choice evolution-choice-${branch}`} key={branch}>
        <Moris {...previewEvolution(settings, stage, branch)} appearance={settings} motion="still" />
        <div className="evolution-choice-copy"><span className="eyebrow">{branch === 'classic' ? 'DNES · THE ORIGINAL LINE' : 'SIX AUTHORED TRANSFORMATIONS'}</span><h3>{BRANCH_LABELS[branch]}</h3><p>{evolutionDescription(stage, branch)}</p><span className="evolution-keeps">One fixed line, from the first form to the last</span></div>
        <details className="evolution-line-preview"><summary>See this whole line</summary><div>{STAGES.map((item, index) => <figure key={index}><Moris stage={index} branch={branch} appearance={settings} decorative /><figcaption><strong>{evolutionLabel(index, branch)}</strong><span>{item.xp} XP</span></figcaption></figure>)}</div></details>
        <button type="button" className="primary-button" disabled={busy} aria-label={`Choose ${branch}`} onClick={() => void select(branch)}>{busy ? 'Saving…' : `Choose ${BRANCH_LABELS[branch]}`}<ArrowRight size={16} aria-hidden="true" /></button>
      </article>)}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="button" className="text-button evolution-later" disabled={busy} onClick={later}>Choose later</button>
    <p className="small-note">This is your permanent evolution line. Future milestones unlock automatically; there are no mixed forms.</p>
  </div>;
}
