/** A weight matrix whose cells pop in cell-by-cell, a few lit in Google
 * colours, with a floating shape glyph. */

import { motion } from "framer-motion";

import { centerBox, popIn, staggerContainer, useRevealProps } from "../motion";
import * as c from "./colors";
import styles from "./illustrations.module.css";

const COLS = 8;
const ROWS = 6;
const SIZE = 34;
const GAP = 6;
const PAD_X = 16;
const PAD_Y = 12;

// Sparse map of cell index → accent colour; the rest are neutral.
const ACCENTS: Record<number, string> = {
  4: c.blue,
  11: c.red,
  19: c.yellow,
  22: c.green,
  29: c.blueStrong,
  35: c.red,
  40: c.green,
  45: c.blue,
};

const cells = Array.from({ length: COLS * ROWS }, (_, i) => i);

export function WeightMatrix() {
  const reveal = useRevealProps(0.4);
  return (
    <div className={styles.frame}>
      <motion.svg
        className={styles.svg}
        viewBox="0 0 360 260"
        role="img"
        aria-label="A weight matrix filling cell by cell"
        variants={staggerContainer(0.1)}
        {...reveal}
      >
        <motion.g variants={staggerContainer(0.016)}>
          {cells.map((i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            return (
              <motion.rect
                key={i}
                variants={popIn}
                style={{ ...centerBox, fill: ACCENTS[i] ?? "var(--color-hairline)" }}
                x={PAD_X + col * (SIZE + GAP)}
                y={PAD_Y + row * (SIZE + GAP)}
                width={SIZE}
                height={SIZE}
                rx={6}
              />
            );
          })}
        </motion.g>
      </motion.svg>
      <span className={styles.glyph}>[4096 × 128256]</span>
    </div>
  );
}
