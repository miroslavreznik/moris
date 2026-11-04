import { useEffect, useRef, useState } from 'react';
import { Check, ArrowRight, Sparkles } from 'lucide-react';
import { Moris, type MorisMotion } from './Moris';
import { MORIS_COLORS, MORIS_DETAILS, appearanceOf, type Appearance } from './appearance';

const presets: Appearance[] = [
  { morisColor: 'tangerine', morisDetail: 'freckles' },
  { morisColor: 'lilac', morisDetail: 'tuft' },
  { morisColor: 'lagoon', morisDetail: 'antenna' },
];

export function CompanionEditor({ appearance, stage = 0, onSave }: { appearance?: Partial<Appearance>; stage?: number; onSave: (value: Appearance) => Promise<void> }) {
  const [draft, setDraft] = useState(() => appearanceOf(appearance));
  const [motion, setMotion] = useState<{ kind: MorisMotion; key: number }>({ kind: 'still', key: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function greet() {
    setMotion(value => ({ kind: 'greet', key: value.key + 1 }));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMotion(value => ({ ...value, kind: 'still' })), 1700);
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave(draft); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Your Moris could not be saved.'); setBusy(false); }
  }
  return <form className="companion-editor" onSubmit={save}>
    <div className="companion-preview"><Moris stage={stage} appearance={draft} motion={motion.kind} motionKey={motion.key} happy={motion.kind === 'greet'} /><div><p className="eyebrow">ONE MORIS. YOURS.</p><h3>Your color.<br />Your little quirk.</h3><p>They’ll stay with your Moris through every evolution.</p><button type="button" className="text-button" onClick={greet}><Sparkles size={15} />Say hello</button></div></div>
    <fieldset className="companion-presets"><legend>A few ways to meet Moris</legend>{presets.map(preset => {
      const color = MORIS_COLORS.find(item => item.id === preset.morisColor)!;
      const detail = MORIS_DETAILS.find(item => item.id === preset.morisDetail)!;
      const selected = draft.morisColor === preset.morisColor && draft.morisDetail === preset.morisDetail;
      return <button type="button" key={preset.morisColor} aria-label={`Try ${color.label} with ${detail.label}`} aria-pressed={selected} className={selected ? 'selected' : ''} onClick={() => setDraft(preset)}><Moris stage={stage} appearance={preset} decorative /><strong>{color.label}</strong><span>{detail.label}</span></button>;
    })}</fieldset>
    <fieldset className="companion-colors"><legend>Choose a color</legend>{MORIS_COLORS.map(color => <button type="button" key={color.id} className={draft.morisColor === color.id ? 'selected' : ''} aria-label={`Moris color: ${color.label}`} aria-pressed={draft.morisColor === color.id} onClick={() => setDraft({ ...draft, morisColor: color.id })}><i style={{ background: color.body }}>{draft.morisColor === color.id && <Check size={19} />}</i><span>{color.label}</span></button>)}</fieldset>
    <fieldset className="companion-details"><legend>One little quirk</legend>{MORIS_DETAILS.map(detail => <button type="button" key={detail.id} className={draft.morisDetail === detail.id ? 'selected' : ''} aria-label={`Moris detail: ${detail.label}`} aria-pressed={draft.morisDetail === detail.id} onClick={() => setDraft({ ...draft, morisDetail: detail.id })}><Moris appearance={{ ...draft, morisDetail: detail.id }} decorative /><span><strong>{detail.label}</strong><small>{detail.description}</small></span>{draft.morisDetail === detail.id && <Check size={17} />}</button>)}</fieldset>
    <p className="small-note">Always Moris. You can change this little combination whenever you like.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Saving your Moris…' : 'Save my Moris'}<ArrowRight size={17} /></button>
  </form>;
}
