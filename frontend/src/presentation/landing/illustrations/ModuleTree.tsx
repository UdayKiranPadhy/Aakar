/** Model-id pill branching into the real nn.Module tree. Edges line-draw,
 * nodes pop in, when the section scrolls into view. */

import { motion } from "framer-motion";

import { centerBox, drawLine, popIn, staggerContainer, useRevealProps } from "../motion";
import * as c from "./colors";
import styles from "./illustrations.module.css";

type NodeProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  stroke: string;
  fill?: string;
  textFill?: string;
  fontSize?: number;
};

function Node({ x, y, w, h, label, stroke, fill = c.white, textFill = c.ink, fontSize = 13 }: NodeProps) {
  return (
    <motion.g variants={popIn} style={centerBox}>
      <rect x={x} y={y} width={w} height={h} rx={12} style={{ fill, stroke }} strokeWidth={2} />
      <text
        x={x + w / 2}
        y={y + h / 2}
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight={600}
        style={{ fill: textFill }}
      >
        {label}
      </text>
    </motion.g>
  );
}

const edgeProps = { fill: "none", strokeWidth: 2, strokeLinecap: "round" as const };

export function ModuleTree() {
  const reveal = useRevealProps(0.4);
  return (
    <div className={styles.frame}>
      <motion.svg
        className={styles.svg}
        viewBox="0 0 720 360"
        role="img"
        aria-label="A model id branching into its module tree"
        variants={staggerContainer(0.1)}
        {...reveal}
      >
        <motion.path variants={drawLine} d="M178 180 H210" style={{ stroke: c.hair }} {...edgeProps} />
        <motion.path variants={drawLine} d="M372 180 H392 V103 H410" style={{ stroke: c.blue }} {...edgeProps} />
        <motion.path variants={drawLine} d="M372 180 H392 V273 H410" style={{ stroke: c.green }} {...edgeProps} />
        <motion.path variants={drawLine} d="M558 103 H580 V46 H600" style={{ stroke: c.yellowInk }} {...edgeProps} />
        <motion.path variants={drawLine} d="M558 103 H580 V103 H600" style={{ stroke: c.blueStrong }} {...edgeProps} />
        <motion.path variants={drawLine} d="M558 103 H580 V160 H600" style={{ stroke: c.red }} {...edgeProps} />

        <Node x={14} y={158} w={164} h={44} label="meta-llama/Llama-3-8B" stroke={c.hair} fill={c.surface} textFill={c.inkMuted} fontSize={11.5} />
        <Node x={210} y={152} w={162} h={56} label="LlamaForCausalLM" stroke={c.blue} />
        <Node x={410} y={80} w={148} h={46} label="model" stroke={c.blue} />
        <Node x={410} y={250} w={148} h={46} label="lm_head" stroke={c.green} />
        <Node x={600} y={24} w={116} h={42} label="embed_tokens" stroke={c.yellowInk} fontSize={12} />
        <Node x={600} y={82} w={116} h={42} label="layers ×32" stroke={c.blueStrong} fontSize={12} />
        <Node x={600} y={140} w={116} h={42} label="norm" stroke={c.red} fontSize={12} />
      </motion.svg>
    </div>
  );
}
