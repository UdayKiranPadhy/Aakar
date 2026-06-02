/**
 * Final panel — a four-corner gradient card with the search pill + example
 * chips, plus the page footer. Reveals on scroll-in.
 */

import { motion } from "framer-motion";

import { ModelInputBar } from "../components/ModelInputBar";
import { ExampleChips } from "./ExampleChips";
import { Sparkle } from "./illustrations/Sparkle";
import { fadeUp, staggerContainer, useRevealProps } from "./motion";
import styles from "./CtaSection.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
};

export function CtaSection({ onSubmit }: Props) {
  const reveal = useRevealProps(0.3);
  return (
    <section className={styles.panel}>
      <motion.div className={styles.card} variants={staggerContainer(0.1)} {...reveal}>
        <Sparkle className={styles.sparkA} color="var(--g-yellow)" size={26} />
        <Sparkle className={styles.sparkB} color="var(--g-blue)" size={20} variant="dot" />
        <motion.p className={styles.eyebrow} variants={fadeUp}>
          Try it now
        </motion.p>
        <motion.h2 className={styles.h2} variants={fadeUp}>
          See inside your model
        </motion.h2>
        <motion.div className={styles.search} variants={fadeUp}>
          <ModelInputBar onSubmit={onSubmit} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <ExampleChips onSubmit={onSubmit} />
        </motion.div>
      </motion.div>

      <footer className={styles.footer}>
        <span className={styles.dots} aria-hidden="true">
          <i style={{ background: "var(--g-blue)" }} />
          <i style={{ background: "var(--g-red)" }} />
          <i style={{ background: "var(--g-yellow)" }} />
          <i style={{ background: "var(--g-green)" }} />
        </span>
        <span>
          <strong>Aakar</strong> — an educational LLM architecture visualizer.
        </span>
      </footer>
    </section>
  );
}
