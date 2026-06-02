/**
 * Coverage panel — centred copy over a drifting "galaxy" of architecture names.
 */

import { motion } from "framer-motion";

import { ArchGalaxy } from "./illustrations/ArchGalaxy";
import { fadeUp, staggerContainer, useRevealProps } from "./motion";
import styles from "./CoverageSection.module.css";

export function CoverageSection() {
  const reveal = useRevealProps(0.3);
  return (
    <section className={styles.panel}>
      <motion.div className={styles.inner} variants={staggerContainer(0.12)} {...reveal}>
        <motion.p className={styles.eyebrow} variants={fadeUp}>
          Coverage
        </motion.p>
        <motion.h2 className={styles.h2} variants={fadeUp}>
          Any HuggingFace architecture, automatically
        </motion.h2>
        <motion.p className={styles.body} variants={fadeUp}>
          Llama, Qwen, Mistral, GPT-2, Gemma, Mixtral — anything stock <code>transformers</code>{" "}
          supports works with no per-family code. As the library grows, so does Aakar.
        </motion.p>
      </motion.div>
      <ArchGalaxy />
    </section>
  );
}
