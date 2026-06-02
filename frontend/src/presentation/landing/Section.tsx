/**
 * Generic scroll-snap panel: eyebrow + title + body copy on one side, an
 * illustration on the other. Copy reveals (staggered fade-up) when the panel
 * scrolls into the container; the illustration owns its own reveal internally.
 */

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

import { fadeUp, RevealDisabledContext, staggerContainer, useRevealProps } from "./motion";
import { useInView } from "./useInView";
import styles from "./Section.module.css";

type Tone = "blue" | "red" | "yellow" | "green";

// Two decorative shapes float behind each diagram (lens.google style). Their
// colours contrast with the band tone so they read against the tinted band.
const SHAPE_COLORS: Record<Tone, readonly [string, string]> = {
  blue: ["var(--g-red)", "var(--g-yellow)"],
  red: ["var(--g-blue)", "var(--g-green)"],
  yellow: ["var(--g-blue)", "var(--g-green)"],
  green: ["var(--g-blue)", "var(--g-red)"],
};

type Props = {
  id?: string;
  eyebrow: string;
  title: string;
  tone: Tone;
  /** Body copy (may contain <code> spans). */
  children: ReactNode;
  /** Illustration node (self-revealing). */
  art: ReactNode;
  /** Place the illustration on the left. */
  flip?: boolean;
};

export function Section({ id, eyebrow, title, tone, children, art, flip }: Props) {
  const reveal = useRevealProps(0.35);
  const [setArtRef, artInView] = useInView(0.3);
  return (
    <section id={id} className={clsx(styles.panel, styles[`band_${tone}`])}>
      <div className={clsx(styles.split, flip && styles.flip)}>
        <motion.div className={styles.copy} variants={staggerContainer(0.12)} {...reveal}>
          <motion.p className={clsx(styles.eyebrow, styles[`tone_${tone}`])} variants={fadeUp}>
            {eyebrow}
          </motion.p>
          <motion.h2 className={styles.h2} variants={fadeUp}>
            {title}
          </motion.h2>
          <motion.div className={styles.body} variants={fadeUp}>
            {children}
          </motion.div>
        </motion.div>
        {/* Fade in when the card scrolls into view (an IntersectionObserver
         * toggles `.glided`). Opacity only — no slide/transform. */}
        <div ref={setArtRef} className={clsx(styles.art, artInView && styles.glided)}>
          <span
            aria-hidden="true"
            className={clsx(styles.shape, styles.shapeA)}
            style={{ background: SHAPE_COLORS[tone][0] }}
          />
          <span
            aria-hidden="true"
            className={clsx(styles.shape, styles.shapeB)}
            style={{ background: SHAPE_COLORS[tone][1] }}
          />
          {/* Render the diagram in its final state; the card glides in as a whole. */}
          <RevealDisabledContext.Provider value={true}>{art}</RevealDisabledContext.Provider>
        </div>
      </div>
    </section>
  );
}
