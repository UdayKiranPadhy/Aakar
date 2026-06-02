/**
 * Hero panel (lens.google style): a centred headline with a cycling word + the
 * reused search pill, with the four architecture diagrams floating as small
 * cards in the corners (paired with the soft colour blobs behind them). Reveals
 * on mount; the cards drift via CSS float.
 */

import { motion } from "framer-motion";
import { clsx } from "clsx";

import { ModelInputBar } from "../components/ModelInputBar";
import { CyclingWord } from "./CyclingWord";
import { ExampleChips } from "./ExampleChips";
import { HeroBackdrop } from "./illustrations/HeroBackdrop";
import { AttentionFan } from "./illustrations/AttentionFan";
import { ModuleTree } from "./illustrations/ModuleTree";
import { WeightMatrix } from "./illustrations/WeightMatrix";
import { ZoomLadder } from "./illustrations/ZoomLadder";
import { fadeUp, RevealDisabledContext, staggerContainer } from "./motion";
import styles from "./Hero.module.css";

const CYCLE = ["Llama", "Qwen", "Mistral", "Gemma", "transformer"] as const;

type Props = {
  onSubmit: (modelId: string) => void;
};

export function Hero({ onSubmit }: Props) {
  return (
    <section className={styles.hero}>
      <HeroBackdrop />

      {/* Floating diagram cards in the corners (decorative, rendered static). */}
      <div className={styles.cards} aria-hidden="true">
        <RevealDisabledContext.Provider value={true}>
          <div className={clsx(styles.card, styles.cardTL)}>
            <ModuleTree />
          </div>
          <div className={clsx(styles.card, styles.cardTR)}>
            <ZoomLadder />
          </div>
          <div className={clsx(styles.card, styles.cardBL)}>
            <AttentionFan />
          </div>
          <div className={clsx(styles.card, styles.cardBR)}>
            <WeightMatrix />
          </div>
        </RevealDisabledContext.Provider>
      </div>

      <motion.div
        className={styles.inner}
        initial="hidden"
        animate="shown"
        variants={staggerContainer(0.09, 0.1)}
      >
        <motion.p className={styles.eyebrow} variants={fadeUp}>
          LLM architecture visualizer
        </motion.p>
        <motion.h1 className={styles.headline} variants={fadeUp} aria-label="See inside any model">
          <span aria-hidden="true">
            See inside any <CyclingWord words={CYCLE} />
          </span>
        </motion.h1>
        <motion.p className={styles.lead} variants={fadeUp}>
          Paste a HuggingFace model id and watch its real architecture unfold — the module tree,
          tensor shapes, attention, and parameter scale, as a clickable diagram.
        </motion.p>
        <motion.div className={styles.search} variants={fadeUp}>
          <ModelInputBar onSubmit={onSubmit} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <ExampleChips onSubmit={onSubmit} />
        </motion.div>
      </motion.div>

      <div className={styles.cue} aria-hidden="true">
        <span>Scroll to explore</span>
        <svg
          className={styles.cueArrow}
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </div>
    </section>
  );
}
