import { useState } from 'react';
import { Moris } from './Moris';
import { type Appearance } from './appearance';

export function EvolutionScene({ from, to, appearance, quiet = false }: { from: number; to: number; appearance: Appearance; quiet?: boolean }) {
  const [settled, setSettled] = useState(quiet);
  return <><div className={`evolution-scene ${settled ? 'is-settled' : ''}`}>
    <div className="evolution-halo" aria-hidden="true" />
    <div className="evolution-sparks" aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} style={{ '--spark-angle': `${index * 45}deg` } as React.CSSProperties} />)}</div>
    <div className="evolution-before" aria-hidden="true"><Moris stage={from} appearance={appearance} decorative /></div>
    <div className="evolution-after"><Moris stage={to} appearance={appearance} happy /></div>
  </div>{!settled && <button type="button" className="text-button skip-evolution" onClick={() => setSettled(true)}>Skip animation</button>}</>;
}
