import { type ReactNode } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { STAGES, type Settings } from './domain';
import { BRANCH_LABELS, evolutionDescription, evolutionForm, evolutionLabel, nextEvolutionStage, selectedEvolutionLine, type EvolutionForm } from './evolution';
import { Moris, type MorisMotion } from './Moris';
import './evolution.css';

export function MorisJourney({ settings, unlocked, form, points, happy, motion, motionKey, choose, customize, progress }: {
  settings: Settings; unlocked: number; form: EvolutionForm; points: number; happy: boolean; motion: MorisMotion; motionKey: number;
  choose: (stage: number) => void; customize: () => void; progress: ReactNode;
}) {
  const line = selectedEvolutionLine(settings), pending = nextEvolutionStage(settings, unlocked);
  const canAdopt = !line && unlocked > 0 && pending === null;
  return <>
    <header className="page-title"><p className="eyebrow">A FICTIONAL METAMORPHOSIS. A REAL LITTLE EFFORT.</p><h1>Still becoming.</h1><p className="page-description">One chosen line. Six little transformations.</p></header>
    <div className="evolution-portrait"><Moris {...form} happy={happy} appearance={settings} motion={motion} motionKey={motionKey} /><div><p className="eyebrow">YOUR CURRENT EDITION</p><h2>{evolutionLabel(form.stage, form.branch)}</h2><p>{evolutionDescription(form.stage, form.branch)}</p><p className="journey-branch">{line ? `${BRANCH_LABELS[line]} · Your chosen line` : 'The original Moris · Choose your line when you are ready'}</p><strong>{points} XP</strong>{form.stage === 6 && <p className="journey-foil">HOLOGRAPHIC EDITION · Move over Moris to catch the light</p>}</div></div>
    {(pending !== null || canAdopt) && <section className="evolution-ready"><div><p className="eyebrow">FOUR POSSIBLE LINES</p><h2>Which Moris will grow with you?</h2><p>Pick the original, odd zoology, paper life or botanic creature. Your future milestones follow that line automatically.</p></div><button type="button" className="primary-button" onClick={() => choose(pending ?? unlocked)}>{canAdopt ? 'Choose your direction' : 'Choose your line'}<ArrowRight size={17} /></button></section>}
    <button className="outline-button companion-customize" onClick={customize}>Make this Moris yours<ArrowRight size={16} /></button>
    {progress}
    <div className="section-heading journey-heading"><h2>Your evolution story.</h2><span>{line ? BRANCH_LABELS[line].toUpperCase() : 'YOUR LINE IS STILL TO COME'}</span></div>
    <div className="evolution-ladder evolution-journey">{STAGES.map((milestone, stage) => {
      const reached = stage <= unlocked, hasForm = !!line || stage <= settings.evolutionLegacyStage || stage === 0;
      const descriptor = line ? { stage, branch: line } : evolutionForm(settings, stage);
      return <article className={reached ? 'unlocked' : 'locked'} key={stage} data-journey-stage={stage}><span className="edition-number">ED. 0{stage + 1}</span>
        {hasForm ? <Moris {...descriptor} appearance={settings} /> : <span className="journey-unknown" aria-hidden="true"><Sparkles size={30} /></span>}
        <div><h3>{hasForm ? evolutionLabel(stage, descriptor.branch) : 'Four possible lines'}</h3><span>{milestone.xp} XP · {reached ? 'Reached' : 'Still to come'}</span><p>{hasForm ? evolutionDescription(stage, descriptor.branch) : 'Choose one line. The rest of its transformations will follow as you earn XP.'}</p>{pending === stage && <button type="button" className="text-button" onClick={() => choose(stage)}>Choose your line<ArrowRight size={14} /></button>}</div>{reached && hasForm && <Check size={19} />}
      </article>;
    })}</div>
    <p className="page-footnote">A missed day never takes away earned XP. Undoing a completion recalculates XP; your chosen line stays with you.</p>
  </>;
}
