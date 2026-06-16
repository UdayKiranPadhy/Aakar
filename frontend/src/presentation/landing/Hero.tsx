/**
 * Hero panel (lens.google style): a centred headline with a cycling word + the
 * reused search pill, with the four architecture diagrams floating as small
 * cards in the corners (paired with the soft colour blobs behind them). Reveals
 * on mount; the cards drift via CSS float.
 */

import { motion } from "framer-motion";
import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { CyclingWord } from "./CyclingWord";
import { HeroBackdrop } from "./illustrations/HeroBackdrop";
import { AttentionFan } from "./illustrations/AttentionFan";
import { ModuleTree } from "./illustrations/ModuleTree";
import { WeightMatrix } from "./illustrations/WeightMatrix";
import { ZoomLadder } from "./illustrations/ZoomLadder";
import { fadeUp, RevealDisabledContext, staggerContainer } from "./motion";
import styles from "./Hero.module.css";

const CYCLE = ["Llama", "Qwen", "Mistral", "Gemma", "transformer"] as const;

export function Hero() {
  const requestSearchFocus = useArchStore((s) => s.requestSearchFocus);

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
        <motion.h1 className={styles.headline} variants={fadeUp} aria-label="See inside any model">
          <span aria-hidden="true">
            See inside any <CyclingWord words={CYCLE} />
          </span>
        </motion.h1>
        <br></br>
        <motion.p className={styles.lead} variants={fadeUp}>
          Not sure how LLM model is working internally?<br></br>
          Enter the model id, to know what's inside.
        </motion.p>
        <motion.div className={styles.cta} variants={fadeUp}>
          <button type="button" className={styles.enterButton} onClick={requestSearchFocus}>
            Enter Model
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
