import { useId } from 'react';
import type { LineagePalette } from './moris-lineage';

const BLUE = '#1839d5';
const INK = '#142168';
const CREAM = '#fff0ca';
const levelOf = (stage: number) => Math.max(0, Math.min(6, Math.trunc(stage)));

const faces = [
  { x: 99, y: 109, scale: .6 },
  { x: 58, y: 105, scale: .59 },
  { x: 105, y: 95, scale: .58 },
  { x: 75, y: 93, scale: .58 },
  { x: 97, y: 86, scale: .64 },
  { x: 103, y: 68, scale: .56 },
  { x: 100, y: 52, scale: .58 },
] as const;

export function origamiFace(stage: number): { x: number; y: number; scale: number } { return faces[levelOf(stage)]; }

const bodies = [
  'M43 148 124 37 137 154Z',
  'M12 126 75 42 90 141Z',
  'M34 89 65 94 117 43 140 104 156 111 123 132 99 124 74 141 57 117 25 118 49 104Z',
  'M37 92 84 54 105 127 39 116Z',
  'M99 34 184 79 154 115 125 135 111 172 82 151 44 145 17 111 18 89 58 67 76 49Z M85 126 111 137 102 151 80 141Z',
  'M20 77 108 34 178 82 164 132 99 176 21 139Z M48 99 143 100 137 123 95 149 42 129Z',
  'M100 12 137 33 134 65 168 58 190 93 163 120 174 156 136 178 102 159 70 181 28 158 38 122 11 96 32 60 65 67 62 34Z M78 100 101 86 128 100 128 127 103 144 78 129Z',
] as const;

