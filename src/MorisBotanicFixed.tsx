import { useId } from 'react';
import type { LineagePalette } from './moris-lineage';

const BLUE = '#1839d5';
const levelOf = (stage: number) => Math.max(0, Math.min(6, Math.trunc(stage)));
const faces = [
  { x: 105, y: 116, scale: .66 },
  { x: 103, y: 108, scale: .65 },
  { x: 101, y: 102, scale: .64 },
  { x: 101, y: 102, scale: .68 },
  { x: 101, y: 112, scale: .6 },
  { x: 102, y: 85, scale: .68 },
  { x: 101, y: 88, scale: .7 },
] as const;

export function botanicFace(stage: number): { x: number; y: number; scale: number } { return faces[levelOf(stage)]; }

const bodies = [
  'M100 62C78 66 58 103 61 133C63 158 141 165 145 133C150 105 123 69 100 62Z',
  'M100 70C82 68 82 85 69 91C58 96 40 116 47 133C51 147 83 144 101 145C124 143 157 150 161 132C164 116 142 97 130 91C116 84 120 70 100 70Z',
  'M100 43C89 48 82 63 73 77C59 91 58 109 62 124C70 143 86 151 103 150C125 149 141 132 143 111C145 91 130 72 119 60C110 54 107 46 100 43Z',
  'M100 63C121 63 140 82 140 103C140 125 123 143 100 145C77 143 60 126 60 103C60 82 79 63 100 63Z',
  'M29 57C56 55 76 69 99 85C124 67 147 52 174 57C172 95 157 130 128 145C116 160 86 160 74 144C46 130 31 95 29 57Z',
  'M100 39C78 39 70 58 58 63C43 66 29 66 19 83C11 96 18 109 35 111C48 112 54 103 65 109C79 130 104 132 122 115C134 106 142 111 153 112C173 113 188 102 181 88C174 73 156 68 141 64C126 60 123 40 100 39Z',
  'M100 40C77 42 68 60 51 63C35 64 19 69 13 87C8 101 19 112 33 111C47 110 55 107 65 118C77 136 101 139 119 124C132 112 143 111 155 113C174 115 191 106 187 92C183 77 164 68 148 65C128 63 123 41 100 40Z',
] as const;

function HangingRoots({ grand = false }: { grand?: boolean }) {
  return <g data-body-part={grand ? 'grand-bloom-root-arches' : 'hanging-bloom-roots'} fill="none" stroke={BLUE} strokeWidth={grand ? 6.8 : 6} strokeLinecap="round">
    {grand ? <>
      <path d="M51 108C35 127 53 138 36 153C23 165 21 179 35 186" />
      <path d="M73 117C86 137 64 146 73 164C81 177 75 184 66 188" />
      <path d="M98 125C90 143 112 153 101 169C94 179 98 184 106 188" />
      <path d="M122 116C111 136 138 145 126 164C116 178 127 186 138 187" />
      <path d="M148 110C165 127 147 141 165 155C179 168 178 180 166 186" />
    </> : <>
      <path d="M60 105C47 123 68 137 53 153C42 166 43 174 53 180" />
      <path d="M79 115C91 133 68 141 78 159C86 172 83 181 76 186" />
      <path d="M98 119C90 135 112 143 100 160C90 174 99 182 103 186" />
      <path d="M119 112C109 130 132 141 121 155C112 169 122 179 126 181" />
      <path d="M139 107C153 126 131 139 146 154C159 166 152 177 145 181" />
    </>}
  </g>;
}

