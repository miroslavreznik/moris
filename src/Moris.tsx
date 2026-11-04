import { STAGES } from './domain';
import { appearanceOf, MORIS_COLORS, MORIS_DETAILS, type Appearance } from './appearance';

export type MorisMotion = 'still' | 'idle' | 'greet' | 'hop' | 'wiggle' | 'spin' | 'all-done';

const appearances = [
  'an orange, wonderfully odd one-eyed creature',
  'a one-eyed orange creature with new blue fins',
  'a clumsy orange creature with blue fins and little legs',
  'a fluffy orange creature with ears, fins, and little legs',
  'an orange superhero with a cobalt cape and a crooked golden crown',
  'a floating orange creature with a planetary ring, a little moon, and star-shaped freckles',
  'a golden orange creature with flowing cosmic arms, a double halo, and an infinity emblem',
];

export function Moris({ stage = 0, happy = false, className = '', appearance, motion = 'still', motionKey = 0, decorative = false }: { stage?: number; happy?: boolean; className?: string; appearance?: Partial<Appearance>; motion?: MorisMotion; motionKey?: number; decorative?: boolean }) {
  const selected = appearanceOf(appearance);
  const palette = MORIS_COLORS.find(color => color.id === selected.morisColor)!;
  const detail = MORIS_DETAILS.find(item => item.id === selected.morisDetail)!;
  const cosmic = stage === 5;
  const infinite = stage === 6;
  return <svg className={`moris-art ${happy ? 'moris-happy' : ''} ${className}`} data-stage={stage} data-color={selected.morisColor} data-detail={selected.morisDetail} data-motion={motion} viewBox="0 0 200 200" role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `${STAGES[stage].name}, ${palette.label} color, ${detail.label}, ${appearances[stage].replace(/orange,? /g, '')}`}>
    <g className="moris-character" key={`${motion}-${motionKey}`}>
    {stage === 4 && <>
      <path d="M55 95 19 167 91 151 157 171 146 90Z" fill="#1839d5" />
      <path d="m75 29 1-20 18 12 12-17 10 20 20-6-7 24Z" fill="#d8ab3e" stroke="#142168" strokeWidth="3" strokeLinejoin="round" />
    </>}
    {stage >= 3 && stage <= 4 && <>
      <path d="M51 75C9 37 11 121 49 106" fill={palette.shade} stroke="#142168" strokeWidth="3" />
      <path d="M146 71C190 30 189 119 150 109" fill={palette.shade} stroke="#142168" strokeWidth="3" />
      <path d="M36 72Q24 88 39 92M161 70Q178 88 162 95" fill="none" stroke={palette.highlight} strokeWidth="5" strokeLinecap="round" />
    </>}
    {stage >= 1 && stage <= 4 && <>
      <path d="m47 92-29-20 3 37 29 13M150 89l31-22-4 40-27 17" fill="#1839d5" stroke="#142168" strokeWidth="3" strokeLinejoin="round" />
      <path d="m26 85 13 15m126-5 9-13" stroke="#f2efe4" strokeWidth="2" />
    </>}
    {stage >= 2 && stage <= 4 && <path d="m78 137-5 31-17 5m63-35 10 30 17 3" fill="none" stroke="#142168" strokeWidth="8" strokeLinecap="round" />}
    {cosmic && <>
      <path d="M18 128C-3 99 135 52 181 81c30 20-93 79-155 61" fill="none" stroke="#142168" strokeWidth="8" />
      <path d="M18 128C-3 99 135 52 181 81c30 20-93 79-155 61" fill="none" stroke="#8d4b90" strokeWidth="5" />
      <circle cx="172" cy="42" r="10" fill="#1839d5" />
      <path d="m157 49 29-13" stroke="#d8ab3e" strokeWidth="3" strokeLinecap="round" />
      <path d="m32 38 2-6 2 6 6 2-6 2-2 6-2-6-6-2Z" fill="#d8ab3e" />
      <circle cx="163" cy="166" r="3" fill="#8d4b90" />
      <circle cx="23" cy="168" r="2" fill="#1839d5" />
      <ellipse cx="98" cy="182" rx="33" ry="5" fill="#1839d514" />
    </>}
    {infinite && <>
      <path d="M56 88C-2 48 7 135 46 119L25 155 66 143M146 85c58-41 55 45 13 34l17 37-42-15" fill="#1839d5" />
      <path d="M40 98Q15 66 22 112m138-14q25-32 18 14" fill="none" stroke="#f2efe4" strokeWidth="3" strokeLinecap="round" />
      <path d="m83 144-14 34 31-13 33 14-13-36" fill="#8d4b90" />
      <ellipse cx="100" cy="20" rx="35" ry="8" fill="none" stroke="#d8ab3e" strokeWidth="4" transform="rotate(-8 100 20)" />
      <ellipse cx="100" cy="20" rx="24" ry="4" fill="none" stroke="#d8ab3e" strokeWidth="2" transform="rotate(8 100 20)" />
      <path d="m36 33 7 10m-23 9 10 5m136-24-7 10m23 9-10 5M18 168l8-5m147 5 8 5" stroke="#d8ab3e" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="100" cy="188" rx="40" ry="5" fill="#d8ab3e33" />
    </>}
    <path className="moris-body" d="m92 30 17 18 24-14 3 25 29-3-10 26 23 17-22 16 12 28-29-2-8 27-24-16-21 17-11-26-28 7 4-28-26-11 21-21-13-23 28-1 5-27Z" fill={infinite ? palette.infinite : palette.body} />
    {stage >= 3 && stage <= 4 && <path d="m64 67 8-10 5 9 9-17 7 10 13-15 9 14 10-8 3 15" fill="none" stroke={palette.highlight} strokeWidth="4" strokeLinecap="round" />}
    <g className="moris-eye"><ellipse cx="102" cy="91" rx="25" ry="32" fill="#f2efe4" stroke="#142168" strokeWidth="3" transform="rotate(-7 102 91)" />
    {happy ? <path d="M91 94q11-16 22 0" fill="none" stroke="#142168" strokeWidth="7" strokeLinecap="round" /> : <ellipse cx="106" cy="98" rx="10" ry="17" fill="#142168" />}
    {!happy && <ellipse cx="110" cy="91" rx="3" ry="5" fill="#f2efe4" />}</g>
    <path d={happy ? 'M91 129q13 15 28-2' : 'M95 131q10 8 20-2'} fill="none" stroke="#142168" strokeWidth="3" strokeLinecap="round" />
    {!cosmic && !infinite && <path d="m67 111 3 2m65-5 3-2" stroke={palette.shade} strokeWidth="4" strokeLinecap="round" />}
    {cosmic && <>
      <path d="m63 101 2 6 6 2-6 2-2 6-2-6-6-2 6-2Zm76-2 1 4 4 1-4 1-1 4-1-4-4-1 4-1Z" fill="#f2efe4" />
      <path d="M18 128c17 20 100-1 145-26" fill="none" stroke="#142168" strokeWidth="8" strokeLinecap="round" />
      <path d="M18 128c17 20 100-1 145-26" fill="none" stroke="#8d4b90" strokeWidth="5" strokeLinecap="round" />
      <circle cx="44" cy="135" r="6" fill="#d8ab3e" stroke="#142168" strokeWidth="2" />
    </>}
    {infinite && <>
      <path d="M92 148c-13-17-22 3-12 5 9 2 24-23 33-9 7 12-4 15-13 4" fill="none" stroke="#142168" strokeWidth="3" strokeLinecap="round" />
      <path d="m64 94 2 5 5 2-5 2-2 5-2-5-5-2 5-2Zm77 0 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#f2efe4" />
      <path d="m100 43 5 8-5 8-5-8Z" fill="#1839d5" />
    </>}
    <g className="moris-personal-detail" data-personal-detail={selected.morisDetail}>
      {selected.morisDetail === 'freckles' && <g fill="#142168" opacity=".7"><circle cx="62" cy="93" r="2.4" /><circle cx="71" cy="99" r="2.4" /><circle cx="60" cy="103" r="2.4" /></g>}
      {selected.morisDetail === 'tuft' && <path d="M65 61C48 48 43 31 53 29c6-1 8 12 12 14-4-18 9-24 14-15 3 5-2 17-4 25" fill={palette.highlight} stroke="#142168" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      {selected.morisDetail === 'antenna' && <g><path d="m132 60 12-16-9-8 14-13" fill="none" stroke="#142168" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="150" cy="21" r="7" fill={palette.highlight} stroke="#142168" strokeWidth="3" /></g>}
    </g>
    </g>
  </svg>;
}
