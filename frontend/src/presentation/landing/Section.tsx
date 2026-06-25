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
import { SealBadge } from "./illustrations/SealBadge";
import styles from "./Section.module.css";

type Tone = "blue" | "red" | "yellow" | "green";

// Soft pastel shapes behind each diagram (lens.google style). Lens keeps the
// decorative shapes in the section's OWN family tone (blue panel → blue shapes)
// at full opacity, and mixes soft squircles with organic blobs across panels.
const SHAPE_COLOR: Record<Tone, string> = {
  blue: "var(--g-blue-container)",
  red: "var(--g-red-container)",
  yellow: "var(--g-yellow-container)",
  green: "var(--g-green-container)",
};
const SHAPE_FORMS: Record<Tone, readonly [string, string]> = {
  blue: [styles.formSquircle!, styles.formSquircle!],
  red: [styles.formSquircle!, styles.formPillPair!],
  yellow: [styles.formSquircle!, styles.formCircle!],
  green: [styles.formBlobA!, styles.formBlobB!],
};
// Vivid seal-badge fill per section. Yellow uses the darker `-ink` amber so the
// white glyph stays legible (plain --g-yellow is too light — see tokens.css).
const SEAL_COLOR: Record<Tone, string> = {
  blue: "var(--g-blue)",
  red: "var(--g-red)",
  yellow: "var(--g-yellow-ink)",
  green: "var(--g-green)",
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
  /** Optional lens-style glyph shown in a vivid scalloped seal badge. */
  badge?: ReactNode;
};

export function Section({ id, eyebrow, title, tone, children, art, flip, badge }: Props) {
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
        {/* Reveal when the card scrolls into view (an IntersectionObserver
         * toggles `.glided`): the card fades in and the decorative shapes slide
         * into place. Each shape is an outer slide-in wrapper around an inner
         * floating fill so the one-shot entrance and the looping float compose
         * instead of fighting over `transform` (see Section.module.css). */}
        <div ref={setArtRef} className={clsx(styles.art, artInView && styles.glided)}>
          <span aria-hidden="true" className={clsx(styles.shape, styles.shapeA)}>
            <span
              className={clsx(styles.shapeFill, styles.floatA, SHAPE_FORMS[tone][0])}
              style={{ color: SHAPE_COLOR[tone] }}
            />
          </span>
          <span aria-hidden="true" className={clsx(styles.shape, styles.shapeB)}>
            <span
              className={clsx(styles.shapeFill, styles.floatB, SHAPE_FORMS[tone][1])}
              style={{ color: SHAPE_COLOR[tone] }}
            />
          </span>
          {badge && (
            <div className={styles.seal}>
              <SealBadge color={SEAL_COLOR[tone]}>{badge}</SealBadge>
            </div>
          )}
          {/* Render the diagram in its final state; the card glides in as a whole. */}
          <RevealDisabledContext.Provider value={true}>{art}</RevealDisabledContext.Provider>
        </div>
      </div>
    </section>
  );
}
