/**
 * Decorative hero background — four soft Google-colour blobs that drift on
 * scroll (parallax via framer's `useScroll` bound to the scroll-root container)
 * plus a few sparkles. Parallax is disabled under reduced-motion. (The crisp
 * collage shapes are rendered per-card via CardShape, overhanging the corners.)
 */

import { useContext } from "react";
import type { RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { ScrollRootContext } from "../ScrollRootContext";
import { Sparkle } from "./Sparkle";
import styles from "./illustrations.module.css";

export function HeroBackdrop() {
  const root = useContext(ScrollRootContext);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll({
    container: (root ?? undefined) as RefObject<HTMLElement> | undefined,
  });

  const range = reduce ? [0, 0] : undefined;
  const yDown = useTransform(scrollY, [0, 700], range ?? [0, 90]);
  const yUp = useTransform(scrollY, [0, 700], range ?? [0, -70]);
  const ySlow = useTransform(scrollY, [0, 700], range ?? [0, 55]);

  return (
    <div className={styles.backdrop} aria-hidden="true">
      <motion.span className={`${styles.blob} ${styles.blobBlue}`} style={{ y: yDown }} />
      <motion.span className={`${styles.blob} ${styles.blobRed}`} style={{ y: yUp }} />
      <motion.span className={`${styles.blob} ${styles.blobYellow}`} style={{ y: ySlow }} />
      <motion.span className={`${styles.blob} ${styles.blobGreen}`} style={{ y: yUp }} />

      <Sparkle className={styles.sparkHeroA} color="var(--g-yellow)" size={32} />
      <Sparkle className={styles.sparkHeroB} color="var(--g-blue)" size={24} />
      <Sparkle className={styles.sparkHeroC} color="var(--g-green)" size={20} variant="dot" />
    </div>
  );
}
