/** Four levels of zoom: model → backbone → decoder block → matmul. Each frame
 * pops in, staggered. */

import { motion } from "framer-motion";

import { centerBox, popIn, staggerContainer, useRevealProps } from "../motion";
import * as c from "./colors";
import styles from "./illustrations.module.css";

const matmulCells = [
  0.85, 0.4, 0.7, 0.3, 0.9, 0.4, 0.85, 0.3, 0.7, 0.45, 0.7, 0.35, 0.9, 0.5, 0.8,
];

export function ZoomLadder() {
  const reveal = useRevealProps(0.4);
  return (
    <div className={styles.frame}>
      <motion.svg
        className={styles.svg}
        viewBox="0 0 520 360"
        role="img"
        aria-label="Four levels of zoom from the model down to a matmul"
        variants={staggerContainer(0.14)}
        {...reveal}
      >
        {/* 1 · Model */}
        <motion.g variants={popIn} style={centerBox}>
          <rect x={16} y={16} width={232} height={152} rx={16} style={{ fill: "var(--g-blue-subtle)", stroke: c.blue }} strokeWidth={2} />
          <text x={34} y={44} fontSize={12} fontWeight={600} style={{ fill: c.blueStrong }}>1 · Model</text>
          <rect x={34} y={58} width={196} height={40} rx={9} style={{ fill: c.white, stroke: c.blue }} />
          <text x={132} y={82} textAnchor="middle" fontSize={12} style={{ fill: c.ink }}>LlamaForCausalLM</text>
          <rect x={34} y={108} width={120} height={34} rx={9} style={{ fill: c.white, stroke: c.hair }} />
          <text x={94} y={130} textAnchor="middle" fontSize={11} style={{ fill: c.inkMuted }}>lm_head</text>
        </motion.g>

        {/* 2 · Backbone */}
        <motion.g variants={popIn} style={centerBox}>
          <rect x={272} y={16} width={232} height={152} rx={16} style={{ fill: "var(--g-red-subtle)", stroke: c.red }} strokeWidth={2} />
          <text x={290} y={44} fontSize={12} fontWeight={600} style={{ fill: c.red }}>2 · Backbone</text>
          <rect x={290} y={58} width={196} height={26} rx={7} style={{ fill: c.white, stroke: c.red }} />
          <text x={388} y={75} textAnchor="middle" fontSize={11} style={{ fill: c.ink }}>embed_tokens</text>
          <rect x={290} y={90} width={196} height={26} rx={7} style={{ fill: c.white, stroke: c.red }} />
          <text x={388} y={107} textAnchor="middle" fontSize={11} style={{ fill: c.ink }}>layers ×32</text>
          <rect x={290} y={122} width={196} height={26} rx={7} style={{ fill: c.white, stroke: c.hair }} />
          <text x={388} y={139} textAnchor="middle" fontSize={11} style={{ fill: c.inkMuted }}>norm</text>
        </motion.g>

        {/* 3 · Decoder block */}
        <motion.g variants={popIn} style={centerBox}>
          <rect x={16} y={190} width={232} height={152} rx={16} style={{ fill: "var(--g-yellow-subtle)", stroke: c.yellow }} strokeWidth={2} />
          <text x={34} y={218} fontSize={12} fontWeight={600} style={{ fill: c.yellowInk }}>3 · Decoder block</text>
          <g fontSize={10.5} textAnchor="middle">
            <rect x={34} y={238} width={46} height={32} rx={8} style={{ fill: c.white, stroke: c.yellowInk }} />
            <text x={57} y={258} style={{ fill: c.ink }}>Norm</text>
            <rect x={86} y={238} width={50} height={32} rx={8} style={{ fill: c.white, stroke: c.blue }} />
            <text x={111} y={258} style={{ fill: c.ink }}>Attn</text>
            <rect x={142} y={238} width={28} height={32} rx={8} style={{ fill: c.white, stroke: c.blueStrong }} />
            <text x={156} y={258} style={{ fill: c.blueStrong }}>+</text>
            <rect x={176} y={238} width={44} height={32} rx={8} style={{ fill: c.white, stroke: c.green }} />
            <text x={198} y={258} style={{ fill: c.ink }}>MLP</text>
            <rect x={34} y={290} width={28} height={32} rx={8} style={{ fill: c.white, stroke: c.blueStrong }} />
            <text x={48} y={310} style={{ fill: c.blueStrong }}>+</text>
          </g>
        </motion.g>

        {/* 4 · Matmul */}
        <motion.g variants={popIn} style={centerBox}>
          <rect x={272} y={190} width={232} height={152} rx={16} style={{ fill: "var(--g-green-subtle)", stroke: c.green }} strokeWidth={2} />
          <text x={290} y={218} fontSize={12} fontWeight={600} style={{ fill: c.green }}>4 · Matmul</text>
          {matmulCells.map((op, i) => {
            const col = i % 5;
            const row = Math.floor(i / 5);
            return (
              <rect
                key={i}
                x={300 + col * 26}
                y={232 + row * 26}
                width={20}
                height={20}
                rx={4}
                style={{ fill: c.green, opacity: op }}
              />
            );
          })}
          <text x={388} y={328} textAnchor="middle" fontSize={10.5} style={{ fill: c.inkMuted }}>q_proj · k_proj · v_proj</text>
        </motion.g>
      </motion.svg>
    </div>
  );
}