/** One flowering lineage: seed → sprout → bud → blossom → chalice → canopy → grand bloom. */
export function BotanicFixed({ stage, palette }: { stage: number; palette: LineagePalette }) {
  const level = levelOf(stage), body = bodies[level];
  const id = `botanic-fixed-${useId().replace(/:/g, '')}`;
  return <g className="moris-fixed-botanic" data-art-line="botanic" data-art-stage={level} stroke="none">
    <defs>
      <linearGradient id={`${id}-orange`} x1=".15" y1="0" x2=".75" y2="1"><stop offset="0" stopColor={palette.highlight} /><stop offset=".3" stopColor={palette.body} /><stop offset="1" stopColor={palette.body} /></linearGradient>
      <clipPath id={`${id}-body`}><path d={body} /></clipPath>
    </defs>

    {level === 0 && <g data-body-part="seed-leaves" fill={BLUE}>
      <path d="M101 67C100 47 91 35 78 30C66 24 54 31 62 41C69 50 85 46 98 52L98 67Z" />
      <path d="M101 60C104 37 123 23 136 28C152 35 132 53 105 50L104 65Z" />
    </g>}

    {level === 1 && <>
      <g data-body-part="sprout-leaves" fill={BLUE}>
        <path d="M100 77C97 51 86 43 61 45C30 47 26 27 44 25C66 19 96 36 100 56C108 35 134 21 156 25C178 30 166 48 143 46C118 43 107 54 104 77Z" />
      </g>
      <g data-body-part="sprout-roots" fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round">
        <path d="M78 139q3 16-8 17t-7 19M94 142q-7 16 0 22t-2 17M114 141q-4 15 7 18t5 19M133 140q-5 13 6 15t8 16" />
      </g>
    </>}

    {level === 2 && <>
      <g data-body-part="closed-bud-petals">
        <path d="M76 101C55 90 42 68 51 46C70 48 84 65 88 84Z" fill={palette.body} />
        <path d="M76 101C55 90 42 68 51 46C51 69 68 83 82 87Z" fill={BLUE} />
        <path d="M121 96C142 88 156 65 146 45C127 50 117 66 114 83Z" fill={palette.highlight} />
        <path d="M121 96C142 88 156 65 146 45C147 66 132 81 119 86Z" fill={BLUE} />
      </g>
      <g data-body-part="bud-roots" fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round"><path d="M78 139q3 16-8 23t-7 16M94 147q-6 14 3 23t-2 13M116 145q-3 17 9 22t5 15M131 135q1 17 12 22t3 18" /></g>
    </>}

    {level === 3 && <>
      <g data-body-part="flower-roots" fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round"><path d="M77 139q3 17-10 23t-8 17M94 143q-5 16 5 24t-2 17M116 141q-3 18 10 23t5 16M126 133q5 16 17 20t3 18" /></g>
      <g data-body-part="flower-petals">
        {Array.from({ length: 8 }, (_, index) => <g transform={`rotate(${index * 45} 100 92)`} key={index}>
          <path d="M100 87C82 67 78 38 100 24C122 38 118 67 100 87Z" fill={index % 2 ? palette.body : palette.highlight} />
          <path d="M100 87C114 67 119 52 114 40C121 52 114 77 100 87Z" fill={BLUE} />
          <path d="M100 85 100 42 107 60Z" fill={palette.shade} opacity=".2" />
        </g>)}
      </g>
    </>}

    {level === 4 && <>
      <g data-body-part="chalice-back-petals">
        <path d="M68 100C50 76 58 48 76 37C93 51 99 77 94 97Z" fill={palette.body} />
        <path d="M76 37C85 61 81 82 68 100L94 97C99 77 93 51 76 37Z" fill={palette.shade} opacity=".2" />
        <path d="M100 100C81 76 84 45 102 25C122 42 124 74 107 99Z" fill={palette.highlight} />
        <path d="M107 99C121 78 121 58 115 46C123 68 116 87 107 99Z" fill={BLUE} />
        <path d="M113 98C109 76 122 50 141 39C155 59 151 84 132 104Z" fill={palette.body} />
        <path d="M132 104C149 87 153 68 148 53C149 78 136 90 124 99Z" fill={BLUE} />
      </g>
      <g data-body-part="chalice-roots" fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round"><path d="M77 145C76 162 61 165 64 180M94 153C87 166 102 174 95 187M114 151C107 168 128 173 124 185M131 140C131 156 151 161 145 178" /></g>
    </>}

    {level === 5 && <HangingRoots />}

    {level === 6 && <>
      <HangingRoots grand />
      <g data-body-part="grand-bloom-upper-corolla">
        <path d="M80 82C56 75 31 53 31 29C51 22 78 43 89 64Z" fill={palette.body} />
        <path d="M31 29C34 52 57 69 80 82L89 64C72 70 48 47 31 29Z" fill={BLUE} />
        <path d="M99 68C80 47 81 22 101 9C122 24 120 50 103 70Z" fill={palette.highlight} />
        <path d="M101 9C116 28 107 51 99 68L103 70C120 50 122 24 101 9Z" fill={palette.body} />
        <path d="M115 78C125 52 149 27 170 28C174 53 147 76 123 85Z" fill={palette.body} />
        <path d="M170 28C163 52 142 68 115 78L123 85C147 76 174 53 170 28Z" fill={BLUE} />
        <path d="M63 75C41 63 21 58 10 69C17 91 39 103 65 97Z" fill={palette.highlight} />
        <path d="M134 77C155 62 178 58 189 70C181 93 159 104 134 99Z" fill={palette.highlight} />
      </g>
    </>}

    <path className="moris-body" data-body-part={level === 2 ? 'closed-bud' : level === 4 ? 'cupped-blossom' : level === 6 ? 'grand-bloom-corolla' : 'living-main-volume'} d={body} fill={`url(#${id}-orange)`} />

    <g className="moris-surface-details" clipPath={`url(#${id}-body)`}>
      {level <= 1 && <path d={level ? 'M49 134Q107 145 159 130L160 149H42Z' : 'M61 134Q101 158 147 131L149 165H58Z'} fill={palette.shade} opacity=".12" />}
      {level === 2 && <>
        <path d="M100 44C85 62 76 83 73 105C70 122 78 140 91 149C70 143 58 122 62 104C66 80 86 55 100 44Z" fill={palette.highlight} opacity=".42" />
        <path d="M119 60C135 79 142 97 140 115C137 137 124 149 103 150C121 141 126 125 126 105C128 88 126 74 119 60Z" fill={palette.shade} opacity=".17" />
        <path d="M101 48C92 63 85 73 81 89M110 57C121 75 125 85 126 96" fill="none" stroke={palette.highlight} strokeWidth="1.8" opacity=".8" strokeLinecap="round" />
        <path d="M64 122Q97 147 141 120C137 138 123 149 103 150C85 150 72 140 64 122Z" fill={BLUE} opacity=".82" />
        <path d="M76 131Q100 145 128 132" fill="none" stroke={palette.highlight} strokeWidth="1.2" opacity=".45" />
      </>}
      {level === 3 && <>
        <path d="M100 64Q78 79 76 108Q75 127 97 145C77 143 60 126 60 103C60 82 79 63 100 63Z" fill={palette.highlight} opacity=".3" />
        <path d="M100 144Q129 136 136 110L144 117 130 145Z" fill={palette.shade} opacity=".15" />
      </>}
      {level === 4 && <>
        <path d="M29 57C48 69 61 100 75 121C87 137 119 145 142 133C122 158 93 165 74 144C46 130 31 95 29 57Z" fill={palette.shade} opacity=".22" />
        <path d="M29 57C53 57 73 72 98 87C75 81 64 80 54 86C45 79 37 68 29 57Z" fill={palette.highlight} opacity=".6" />
        <path d="M174 57C169 92 153 123 127 141C135 114 143 80 174 57Z" fill={BLUE} />
        <path d="M166 66C154 84 145 107 139 121" fill="none" stroke={palette.highlight} strokeWidth="1.2" opacity=".55" />
        <path d="M39 70C49 92 62 108 72 115" fill="none" stroke={palette.highlight} strokeWidth="1.4" opacity=".55" />
      </>}
      {level === 5 && <>
        <path d="M19 83C11 96 18 109 35 111C48 112 54 103 65 109L54 96 35 101Z" fill={BLUE} />
        <path d="M181 88C188 102 173 113 153 112C142 111 134 106 122 115L132 98 152 101Z" fill={BLUE} />
        <path d="M100 40C80 44 70 60 58 65Q90 65 100 40Z" fill={palette.highlight} opacity=".45" />
        <path d="M123 48 132 80 153 101 166 104 144 83Z" fill={palette.shade} opacity=".16" />
        <path d="M64 65Q54 77 53 94M137 65Q145 76 148 96" fill="none" stroke={palette.highlight} strokeWidth="1.2" opacity=".65" strokeLinecap="round" />
      </>}
      {level === 6 && <>
        <path d="M13 87C8 101 19 112 33 111C47 110 55 107 65 118L57 100 35 100Z" fill={BLUE} />
        <path d="M187 92C191 106 174 115 155 113C143 111 132 112 119 124L132 101 156 103Z" fill={BLUE} />
        <path d="M65 118C78 140 102 139 119 124C110 130 99 130 91 123L76 105Z" fill={palette.shade} opacity=".17" />
        <path d="M100 41C81 46 72 60 51 65Q77 70 100 41Z" fill={palette.highlight} opacity=".5" />
        <path d="M127 49C135 69 146 83 164 97L179 102C159 80 145 65 127 49Z" fill={palette.shade} opacity=".18" />
        <path d="M53 67Q43 77 40 94M146 68Q157 80 162 98" fill="none" stroke={palette.highlight} strokeWidth="1.3" opacity=".65" strokeLinecap="round" />
      </>}
    </g>
  </g>;
}
