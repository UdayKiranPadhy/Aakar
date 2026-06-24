/**
 * A three-layer neural network — input → hidden → output, fully connected, with
 * nodes in bold Google colours. The universal "this is a model" image. Static
 * (decorative); colours come from colors.ts via the `style` prop (CSS custom
 * properties don't resolve inside SVG presentation attributes).
 */

import * as c from "./colors";
import styles from "./illustrations.module.css";

type P = { x: number; y: number; r: number; color: string };

const INPUT: P[] = [
  { x: 44, y: 50, r: 12, color: c.blue },
  { x: 44, y: 90, r: 12, color: c.blue },
  { x: 44, y: 130, r: 12, color: c.blue },
];
const HIDDEN: P[] = [
  { x: 120, y: 32, r: 12, color: c.red },
  { x: 120, y: 72, r: 12, color: c.yellow },
  { x: 120, y: 112, r: 12, color: c.green },
  { x: 120, y: 152, r: 12, color: c.blueStrong },
];
const OUTPUT: P[] = [
  { x: 196, y: 72, r: 14, color: c.blueStrong },
  { x: 196, y: 116, r: 14, color: c.blueStrong },
];

function edges(a: P[], b: P[]) {
  return a.flatMap((p) => b.map((q) => ({ p, q })));
}

function Node({ x, y, r, color }: P) {
  return <circle cx={x} cy={y} r={r} style={{ fill: color, stroke: c.white }} strokeWidth={2.5} />;
}

export function NeuralNetwork() {
  const lines = [...edges(INPUT, HIDDEN), ...edges(HIDDEN, OUTPUT)];
  return (
    <div className={styles.artCard}>
      <svg
        className={styles.svg}
        viewBox="0 0 240 180"
        role="img"
        aria-label="A neural network with input, hidden and output layers"
      >
        {lines.map(({ p, q }, i) => (
          <line
            key={i}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            style={{ stroke: c.inkSubtle }}
            strokeWidth={1.6}
            opacity={0.32}
          />
        ))}
        {[...INPUT, ...HIDDEN, ...OUTPUT].map((n, i) => (
          <Node key={i} {...n} />
        ))}
      </svg>
    </div>
  );
}
