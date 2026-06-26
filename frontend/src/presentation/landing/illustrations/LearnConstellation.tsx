/** A small "knowledge map": a central Concepts hub with labelled concept chips
 * orbiting it, joined by drawn connector lines. Lines draw in, chips + hub pop.
 * Echoes the Learn surface (concepts that connect into architectures). */

import { motion } from "framer-motion";

import { centerBox, drawLine, popIn, staggerContainer, useRevealProps } from "../motion";
import * as c from "./colors";
import styles from "./illustrations.module.css";

const HUB = { x: 262, y: 182 } as const;

type Chip = {
  x: number;
  y: number;
  w: number;
  label: string;
  color: string;
  bg: string;
};

// Five concepts spread around the hub, each in its own tone.
const CHIPS: ReadonlyArray<Chip> = [
  { x: 112, y: 60, w: 104, label: "Attention", color: c.blue, bg: "var(--g-blue-subtle)" },
  { x: 420, y: 66, w: 70, label: "MoE", color: c.green, bg: "var(--g-green-subtle)" },
  { x: 70, y: 250, w: 78, label: "RoPE", color: c.red, bg: "var(--g-red-subtle)" },
  { x: 452, y: 252, w: 104, label: "RMSNorm", color: c.yellowInk, bg: "var(--g-yellow-subtle)" },
  { x: 262, y: 326, w: 104, label: "KV Cache", color: c.blueStrong, bg: "var(--g-blue-subtle)" },
];

const CHIP_H = 32;

export function LearnConstellation() {
  const reveal = useRevealProps(0.4);
  return (
    <div className={styles.frame}>
      <motion.svg
        className={styles.svg}
        viewBox="0 0 520 360"
        role="img"
        aria-label="A knowledge map of AI concepts connected to a central hub"
        variants={staggerContainer(0.08)}
        {...reveal}
      >
        {/* Faint orbit rings behind everything. */}
        <circle cx={HUB.x} cy={HUB.y} r={118} fill="none" style={{ stroke: c.hair }} strokeWidth={1} strokeDasharray="2 7" />
        <circle cx={HUB.x} cy={HUB.y} r={172} fill="none" style={{ stroke: c.hair }} strokeWidth={1} strokeDasharray="2 7" />

        {/* Connectors hub → chip (drawn). Rendered first so chips sit on top. */}
        {CHIPS.map((chip) => (
          <motion.line
            key={`l-${chip.label}`}
            variants={drawLine}
            x1={HUB.x}
            y1={HUB.y}
            x2={chip.x}
            y2={chip.y}
            strokeWidth={2.2}
            strokeLinecap="round"
            style={{ stroke: chip.color, opacity: 0.5 }}
          />
        ))}

        {/* Concept chips. */}
        {CHIPS.map((chip) => (
          <motion.g key={chip.label} variants={popIn} style={centerBox}>
            <rect
              x={chip.x - chip.w / 2}
              y={chip.y - CHIP_H / 2}
              width={chip.w}
              height={CHIP_H}
              rx={CHIP_H / 2}
              style={{ fill: chip.bg, stroke: chip.color }}
              strokeWidth={1.5}
            />
            <circle cx={chip.x - chip.w / 2 + 15} cy={chip.y} r={4} style={{ fill: chip.color }} />
            <text x={chip.x + 8} y={chip.y + 4} textAnchor="middle" fontSize={12.5} fontWeight={600} style={{ fill: chip.color }}>
              {chip.label}
            </text>
          </motion.g>
        ))}

        {/* Central hub (on top). */}
        <motion.g variants={popIn} style={centerBox}>
          <rect x={HUB.x - 66} y={HUB.y - 26} width={132} height={52} rx={14} style={{ fill: c.purple }} />
          <text x={HUB.x} y={HUB.y + 5} textAnchor="middle" fontSize={15} fontWeight={700} style={{ fill: c.white }}>
            Concepts
          </text>
        </motion.g>
      </motion.svg>
    </div>
  );
}
