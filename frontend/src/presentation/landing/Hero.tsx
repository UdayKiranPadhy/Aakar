/**
 * Hero panel (lens.google style): a centred headline with a cycling word + the
 * reused search pill, with five bold illustrations floating as cards laid out
 * like the lens.google banner — two flanking the headline up top, three spread
 * across the foot — paired with the soft colour blobs + collage shapes behind
 * them. Reveals on mount; the cards drift via CSS float. The bottom-left image
 * (TravelingImage) detaches and scrolls into the next section on scroll.
 */

import { motion } from "framer-motion";
import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { CyclingWord } from "./CyclingWord";
import { HeroBackdrop } from "./illustrations/HeroBackdrop";
import { CardShape } from "./illustrations/CardShape";
import { NeuralNetwork } from "./illustrations/NeuralNetwork";
import { TransformerBlock } from "./illustrations/TransformerBlock";
import { Tokenization } from "./illustrations/Tokenization";
import { LensNetwork } from "./illustrations/LensNetwork";
import { TravelingImage } from "./illustrations/TravelingImage";
import { fadeUp, RevealDisabledContext, staggerContainer } from "./motion";
import styles from "./Hero.module.css";

const CYCLE = ["Llama", "Qwen", "Mistral", "Gemma", "transformer"] as const;

export function Hero() {
  const setAppMode = useArchStore((s) => s.setAppMode);
  const requestSearchFocus = useArchStore((s) => s.requestSearchFocus);

  // "Enter Model" leaves the landing for the Model tab (→ /model), then requests
  // focus on its search. The Model tab's landing (and its search field) mounts
  // once we're off home, so its mount-time focus effect fires with the bumped nonce.
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
          {/* Top row (flanks the headline). Each card carries a collage shape
           * that overhangs one of its corners (lens.google style). */}
          <div className={clsx(styles.card, styles.cardTL)}>
            <NeuralNetwork />
            <CardShape variant="cream" />
          </div>
          <div className={clsx(styles.card, styles.cardTR)}>
            <TransformerBlock />
            <CardShape variant="mint" />
          </div>
          {/* Bottom row. The bottom-left's decorative shape stays here in the
           * hero; only its image travels into the next section (TravelingImage). */}
          <div className={clsx(styles.card, styles.cardBL)}>
            <CardShape variant="blue" />
          </div>
          <div className={clsx(styles.card, styles.cardBC)}>
            <Tokenization />
            <CardShape variant="pink" />
          </div>
          <div className={clsx(styles.card, styles.cardBR)}>
            <LensNetwork />
            <CardShape variant="green" />
          </div>
        </RevealDisabledContext.Provider>
      </div>

      {/* Bottom-left image: detaches and travels into the next section on
       * scroll (the other cards stay put). */}
      <TravelingImage />

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
