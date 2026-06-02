/**
 * A word that cycles through a list with a fade/slide swap (lens.google's
 * "Search/Translate what you see" trick). A hidden "ghost" of the longest word
 * reserves width so the surrounding headline doesn't reflow on each swap.
 * Under reduced-motion it renders a single static word.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import styles from "./CyclingWord.module.css";

const COLORS = [
  "var(--g-blue-strong)",
  "var(--g-red)",
  "var(--g-green)",
  "var(--g-yellow-ink)",
  "var(--g-blue)",
];

type Props = {
  words: ReadonlyArray<string>;
  intervalMs?: number;
};

export function CyclingWord({ words, intervalMs = 2200 }: Props) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce || words.length <= 1) return;
    const id = window.setInterval(() => setI((n) => (n + 1) % words.length), intervalMs);
    return () => window.clearInterval(id);
  }, [reduce, words.length, intervalMs]);

  if (reduce) {
    return <span style={{ color: COLORS[0] }}>{words[0]}</span>;
  }

  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");

  return (
    <span className={styles.cycle}>
      <span className={styles.ghost} aria-hidden="true">
        {longest}
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[i]}
          className={styles.word}
          style={{ color: COLORS[i % COLORS.length] }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
          {words[i]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
