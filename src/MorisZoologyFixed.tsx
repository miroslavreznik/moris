import { useId } from 'react';

export type ZoologyPalette = { body: string; shade: string; highlight: string; infinite: string };
type FaceAnchor = { x: number; y: number; scale: number };
const BLUE = '#1839d5';
const BLUE_LIGHT = '#3558df';
const INK = '#142168';
const CREAM = '#f2efe4';

const FACES: readonly FaceAnchor[] = [
  { x: 92, y: 91, scale: .68 },
  { x: 66, y: 108, scale: .64 },
  { x: 105, y: 92, scale: .7 },
  { x: 48, y: 104, scale: .56 },
  { x: 66, y: 100, scale: .62 },
  { x: 100, y: 81, scale: .68 },
  { x: 65, y: 79, scale: .66 },
];

export function zoologyFace(stage: number): FaceAnchor { return FACES[Math.max(0, Math.min(6, Math.trunc(stage)))]; }

// These are seven deliberately different creatures from the original concept
// sheet. The shared face is added by Moris; no modular animal anatomy is mixed.
const BODIES = [
  'M111 38C118 33 124 34 118 46C112 63 126 81 125 101C124 128 108 140 81 140C54 140 41 124 45 103C50 75 78 47 111 38Z',
  'M53 71C73 64 92 74 110 91C129 108 154 106 178 82C184 75 188 74 188 82C185 112 165 129 142 133C161 142 149 151 128 145C114 153 95 148 79 147C61 152 40 143 24 136C12 132 21 119 30 106C38 92 42 79 53 71Z',
  'M108 35C129 29 126 58 141 84C153 108 147 126 120 135C101 143 70 141 54 129C37 117 42 89 62 75C84 59 85 37 108 35Z',
  'M23 92C35 77 48 81 67 91L136 109C151 112 163 107 166 99C171 89 157 89 160 82C165 69 181 77 183 86C189 110 175 126 153 128L70 128C49 134 24 130 17 118C11 110 15 102 23 92Z',
  'M40 76C53 59 70 60 81 75C92 87 116 92 139 89C158 88 169 76 165 67C163 61 155 65 155 58C156 48 174 49 180 61C190 84 179 104 157 111C173 116 184 130 187 144C177 135 166 138 153 143C136 151 124 153 111 146C105 142 100 135 96 130C77 149 61 151 47 141C35 134 30 122 17 118C14 128 9 120 13 110C18 96 29 88 40 76Z',
  'M99 38C118 36 123 69 147 76C164 81 178 68 188 89C191 99 184 107 180 102C166 90 155 103 145 109C134 116 127 133 123 149C116 170 94 170 75 183C83 164 97 149 99 133C72 152 54 151 44 137C37 124 34 111 21 98C13 109 10 100 14 90C21 75 36 74 50 79C68 79 80 44 99 38Z',
  'M35 166C14 157 10 126 22 91C29 65 42 46 63 45C85 43 99 64 116 84C134 64 153 64 170 78C193 98 196 134 179 157C164 179 144 178 126 160L100 132C83 149 62 179 35 166ZM37 120C30 136 35 149 46 150C59 151 71 139 81 128L66 112C52 102 42 107 37 120ZM128 100L145 121C156 133 171 125 171 111C172 99 166 88 156 87C146 85 135 91 128 100Z',
] as const;

const KINDS = ['little-drop', 'swimming-fins', 'three-legged-drop', 'six-legged-wanderer', 'six-finned-glider', 'floating-manta', 'living-infinity'] as const;

