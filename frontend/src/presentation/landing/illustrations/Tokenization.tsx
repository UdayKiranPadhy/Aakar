/**
 * Tokenization — input text split into sub-word tokens (coloured pills) with
 * their token ids beneath. The first step of an LLM pipeline; mirrors the
 * "note/paper" image in the lens.google banner's centre slot. Static; colours
 * via the `style` prop (CSS custom properties don't resolve in SVG presentation
 * attributes — see colors.ts).
 */

import * as c from "./colors";
import styles from "./illustrations.module.css";

type Tok = { label: string; id: string; color: string; dark?: boolean };

const PAD = 18;
const PW = 46;
const GAP = 6;
const PY = 66;
const PH = 36;

const TOKENS: readonly Tok[] = [
  { label: "The", id: "464", color: c.blue },
  { label: "cat", id: "2415", color: c.green },
  { label: "sat", id: "2938", color: c.red },
  { label: "on", id: "2006", color: c.yellow, dark: true },
];

export function Tokenization() {
  return (
    <div className={styles.artCard}>
      <svg
        className={styles.svg}
        viewBox="0 0 240 180"
        role="img"
        aria-label="Input text split into coloured tokens with their token ids"
      >
        {/* Input text. */}
        <rect x={18} y={16} width={204} height={30} rx={10} style={{ fill: c.surface, stroke: c.hair }} strokeWidth={1.5} />
        <text x={32} y={36} fontSize={12} style={{ fill: c.inkMuted }}>
          The cat sat on…
        </text>

        {TOKENS.map((t, i) => {
          const x = PAD + i * (PW + GAP);
          const cx = x + PW / 2;
          return (
            <g key={t.label}>
              {/* Tick linking the text to its token. */}
              <line x1={cx} y1={48} x2={cx} y2={62} style={{ stroke: c.hair }} strokeWidth={1.5} />
              <rect x={x} y={PY} width={PW} height={PH} rx={9} style={{ fill: t.color }} />
              <text
                x={cx}
                y={PY + PH / 2}
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                style={{ fill: t.dark ? c.ink : c.white }}
              >
                {t.label}
              </text>
              <text x={cx} y={124} textAnchor="middle" fontSize={9.5} fontFamily="var(--font-mono)" style={{ fill: c.inkSubtle }}>
                {t.id}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
