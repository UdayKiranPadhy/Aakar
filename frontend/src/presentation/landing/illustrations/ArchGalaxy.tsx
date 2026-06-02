/**
 * Scattered, drifting chips of architecture-family names. Decorative — the
 * names are also listed in the section copy, so this is aria-hidden.
 */

import { type CSSProperties } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

import { popIn, staggerContainer, useRevealProps } from "../motion";
import styles from "./illustrations.module.css";

type Tone = "Blue" | "Red" | "Yellow" | "Green";
type Chip = { label: string; tone: Tone; pos: CSSProperties };

const CHIPS: ReadonlyArray<Chip> = [
  { label: "Llama", tone: "Blue", pos: { top: "8%", left: "10%" } },
  { label: "Qwen2.5", tone: "Red", pos: { top: "2%", left: "44%" } },
  { label: "Mistral", tone: "Yellow", pos: { top: "14%", right: "8%" } },
  { label: "GPT-2", tone: "Green", pos: { top: "42%", left: "4%" } },
  { label: "Gemma", tone: "Blue", pos: { top: "46%", left: "36%" } },
  { label: "Mixtral", tone: "Red", pos: { top: "38%", right: "14%" } },
  { label: "Phi-3", tone: "Yellow", pos: { top: "74%", left: "14%" } },
  { label: "Qwen3", tone: "Green", pos: { top: "78%", left: "48%" } },
  { label: "Falcon", tone: "Blue", pos: { top: "70%", right: "10%" } },
];

export function ArchGalaxy() {
  const reveal = useRevealProps(0.25);
  return (
    <motion.div
      className={styles.galaxy}
      variants={staggerContainer(0.07)}
      aria-hidden="true"
      {...reveal}
    >
      {CHIPS.map((chip) => (
        <motion.span
          key={chip.label}
          variants={popIn}
          style={chip.pos}
          className={clsx(styles.glx, styles[`glx${chip.tone}`])}
        >
          {chip.label}
        </motion.span>
      ))}
    </motion.div>
  );
}