/** Seven deliberately drawn paper bodies, following the approved early sheet. */
export function OrigamiFixed({ stage, palette }: { stage: number; palette: LineagePalette }) {
  const level = levelOf(stage), body = bodies[level];
  const id = `paper-fixed-${useId().replace(/:/g, '')}`;
  return <g className="moris-fixed-paper" data-art-line="origami" data-art-stage={level} stroke="none">
    <defs>
      <linearGradient id={`${id}-orange`} x1="0" y1="0" x2=".8" y2="1">
        <stop offset="0" stopColor={palette.highlight} /><stop offset=".3" stopColor={palette.body} /><stop offset="1" stopColor={palette.body} />
      </linearGradient>
      <clipPath id={`${id}-body`}><path d={body} fillRule="evenodd" /></clipPath>
    </defs>

    {level === 0 && <>
      <path d="M124 37 160 126 137 154Z" fill={BLUE} />
      <path d="M43 148 137 154 160 126 137 167Z" fill={palette.shade} />
      <path d="M137 154 160 126 153 144 137 167Z" fill={palette.body} />
    </>}

    {level === 1 && <g data-body-part="accordion-body">
      {[0, 1, 2, 3, 4].map(index => {
        const x = 79 + index * 21;
        return <g key={index}>
          <path d={`M${x} 89 ${x + 21} 77 ${x + 27} 97 ${x + 16} 148 ${x - 2} 133Z`} fill={index % 2 ? palette.body : palette.highlight} />
          <path d={`M${x + 21} 77 ${x + 16} 148 ${x + 5} 129Z`} fill={palette.shade} opacity=".5" />
          <path d={`M${x - 2} 133 ${x + 5} 94 ${x + 5} 129 ${x + 16} 148Z`} fill={BLUE} />
          <path d={`M${x + 1} 91 ${x + 20} 79`} fill="none" stroke={CREAM} strokeWidth=".9" opacity=".45" />
        </g>;
      })}
    </g>}

    {level === 2 && <g data-body-part="folded-critter-supports">
      <path d="M56 114 57 143 34 178 42 149 38 133Z" fill={BLUE} />
      <path d="M76 129 93 145 83 185 80 158 69 144Z" fill={palette.body} />
      <path d="M83 185 80 158 88 163Z" fill={BLUE} />
      <path d="M115 119 143 143 163 176 137 159 125 137Z" fill={BLUE} />
      <path d="M115 119 143 143 137 159 125 137Z" fill={palette.body} />
      <path d="M132 104 166 119 177 139 153 129Z" fill={palette.shade} />
      <path d="M132 104 166 119 155 121Z" fill={palette.highlight} />
    </g>}

    {level === 3 && <g data-body-part="folded-wing-body">
      <path d="M78 83 169 35 151 106 103 155Z" fill={palette.body} />
      <path d="M103 155 151 106 169 35 155 93Z" fill={BLUE} />
      <path d="M78 83 113 78 103 155Z" fill={palette.shade} />
      <path d="M113 78 137 60 103 155Z" fill={palette.highlight} opacity=".55" />
      <path d="M113 78 103 155 124 120Z" fill={palette.shade} opacity=".6" />
      <path d="M47 116 62 141 42 180 45 149 34 138Z" fill={BLUE} />
      <path d="M47 116 62 141 45 149 34 138Z" fill={palette.body} />
      <path d="M104 143 116 166 139 182 121 150 119 134Z" fill={BLUE} />
      <path d="M133 126 154 146 166 177 146 158 124 148Z" fill={palette.body} />
      <path d="M154 146 166 177 146 158Z" fill={BLUE} />
      <path d="M113 78 103 155 159 47M80 85 137 59" fill="none" stroke={CREAM} strokeWidth="1" opacity=".6" />
    </g>}

    <path className="moris-body" data-body-part="paper-main-volume" d={body} fill={`url(#${id}-orange)`} fillRule="evenodd" />
    <g className="moris-surface-details" clipPath={`url(#${id}-body)`}>
      {level === 0 && <>
        <path d="M124 37 118 147 137 154Z" fill={palette.shade} opacity=".32" />
        <path d="M48 146 117 145 137 154Z" fill={palette.highlight} opacity=".55" />
        <path d="M122 46 119 132" fill="none" stroke={CREAM} strokeWidth=".9" opacity=".5" />
      </>}
      {level === 1 && <>
        <path d="M75 42 68 125 90 141Z" fill={palette.shade} opacity=".28" />
        <path d="M12 126 68 125 90 141Z" fill={palette.highlight} opacity=".55" />
        <path d="M72 51 69 118" fill="none" stroke={CREAM} strokeWidth=".8" opacity=".4" />
      </>}
      {level === 2 && <>
        <path d="M117 43 123 108 156 111 123 132 109 116Z" fill={palette.shade} opacity=".4" />
        <path d="M34 89 65 94 49 104 25 118 57 117 74 141 66 117Z" fill={palette.highlight} opacity=".4" />
        <path d="M117 43 123 108 109 116 123 132" fill="none" stroke={CREAM} strokeWidth=".9" opacity=".5" />
      </>}
      {level === 3 && <>
        <path d="M84 54 84 113 105 127Z" fill={palette.shade} opacity=".34" />
        <path d="M39 116 84 113 105 127Z" fill={palette.highlight} opacity=".45" />
        <path d="M82 63 84 107" fill="none" stroke={CREAM} strokeWidth=".9" opacity=".5" />
      </>}
      {level === 4 && <g data-body-part="continuous-kite-body">
        {/* Two wide sheets meet at one keel. The lower return is the first
            opening that will unfold into the next edition's ribbon loop. */}
        <path d="M18 89 58 67 78 119 17 111Z" fill={palette.highlight} />
        <path d="M17 111 78 119 85 126 80 141 44 145Z" fill={BLUE} />
        <path d="M99 34 184 79 131 92Z" fill={palette.highlight} />
        <path d="M184 79 154 115 125 135 111 137 131 92Z" fill={BLUE} />
        <path d="M99 34 131 92 111 137 106 109Z" fill={palette.shade} opacity=".48" />
        <path d="M111 137 125 135 111 172 82 151 44 145 80 141 102 151Z" fill={palette.shade} />
        <path d="M102 151 111 137 111 172 82 151 80 141Z" fill={BLUE} />
        <path d="M18 89 58 67 78 119M99 34 131 92 184 79M131 92 111 137M44 145 80 141 102 151" fill="none" stroke={CREAM} strokeWidth="1.05" opacity=".48" />
        <path d="M79 55 98 43 107 93" fill="none" stroke={palette.highlight} strokeWidth="1.1" opacity=".65" />
      </g>}
      {level === 5 && <>
        <path d="M20 77 48 99 21 139Z" fill={BLUE} />
        <path d="M142 58 178 82 143 100 128 83Z" fill={BLUE} />
        <path d="M21 139 99 176 86 146 42 129Z" fill={palette.shade} />
        <path d="M99 176 118 181 162 182 135 166Z" fill={BLUE} />
        <path d="M164 132 99 176 95 149 137 123Z" fill={palette.body} />
        <path d="M20 77 108 34 104 47 48 89Z" fill={palette.highlight} opacity=".5" />
        <path d="M48 99 143 100M42 129 86 146" fill="none" stroke={CREAM} strokeWidth=".85" opacity=".35" />
      </>}
      {level === 6 && <g data-body-part="sovereign-rosette">
        {/* A single folded ribbon makes six large vanes around the open
            centre. Alternating cobalt returns explain the over-under rhythm. */}
        <path d="M62 34 100 12 137 33 100 40Z" fill={palette.highlight} />
        <path d="M137 33 134 65 101 86 100 40Z" fill={palette.shade} opacity=".45" />
        <path d="M134 65 168 58 190 93 128 100 101 86Z" fill={palette.highlight} />
        <path d="M190 93 163 120 128 127 128 100Z" fill={BLUE} />
        <path d="M163 120 174 156 136 178 128 127Z" fill={palette.body} />
        <path d="M174 156 136 178 103 144 128 127Z" fill={palette.highlight} />
        <path d="M136 178 102 159 70 181 78 129 103 144Z" fill={BLUE} />
        <path d="M70 181 28 158 38 122 78 129Z" fill={palette.shade} />
        <path d="M28 158 78 129 78 100 51 111Z" fill={palette.highlight} />
        <path d="M38 122 11 96 32 60 78 100 78 129Z" fill={BLUE} />
        <path d="M32 60 65 67 62 34 100 40 101 86 78 100Z" fill={palette.body} />
        <path d="M11 96 51 111 78 100 32 60Z" fill={palette.shade} opacity=".48" />
        <path d="M100 12 100 40M137 33 100 40 62 34M168 58 153 85 190 93M174 156 145 145 136 178M70 181 59 145 28 158M32 60 51 86 11 96" fill="none" stroke={CREAM} strokeWidth="1" opacity=".48" />
        <path d="M134 65 101 86M163 120 128 127M102 159 103 144M38 122 78 129M65 67 78 100" fill="none" stroke={INK} strokeWidth=".9" opacity=".18" />
      </g>}
    </g>
    {level === 5 && <path d="M99 176 118 181 162 182 135 166Z" fill={BLUE} />}
    {level >= 5 && <g fill="none" stroke={INK} strokeWidth=".65" opacity=".16"><path d={body} fillRule="evenodd" /></g>}
  </g>;
}
