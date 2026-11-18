import { useId, type PointerEvent } from 'react';
import { appearanceOf, MORIS_COLORS, MORIS_DETAILS, type Appearance } from './appearance';
import { type EvolutionForm, evolutionLabel } from './evolution';
import { MorisForm, morisFace, morisFormDescription } from './MorisForms';
import { MorisFace, MorisPersonalDetail } from './MorisFace';
import './moris-foil.css';

export type MorisMotion = 'still' | 'idle' | 'greet' | 'hop' | 'wiggle' | 'spin' | 'all-done';

export function Moris({ stage = 0, happy = false, className = '', appearance, motion = 'still', motionKey = 0, decorative = false, branch }: Partial<EvolutionForm> & { happy?: boolean; className?: string; appearance?: Partial<Appearance>; motion?: MorisMotion; motionKey?: number; decorative?: boolean }) {
  const level = Math.max(0, Math.min(6, Math.trunc(stage)));
  const selected = appearanceOf(appearance), palette = MORIS_COLORS.find(color => color.id === selected.morisColor)!;
  const detail = MORIS_DETAILS.find(item => item.id === selected.morisDetail)!;
  const id = `moris-${useId().replace(/:/g, '')}`, final = level === 6;
  const face = morisFace(level, branch), classic = !branch || branch === 'classic';
  const label = `${evolutionLabel(level, branch)}, ${palette.label} color, ${detail.label}, ${morisFormDescription(level, branch)}${final ? ', holographic final form' : ''}`;
  function tilt(event: PointerEvent<SVGSVGElement>) {
    if (!final) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--foil-x', `${(event.clientX - bounds.left) / bounds.width * 22 - 11}px`);
    event.currentTarget.style.setProperty('--foil-y', `${(event.clientY - bounds.top) / bounds.height * 14 - 7}px`);
  }
  function reset(event: PointerEvent<SVGSVGElement>) { event.currentTarget.style.removeProperty('--foil-x'); event.currentTarget.style.removeProperty('--foil-y'); }
  return <svg className={`moris-art ${happy ? 'moris-happy' : ''} ${className}`} data-stage={level} data-branch={branch ?? 'classic'} data-color={selected.morisColor} data-detail={selected.morisDetail} data-motion={motion} data-finish={final ? 'holographic' : 'standard'} viewBox="0 0 200 200" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : label} onPointerMove={tilt} onPointerLeave={reset}>
    {final && <defs>
      <filter id={`${id}-white`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
      <mask id={`${id}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="200"><use href={`#${id}-art`} filter={`url(#${id}-white)`} /></mask>
      <linearGradient id={`${id}-rainbow`} x1="0" y1="0" x2="1" y2=".45">
        <stop offset="0" stopColor="#75e8ed" stopOpacity="0" /><stop offset=".18" stopColor="#75e8ed" stopOpacity=".05" />
        <stop offset=".3" stopColor="#8d9bff" stopOpacity=".6" /><stop offset=".4" stopColor="#e99cff" stopOpacity=".8" />
        <stop offset=".5" stopColor="#fff2a9" stopOpacity=".9" /><stop offset=".6" stopColor="#a1f4d3" stopOpacity=".8" />
        <stop offset=".7" stopColor="#84bbff" stopOpacity=".6" /><stop offset=".84" stopColor="#ffa6d8" stopOpacity=".05" /><stop offset="1" stopColor="#ffa6d8" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2=".65"><stop offset=".36" stopColor="#fff" stopOpacity="0" /><stop offset=".49" stopColor="#fffbea" stopOpacity=".85" /><stop offset=".53" stopColor="#fff" stopOpacity=".1" /><stop offset=".64" stopColor="#fff" stopOpacity="0" /></linearGradient>
      <pattern id={`${id}-grain`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(28)"><path d="M0 0V5" stroke="#fff8df" strokeWidth=".35" opacity=".3" /></pattern>
    </defs>}
    <g className="moris-character" key={`${motion}-${motionKey}`}>
      <g className="moris-fixed-form" data-line={branch ?? 'classic'}>
        <g id={`${id}-art`} className="moris-authored-body"><MorisForm stage={level} branch={branch} palette={palette} /></g>
        {final && <g className="moris-holo" mask={`url(#${id}-mask)`} aria-hidden="true" pointerEvents="none">
          <g className="moris-foil-pointer"><rect className="moris-foil-spectrum" x="-100" y="-70" width="400" height="340" fill={`url(#${id}-rainbow)`} />
            <rect className="moris-foil-glint" x="-100" y="-70" width="400" height="340" fill={`url(#${id}-glint)`} /></g>
          <rect x="0" y="0" width="200" height="200" fill={`url(#${id}-grain)`} opacity=".28" />
        </g>}
        <g className="moris-face-placement" transform={`translate(${face.x - 102 * face.scale} ${face.y - 91 * face.scale}) scale(${face.scale})`}>
          <MorisFace happy={happy} palette={palette} cheeks={classic && level < 5} />
          <g transform={branch === 'botanic' && [2, 4, 6].includes(level) && selected.morisDetail === 'freckles' ? 'translate(10 0)' : undefined}><MorisPersonalDetail detail={selected.morisDetail} palette={palette} /></g>
        </g>
      </g>
    </g>
  </svg>;
}
