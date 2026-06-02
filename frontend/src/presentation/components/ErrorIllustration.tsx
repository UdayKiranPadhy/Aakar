/**
 * Flat, colorful spot illustrations for the error page — soft Google palette,
 * faceless characters (unDraw-ish) interacting with the error concept.
 *
 * Fixed-color artwork (not token-driven UI chrome), so palette hex is inlined.
 */

import type { LoadErrorKind } from "../../application/loadError";

// Soft Google palette.
const BLUE = "#4285F4";
const BLUE_DK = "#2B6CD4";
const BLUE_SOFT = "#AECBFA";
const BLUE_WASH = "#E8F0FE";
const GREEN = "#34A853";
const GREEN_DK = "#2C8C46";
const GREEN_SOFT = "#A8DAB5";
const GREEN_WASH = "#E6F4EA";
const RED = "#EA4335";
const RED_SOFT = "#F6AEA9";
const YELLOW = "#FBBC04";
const YELLOW_DK = "#F09A00";
const NAVY = "#283655";
const NAVY_DK = "#1F2A44";
const GREY_LIGHT = "#DADCE0";
const GROUND = "#E8EAED";
const INK = "#202124";
const SKIN_A = "#E8A87C";
const SKIN_B = "#C8895E";
const HAIR_A = "#3B2F2F";
const HAIR_B = "#1A1A1A";
const WHITE = "#FFFFFF";

type Props = { kind: LoadErrorKind };

export function ErrorIllustration({ kind }: Props) {
  switch (kind) {
    case "unsupported":
      return <Unsupported />;
    case "not_found":
      return <NotFound />;
    case "gated":
      return <Gated />;
    case "timeout":
      return <Timeout />;
    case "network":
    case "unavailable":
      return <Offline />;
    default:
      return <Warning />;
  }
}

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <svg width="248" height="186" viewBox="0 0 280 210" fill="none" role="img">
      {/* pale rounded "sky" panels */}
      <rect x="34" y="16" width="150" height="74" rx="22" fill={BLUE_WASH} opacity="0.75" />
      <rect x="120" y="60" width="128" height="70" rx="20" fill={GREEN_WASH} opacity="0.7" />
      {/* ground shadow the characters stand on */}
      <ellipse cx="140" cy="190" rx="116" ry="8" fill={GROUND} />
      {children}
    </svg>
  );
}

function Leaf({ x, y, r = 0, c = GREEN_SOFT }: { x: number; y: number; r?: number; c?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d="M0 0 C7 -13 24 -13 30 0 C24 13 7 13 0 0 Z" fill={c} />
      <path d="M4 0 H26" stroke={WHITE} strokeWidth="1.5" opacity="0.7" />
    </g>
  );
}

/**
 * Standing, faceless flat figure. `frontArm` is drawn last (on top) in the
 * figure's local coordinates so each scene can pose the active arm to hold its
 * prop. Origin is the head center; feet land around y = 92.
 */
function StandingPerson({
  x,
  y,
  skin,
  hair,
  shirt,
  shirtShade,
  pants,
  pantsShade,
  frontArm,
}: {
  x: number;
  y: number;
  skin: string;
  hair: string;
  shirt: string;
  shirtShade: string;
  pants: string;
  pantsShade: string;
  frontArm: React.ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* legs */}
      <path d="M-15 36 L-17 90 L-4 90 L-2 38 Z" fill={pantsShade} />
      <path d="M2 38 L4 90 L17 90 L15 36 Z" fill={pants} />
      {/* shoes */}
      <path d="M-19 90 q-2 6 6 6 h9 v-6 Z" fill={INK} />
      <path d="M1 90 v6 h9 q8 0 6 -6 Z" fill={INK} />
      {/* back arm tucked along the torso */}
      <path d="M-19 -6 Q-28 14 -22 36 L-13 34 Q-18 14 -11 -2 Z" fill={shirtShade} />
      {/* torso */}
      <path d="M-20 -4 Q-23 -12 -11 -13 L12 -13 Q23 -12 20 -4 L17 38 Q0 44 -17 38 Z" fill={shirt} />
      {/* neck + head */}
      <rect x="-5" y="-22" width="10" height="12" rx="4" fill={skin} />
      <circle cx="0" cy="-32" r="14" fill={skin} />
      {/* hair */}
      <path d="M-15 -36 Q-16 -52 0 -52 Q16 -52 15 -33 Q15 -44 0 -44 Q-13 -44 -15 -30 Z" fill={hair} />
      {frontArm}
    </g>
  );
}

