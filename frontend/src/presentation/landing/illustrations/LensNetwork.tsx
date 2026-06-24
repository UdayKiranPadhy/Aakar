/**
 * A magnifying glass held over a small neural network — the literal "see inside
 * the model" image (and a nod to Google Lens). The glass enlarges a couple of
 * nodes within its rim. Static; colours via the `style` prop (see colors.ts).
 */

import * as c from "./colors";
import styles from "./illustrations.module.css";

const LENS_CX = 150;
const LENS_CY = 90;
const LENS_R = 52;

export function LensNetwork() {
  return (
    <div className={styles.artCard}>
      <svg
        className={styles.svg}
        viewBox="0 0 240 180"
        role="img"
        aria-label="A magnifying glass examining a neural network"
      >
        <defs>
          <clipPath id="lensClip">
            <circle cx={LENS_CX} cy={LENS_CY} r={LENS_R} />
          </clipPath>
        </defs>

        {/* Background network being inspected. */}
        <g>
          <line x1={42} y1={46} x2={92} y2={70} style={{ stroke: c.inkSubtle }} strokeWidth={1.8} opacity={0.4} />
          <line x1={42} y1={104} x2={92} y2={70} style={{ stroke: c.inkSubtle }} strokeWidth={1.8} opacity={0.4} />
          <line x1={92} y1={70} x2={132} y2={84} style={{ stroke: c.inkSubtle }} strokeWidth={1.8} opacity={0.4} />
          <circle cx={42} cy={46} r={11} style={{ fill: c.blue }} />
          <circle cx={42} cy={104} r={11} style={{ fill: c.green }} />
          <circle cx={92} cy={70} r={11} style={{ fill: c.yellow }} />
        </g>

        {/* Glass: tinted fill + magnified detail clipped to the rim. */}
        <circle
          cx={LENS_CX}
          cy={LENS_CY}
          r={LENS_R}
          style={{ fill: "var(--g-blue-subtle)" }}
          fillOpacity={0.7}
        />
        <g clipPath="url(#lensClip)">
          <line x1={126} y1={78} x2={170} y2={104} style={{ stroke: c.inkSubtle }} strokeWidth={2.4} opacity={0.5} />
          <circle cx={126} cy={78} r={16} style={{ fill: c.red }} />
          <circle cx={172} cy={106} r={18} style={{ fill: c.blue }} />
        </g>

        {/* Rim + handle. */}
        <circle cx={LENS_CX} cy={LENS_CY} r={LENS_R} fill="none" style={{ stroke: c.blueStrong }} strokeWidth={9} />
        <line
          x1={188}
          y1={128}
          x2={222}
          y2={162}
          style={{ stroke: c.red }}
          strokeWidth={12}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
