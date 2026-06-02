/** Tokens fanning into a softmax·V focal node. Lines draw, glyphs pop. */

import { motion } from "framer-motion";

import { centerBox, drawLine, popIn, staggerContainer, useRevealProps } from "../motion";
import * as c from "./colors";
import styles from "./illustrations.module.css";

const TOKENS: ReadonlyArray<{ cy: number; color: string }> = [
  { cy: 50, color: c.blue },
  { cy: 98, color: c.red },
  { cy: 146, color: c.yellow },
  { cy: 194, color: c.green },
  { cy: 242, color: c.blueStrong },
  { cy: 290, color: c.red },
];

// Each fan line curves from a token (left) to the focal node (right).
const LINES: ReadonlyArray<{ d: string; color: string }> = [
  { d: "M84 50  C 220 50, 300 150, 392 150", color: c.blue },
  { d: "M84 98  C 220 98, 300 152, 392 152", color: c.red },
  { d: "M84 146 C 220 146, 300 154, 392 154", color: c.yellowInk },
  { d: "M84 194 C 220 194, 300 158, 392 158", color: c.green },
  { d: "M84 242 C 220 242, 300 162, 392 162", color: c.blueStrong },
  { d: "M84 290 C 220 290, 300 166, 392 166", color: c.red },
];

const CHIPS: ReadonlyArray<{ y: number; label: string; bg: string; stroke: string; fg: string }> = [
  { y: 92, label: "Q", bg: "var(--g-blue-subtle)", stroke: c.blue, fg: c.blueStrong },
  { y: 138, label: "K", bg: "var(--g-red-subtle)", stroke: c.red, fg: c.red },
  { y: 184, label: "V", bg: "var(--g-green-subtle)", stroke: c.green, fg: c.green },
];

export function AttentionFan() {
  const reveal = useRevealProps(0.4);
  return (
    <div className={styles.frame}>
      <motion.svg
        className={styles.svg}
        viewBox="0 0 520 320"
        role="img"
        aria-label="Query, key and value tokens fanning into a softmax node"
        variants={staggerContainer(0.09)}
        {...reveal}
      >
        {LINES.map((line, i) => (
          <motion.path
            key={i}
            variants={drawLine}
            d={line.d}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            style={{ stroke: line.color }}
          />
        ))}

        <motion.g variants={popIn} style={centerBox}>
          {TOKENS.map((t, i) => (
            <circle key={i} cx={84} cy={t.cy} r={11} style={{ fill: t.color }} />
          ))}
        </motion.g>
        <text x={84} y={314} textAnchor="middle" fontSize={11} style={{ fill: c.inkSubtle }}>
          tokens
        </text>

        {CHIPS.map((chip) => (
          <motion.g key={chip.label} variants={popIn} style={centerBox}>
            <rect x={220} y={chip.y} width={40} height={30} rx={9} style={{ fill: chip.bg, stroke: chip.stroke }} />
            <text x={240} y={chip.y + 20} textAnchor="middle" fontSize={13} fontWeight={600} style={{ fill: chip.fg }}>
              {chip.label}
            </text>
          </motion.g>
        ))}

        <motion.g variants={popIn} style={centerBox}>
          <rect x={392} y={120} width={104} height={78} rx={16} style={{ fill: c.white, stroke: c.blueStrong }} strokeWidth={2.5} />
          <text x={444} y={152} textAnchor="middle" fontSize={12} fontWeight={600} style={{ fill: c.ink }}>softmax</text>
          <text x={444} y={174} textAnchor="middle" fontSize={11} style={{ fill: c.inkMuted }}>· V</text>
        </motion.g>
      </motion.svg>
    </div>
  );
}