/** A person searching an empty result card with a magnifying glass. */
function NotFound() {
  return (
    <Scene>
      {/* empty "result" card */}
      <rect x="150" y="70" width="104" height="80" rx="12" fill={WHITE} stroke={GREY_LIGHT} strokeWidth="2" />
      <circle cx="163" cy="84" r="3.5" fill={GREY_LIGHT} />
      <rect x="174" y="81" width="40" height="6" rx="3" fill={BLUE_WASH} />
      <rect x="166" y="104" width="72" height="9" rx="4.5" fill="#F1F3F4" />
      <rect x="166" y="120" width="54" height="8" rx="4" fill="#F1F3F4" />
      <rect x="166" y="134" width="64" height="8" rx="4" fill="#F1F3F4" />

      <StandingPerson
        x={78}
        y={96}
        skin={SKIN_A}
        hair={HAIR_A}
        shirt={YELLOW}
        shirtShade={YELLOW_DK}
        pants={BLUE}
        pantsShade={BLUE_DK}
        frontArm={
          <g>
            {/* raised arm */}
            <path d="M14 -8 Q34 -12 45 2 L39 11 Q30 0 12 1 Z" fill={YELLOW} />
            {/* hand gripping the handle */}
            <circle cx="45" cy="5" r="6" fill={SKIN_A} />
            {/* magnifier */}
            <line x1="47" y1="1" x2="61" y2="-17" stroke={BLUE} strokeWidth="7" strokeLinecap="round" />
            <circle cx="68" cy="-27" r="20" fill={BLUE_WASH} stroke={BLUE} strokeWidth="7" />
            <text x="68" y="-20" textAnchor="middle" fontFamily="sans-serif" fontSize="22" fontWeight="700" fill={BLUE}>
              ?
            </text>
          </g>
        }
      />

      <Leaf x={36} y={150} r={-25} c={GREEN_SOFT} />
      <Leaf x={236} y={64} r={150} c={GREEN_SOFT} />
      <circle cx="250" cy="150" r="5" fill={YELLOW} />
      <circle cx="40" cy="70" r="5" fill={RED_SOFT} />
    </Scene>
  );
}

/** A person holding up a hand at a block tower with one incompatible block. */
function Unsupported() {
  return (
    <Scene>
      {/* block tower */}
      <line x1="196" y1="66" x2="196" y2="156" stroke={GREY_LIGHT} strokeWidth="6" strokeLinecap="round" />
      <rect x="164" y="54" width="64" height="30" rx="8" fill={BLUE} />
      <rect x="174" y="65" width="30" height="6" rx="3" fill={WHITE} opacity="0.85" />
      {/* the incompatible block: white card, dashed coral outline */}
      <rect x="156" y="90" width="80" height="34" rx="9" fill={WHITE} stroke={RED} strokeWidth="3" strokeDasharray="7 6" />
      <rect x="167" y="102" width="38" height="6" rx="3" fill={RED_SOFT} />
      <rect x="167" y="112" width="24" height="5" rx="2.5" fill={GREY_LIGHT} />
      <rect x="164" y="130" width="64" height="30" rx="8" fill={GREEN} />
      <rect x="174" y="141" width="30" height="6" rx="3" fill={WHITE} opacity="0.85" />
      {/* no-entry badge */}
      <circle cx="232" cy="78" r="17" fill={RED} stroke={WHITE} strokeWidth="3" />
      <line x1="223" y1="69" x2="241" y2="87" stroke={WHITE} strokeWidth="4" strokeLinecap="round" />

      <StandingPerson
        x={74}
        y={96}
        skin={SKIN_B}
        hair={HAIR_B}
        shirt={GREEN}
        shirtShade={GREEN_DK}
        pants={NAVY}
        pantsShade={NAVY_DK}
        frontArm={
          <g>
            {/* arm raised, palm out toward the tower */}
            <path d="M14 -8 Q38 -10 48 -22 L41 -30 Q30 -16 12 -1 Z" fill={GREEN} />
            <circle cx="50" cy="-25" r="6.5" fill={SKIN_B} />
          </g>
        }
      />

      <Leaf x={34} y={150} r={-25} c={GREEN_SOFT} />
      <circle cx="248" cy="150" r="5" fill={YELLOW} />
      <circle cx="44" cy="66" r="5" fill={BLUE_SOFT} />
      <circle cx="252" cy="44" r="4" fill={RED_SOFT} />
    </Scene>
  );
}

