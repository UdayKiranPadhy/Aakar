/**
 * A stylized eye whose iris is concentric Google-colour rings — the "see
 * inside" idea (Aakar's tagline, echoing Google Lens). Static; colours via the
 * `style` prop (see colors.ts).
 */

import * as c from "./colors";
import styles from "./illustrations.module.css";

// Iris rings, outermost first.
const RINGS: ReadonlyArray<{ r: number; color: string }> = [
  { r: 46, color: c.blue },
  { r: 35, color: c.red },
  { r: 25, color: c.yellow },
  { r: 16, color: c.green },
];

const CX = 120;
const CY = 90;

export function LensEye() {
  return (
    <div className={styles.artCard}>
      <svg
        className={styles.svg}
        viewBox="0 0 240 180"
        role="img"
        aria-label="An eye with a Google-coloured iris, looking inside"
      >
        <defs>
          {/* Clip the iris to the eye opening so the rings sit inside the lid. */}
          <clipPath id="eyeClip">
            <path d="M26 90 Q120 18 214 90 Q120 162 26 90 Z" />
          </clipPath>
        </defs>

        {/* Eye outline. */}
        <path
          d="M26 90 Q120 18 214 90 Q120 162 26 90 Z"
          style={{ fill: c.white, stroke: c.ink }}
          strokeWidth={4}
        />

        {/* Iris: concentric Google-colour rings + pupil, clipped to the eye. */}
        <g clipPath="url(#eyeClip)">
          {RINGS.map((ring) => (
            <circle key={ring.r} cx={CX} cy={CY} r={ring.r} style={{ fill: ring.color }} />
          ))}
          <circle cx={CX} cy={CY} r={8} style={{ fill: c.ink }} />
          {/* Catch-light. */}
          <circle cx={CX - 13} cy={CY - 14} r={6} style={{ fill: c.white }} opacity={0.9} />
        </g>
      </svg>
    </div>
  );
}