export function ZoologyFixed({ stage, palette }: { stage: number; palette: ZoologyPalette }) {
  const level = Math.max(0, Math.min(6, Math.trunc(stage)));
  const id = `zoology-fixed-${useId().replace(/:/g, '')}`;
  const body = BODIES[level];
  return <g className="moris-zoology-fixed" data-fixed-line="zoology" data-fixed-form={KINDS[level]} stroke="none">
    <defs>
      <linearGradient id={`${id}-paint`} x1="15%" y1="0%" x2="83%" y2="100%">
        <stop offset="0" stopColor={palette.highlight} /><stop offset=".22" stopColor={palette.body} /><stop offset=".82" stopColor={palette.body} /><stop offset="1" stopColor={palette.shade} />
      </linearGradient>
      <clipPath id={`${id}-clip`}><path d={body} fillRule="evenodd" clipRule="evenodd" /></clipPath>
    </defs>

    {/* Feet, fins and little dorsal ridges are simple cobalt shapes, just as
        in the first approved sheet, rather than outlined decorative armor. */}
    {level === 0 && <g className="moris-grown-details">
      <path d="M70 133Q58 141 65 146C71 150 82 145 87 139ZM103 136Q113 134 121 142C125 148 111 149 103 145Z" fill={BLUE} />
    </g>}
    {level === 1 && <g className="moris-grown-details">
      <path d="M110 107C132 106 132 90 144 92C151 94 141 103 139 106C156 108 165 81 182 78C197 75 187 105 173 117C161 129 146 133 128 129Z" fill={BLUE} />
      <path d="M40 140Q23 151 39 154Q54 156 61 146ZM105 139Q107 156 129 154C143 153 135 142 121 138Z" fill={BLUE} />
    </g>}
    {level === 2 && <g className="moris-grown-details" fill="none" stroke={BLUE} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M68 126 61 149 48 147Q35 146 42 160" />
      <path d="M103 135 104 165M97 167H113" />
      <path d="M133 124 154 140 144 153 152 160" />
    </g>}
    {level === 3 && <g className="moris-grown-details">
      <g fill="none" stroke={BLUE} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M39 123 34 143 24 146M63 126 66 144 58 147M84 126 80 142 72 145M106 125 113 142 105 146M128 124 134 143 125 147M150 122 160 140 152 145" />
      </g>
      <path d="M79 101Q89 80 94 100L95 105ZM104 107Q114 85 119 106L121 111ZM129 111Q140 91 143 111L141 116Z" fill={BLUE} />
    </g>}
    {level === 4 && <g className="moris-grown-details" fill={BLUE}>
      {/* The six old legs become the six ribs of a joined fin. Their tips
          remain legible while the long body starts to open into a manta. */}
      <path data-body-part="six-leg-fin-rays" d="M34 119Q27 131 18 145Q34 136 47 144L45 158Q61 144 76 145L72 163Q94 148 109 143L114 154Q131 142 145 145L156 154Q163 140 177 146L169 131 148 114 112 115 79 118Z" />
      <path data-body-part="retained-dorsal-fins" d="M86 87Q91 67 102 85L102 90ZM110 91Q120 74 126 90L128 92ZM135 88Q145 73 151 84L148 91Z" />
    </g>}

    <path className="moris-body" data-body-kind={KINDS[level]} d={body} fillRule="evenodd" fill={`url(#${id}-paint)`} />

    <g className="moris-surface-details" clipPath={`url(#${id}-clip)`}>
      {level === 0 && <>
        <path d="M111 40C86 53 64 72 55 99" fill="none" stroke={palette.highlight} strokeWidth="2" opacity=".7" />
        <path d="M48 117C68 137 106 140 122 115C115 141 71 154 48 128Z" fill={palette.shade} opacity=".12" />
      </>}
      {level === 1 && <>
        <path d="M106 126C123 132 149 125 172 108C166 127 148 138 128 141L95 139Z" fill={BLUE} />
        <path d="M123 132C145 124 166 115 179 96C172 122 149 137 130 141Z" fill={BLUE_LIGHT} />
        <path d="M31 128C58 150 92 150 114 143L113 149 67 154Z" fill={palette.shade} opacity=".16" />
        <path d="M45 79C66 68 87 82 97 89" fill="none" stroke={palette.highlight} strokeWidth="1.7" opacity=".7" />
      </>}
      {level === 2 && <>
        <path d="M111 39C93 41 90 61 76 74" fill="none" stroke={palette.highlight} strokeWidth="2.1" opacity=".7" />
        <path d="M50 117C77 139 123 137 145 111C137 145 77 152 50 130Z" fill={palette.shade} opacity=".14" />
      </>}
      {level === 3 && <>
        <path d="M17 117C39 132 62 129 80 125L153 121C172 118 181 101 178 89C188 111 171 134 152 133H70C45 141 20 132 17 117Z" fill={palette.shade} opacity=".22" />
        <path d="M76 96 136 112C151 115 161 110 166 107" fill="none" stroke={palette.highlight} strokeWidth="1.6" opacity=".65" />
      </>}
      {level === 4 && <>
        <path d="M12 112C27 109 35 126 48 130C63 137 78 131 91 122C76 142 60 149 47 141C35 134 30 122 17 118L12 124Z" fill={BLUE} />
        <path d="M103 124C121 126 132 116 147 117C165 117 177 129 187 144C175 132 164 143 153 146C134 154 120 151 111 146C105 142 101 135 96 130Z" fill={BLUE} />
        <path d="M114 132Q136 123 153 130Q169 137 179 140C160 136 150 152 131 150Z" fill={BLUE_LIGHT} opacity=".6" />
        <path d="M138 95C162 94 178 79 174 62C186 80 173 101 152 107L126 111Z" fill={palette.shade} opacity=".2" />
        <path d="M43 77C54 65 67 66 76 76M87 81Q112 97 139 95Q163 94 171 78" fill="none" stroke={palette.highlight} strokeWidth="1.8" opacity=".7" />
        <path d="M34 121 24 139M57 132 49 151M83 131 77 155M111 130 114 146M139 130 153 147M158 129 174 140" fill="none" stroke={palette.highlight} strokeWidth="1" opacity=".52" />
      </>}
      {level === 5 && <>
        <path d="M13 93C29 85 42 109 57 113C70 116 79 110 88 105C76 130 63 139 45 128C32 120 26 102 16 108Z" fill={BLUE} />
        <path d="M111 107C127 108 139 109 151 96C163 82 180 85 190 97L183 108C171 93 155 111 145 116C133 127 126 145 123 149C122 127 117 118 111 107Z" fill={BLUE} />
        <path d="M101 130C92 149 85 160 75 183C89 168 100 163 105 158C111 150 112 138 111 128Z" fill={palette.shade} opacity=".23" />
        <path d="M99 43C87 49 80 65 72 74M29 82Q42 79 52 84M153 83Q174 77 182 89" fill="none" stroke={palette.highlight} strokeWidth="1.7" opacity=".8" />
      </>}
      {level === 6 && <>
        <path d="M23 91C14 125 20 152 38 157C53 163 71 143 81 128L99 132C82 151 62 178 35 166C14 157 10 126 22 91Z" fill={BLUE} />
        <path d="M116 84C136 65 153 64 170 78C187 93 191 113 185 133C180 113 175 90 156 87C145 85 136 90 128 100Z" fill={BLUE} />
        <path d="M81 128 66 112C86 113 99 126 112 142C125 157 139 170 152 174C141 175 132 166 126 160L100 132Z" fill={INK} opacity=".37" />
        <path d="M39 60C52 47 64 48 73 53M127 82C142 72 154 72 163 78M27 153C29 159 36 162 42 162" fill="none" stroke={palette.highlight} strokeWidth="1.7" opacity=".75" />
        <ellipse cx="162" cy="150" rx="6.1" ry="3.5" fill={CREAM} transform="rotate(-25 162 150)" />
        <ellipse cx="172" cy="140" rx="4.5" ry="2.7" fill={CREAM} transform="rotate(-35 172 140)" />
        <ellipse cx="151" cy="158" rx="4.4" ry="2.6" fill={CREAM} transform="rotate(-18 151 158)" />
      </>}
    </g>

    {level === 1 && <path className="moris-grown-details" d="M95 139C112 135 127 139 132 146C122 153 104 150 95 144Z" fill={palette.body} />}

  </g>;
}
