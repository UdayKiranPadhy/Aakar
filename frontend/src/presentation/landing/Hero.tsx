/**
 * Hero panel (lens.google style): a centred headline with a cycling word + the
 * reused search pill, with four bold illustrations floating as cards in the
 * corners — two of the architecture (neural network, transformer block) and two
 * of the "see inside" idea (an eye, a magnifier over a network), paired with the
 * soft colour blobs behind them. Reveals on mount; the cards drift via CSS float.
 */

import { motion } from "framer-motion";
import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { CyclingWord } from "./CyclingWord";
import { HeroBackdrop } from "./illustrations/HeroBackdrop";
import { NeuralNetwork } from "./illustrations/NeuralNetwork";
import { TransformerBlock } from "./illustrations/TransformerBlock";
import { LensEye } from "./illustrations/LensEye";
import { LensNetwork } from "./illustrations/LensNetwork";
import { fadeUp, RevealDisabledContext, staggerContainer } from "./motion";
import styles from "./Hero.module.css";

const CYCLE = ["Llama", "Qwen", "Mistral", "Gemma", "transformer"] as const;

export function Hero() {
  const setAppMode = useArchStore((s) => s.setAppMode);
  const requestSearchFocus = useArchStore((s) => s.requestSearchFocus);

  // "Enter Model" leaves the landing for the Model tab (→ /model), then requests
  // focus on its search. The nav (and its primary search field) only mounts once
  // we're off home, so the mount-time focus effect fires with the bumped nonce.
  const handleEnter = () => {
    setAppMode("model");
    requestSearchFocus();
  };

  return (
    <section className={styles.hero}>
      <HeroBackdrop />

      {/* Floating illustration cards in the corners (decorative, rendered static). */}
      <div className={styles.cards} aria-hidden="true">
        <RevealDisabledContext.Provider value={true}>
          <div className={clsx(styles.card, styles.cardTL)}>
            <NeuralNetwork />
          </div>
          <div className={clsx(styles.card, styles.cardTR)}>
            <TransformerBlock />
          </div>
          <div className={clsx(styles.card, styles.cardBL)}>
            <LensEye />
          </div>
          <div className={clsx(styles.card, styles.cardBR)}>
            <LensNetwork />
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
          <button type="button" className={styles.enterButton} onClick={handleEnter}>
            Enter Model
          </button>
        </motion.div>
      </motion.div>
    </section>
  );
}
