import { type Appearance } from './appearance';

type FacePalette = { shade: string; highlight: string };

// This eye and smile are Moris's identity. Bodies, materials and silhouettes
// can change freely around them; their original geometry stays shared.
export function MorisFace({ happy = false, palette, cheeks = true }: { happy?: boolean; palette: FacePalette; cheeks?: boolean }) {
  return <g className="moris-face" data-moris-identity="classic-face" stroke="none">
    <g className="moris-eye"><ellipse cx="102" cy="91" rx="25" ry="32" fill="#f2efe4" stroke="#142168" strokeWidth="3" transform="rotate(-7 102 91)" />
      {happy ? <path d="M91 94q11-16 22 0" fill="none" stroke="#142168" strokeWidth="7" strokeLinecap="round" /> : <ellipse cx="106" cy="98" rx="10" ry="17" fill="#142168" />}
      {!happy && <ellipse cx="110" cy="91" rx="3" ry="5" fill="#f2efe4" />}
    </g>
    <path className="moris-smile" d={happy ? 'M91 129q13 15 28-2' : 'M95 131q10 8 20-2'} fill="none" stroke="#142168" strokeWidth="3" strokeLinecap="round" />
    {cheeks && <path d="m67 111 3 2m65-5 3-2" stroke={palette.shade} strokeWidth="4" strokeLinecap="round" />}
  </g>;
}

export function MorisPersonalDetail({ detail, palette }: { detail: Appearance['morisDetail']; palette: FacePalette }) {
  return <g className="moris-personal-detail" data-personal-detail={detail} stroke="none">
    {detail === 'freckles' && <g fill="#142168" opacity=".7"><circle cx="62" cy="93" r="2.4" /><circle cx="71" cy="99" r="2.4" /><circle cx="60" cy="103" r="2.4" /></g>}
    {detail === 'tuft' && <path d="M65 61C48 48 43 31 53 29c6-1 8 12 12 14-4-18 9-24 14-15 3 5-2 17-4 25" fill={palette.highlight} stroke="#142168" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
    {detail === 'antenna' && <g><path d="m132 60 12-16-9-8 14-13" fill="none" stroke="#142168" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="150" cy="21" r="7" fill={palette.highlight} stroke="#142168" strokeWidth="3" /></g>}
  </g>;
}