/** Friendly padlock. */
function Gated() {
  return (
    <Scene>
      <path d="M118 96 V78 a22 22 0 0 1 44 0 V96" stroke="#9AA0A6" strokeWidth="9" strokeLinecap="round" fill="none" />
      <rect x="102" y="94" width="76" height="60" rx="12" fill={YELLOW} />
      <circle cx="140" cy="116" r="8" fill={WHITE} />
      <rect x="136" y="120" width="8" height="18" rx="4" fill={WHITE} />
      <Leaf x={40} y={150} r={-25} c={GREEN_SOFT} />
      <circle cx="68" cy="72" r="5" fill={BLUE_SOFT} />
      <circle cx="226" cy="150" r="6" fill={GREEN_SOFT} />
      <circle cx="232" cy="62" r="5" fill={RED_SOFT} />
    </Scene>
  );
}

/** Clock — exceeded the time budget. */
function Timeout() {
  return (
    <Scene>
      <circle cx="140" cy="102" r="46" fill={WHITE} stroke={BLUE_SOFT} strokeWidth="9" />
      <line x1="140" y1="102" x2="140" y2="70" stroke={BLUE} strokeWidth="7" strokeLinecap="round" />
      <line x1="140" y1="102" x2="165" y2="112" stroke={GREEN} strokeWidth="6" strokeLinecap="round" />
      <circle cx="140" cy="102" r="6" fill={RED} />
      <Leaf x={40} y={150} r={-25} c={GREEN_SOFT} />
      <circle cx="66" cy="68" r="5" fill={YELLOW} />
      <circle cx="226" cy="146" r="6" fill={GREEN_SOFT} />
    </Scene>
  );
}

/** Cloud with a slash — can't reach the upstream. */
function Offline() {
  return (
    <Scene>
      <path d="M104 146 a30 30 0 0 1 2 -59 a40 40 0 0 1 75 8 a26 26 0 0 1 -6 51 Z" fill={BLUE_SOFT} />
      <line x1="92" y1="70" x2="188" y2="154" stroke={RED} strokeWidth="9" strokeLinecap="round" />
      <Leaf x={40} y={152} r={-25} c={GREEN_SOFT} />
      <circle cx="66" cy="70" r="5" fill={YELLOW} />
      <circle cx="232" cy="62" r="6" fill={GREEN_SOFT} />
    </Scene>
  );
}

/** Rounded warning triangle — generic failure. */
function Warning() {
  return (
    <Scene>
      <path d="M140 58 L188 142 a8 8 0 0 1 -7 12 H99 a8 8 0 0 1 -7 -12 Z" fill={YELLOW} />
      <rect x="135" y="88" width="10" height="34" rx="5" fill={WHITE} />
      <circle cx="140" cy="136" r="5.5" fill={WHITE} />
      <Leaf x={42} y={152} r={-25} c={GREEN_SOFT} />
      <circle cx="68" cy="66" r="5" fill={BLUE_SOFT} />
      <circle cx="228" cy="150" r="6" fill={GREEN_SOFT} />
      <circle cx="234" cy="60" r="5" fill={RED_SOFT} />
    </Scene>
  );
}
