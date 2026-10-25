import { STAGES } from './domain';

export function Moris({ stage = 0, happy = false, className = '' }: { stage?: number; happy?: boolean; className?: string }) {
  return <svg className={`moris-art ${happy ? 'moris-happy' : ''} ${className}`} viewBox="0 0 200 200" role="img" aria-label={`${STAGES[stage].name}, an orange, wonderfully odd one-eyed creature`}>
    {stage >= 4 && <><path d="M55 95 19 167 91 151 157 171 146 90Z" fill="#1839d5" /><path d="m75 29 1-20 18 12 12-17 10 20 20-6-7 24Z" fill="#d8ab3e" stroke="#142168" strokeWidth="3" strokeLinejoin="round" /></>}
    {stage >= 3 && <><path d="M51 75C9 37 11 121 49 106" fill="#b65331" stroke="#142168" strokeWidth="3" /><path d="M146 71C190 30 189 119 150 109" fill="#b65331" stroke="#142168" strokeWidth="3" /><path d="M36 72Q24 88 39 92M161 70Q178 88 162 95" fill="none" stroke="#f2b27f" strokeWidth="5" strokeLinecap="round" /></>}
    {stage >= 1 && <><path d="m47 92-29-20 3 37 29 13M150 89l31-22-4 40-27 17" fill="#1839d5" stroke="#142168" strokeWidth="3" strokeLinejoin="round" /><path d="m26 85 13 15m126-5 9-13" stroke="#f2efe4" strokeWidth="2" /></>}
    {stage >= 2 && <><path d="m78 137-5 31-17 5m63-35 10 30 17 3" fill="none" stroke="#142168" strokeWidth="8" strokeLinecap="round" /></>}
    <path d="m92 30 17 18 24-14 3 25 29-3-10 26 23 17-22 16 12 28-29-2-8 27-24-16-21 17-11-26-28 7 4-28-26-11 21-21-13-23 28-1 5-27Z" fill="#eb6b36" />
    {stage >= 3 && <path d="m64 67 8-10 5 9 9-17 7 10 13-15 9 14 10-8 3 15" fill="none" stroke="#f7a36e" strokeWidth="4" strokeLinecap="round" />}
    <ellipse cx="102" cy="91" rx="25" ry="32" fill="#f2efe4" stroke="#142168" strokeWidth="3" transform="rotate(-7 102 91)" />
    {happy ? <path d="M91 94q11-16 22 0" fill="none" stroke="#142168" strokeWidth="7" strokeLinecap="round" /> : <ellipse cx="106" cy="98" rx="10" ry="17" fill="#142168" />}
    {!happy && <ellipse cx="110" cy="91" rx="3" ry="5" fill="#f2efe4" />}
    <path d={happy ? 'M91 129q13 15 28-2' : 'M95 131q10 8 20-2'} fill="none" stroke="#142168" strokeWidth="3" strokeLinecap="round" />
    <path d="m67 111 3 2m65-5 3-2" stroke="#b44c2c" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}
