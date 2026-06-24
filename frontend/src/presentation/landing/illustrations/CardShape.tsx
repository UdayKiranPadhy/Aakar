/**
 * A single decorative collage shape (squircle or blob, lens.google style) that
 * overhangs a corner of its PARENT card. Rendered inside the card (which is the
 * positioned ancestor) and on top of the illustration, so it stays glued to the
 * image at every viewport size — unlike a viewport-positioned layer, which
 * drifts off the fixed-width cards as the window resizes.
 *
 * Form + colour + which corner it overhangs are all set by the per-variant
 * classes in illustrations.module.css.
 */

import styles from "./illustrations.module.css";

type Variant = "cream" | "mint" | "blue" | "pink" | "green";

const VARIANT_CLASSES: Record<Variant, string> = {
  cream: `${styles.decoSquircle} ${styles.decoCream}`,
  mint: `${styles.decoBlobA} ${styles.decoMint}`,
  blue: `${styles.decoSquircle} ${styles.decoBlue}`,
  pink: `${styles.decoBlobB} ${styles.decoPink}`,
  green: `${styles.decoBlobA} ${styles.decoGreen}`,
};

export function CardShape({ variant }: { variant: Variant }) {
  return <span className={`${styles.deco} ${VARIANT_CLASSES[variant]}`} aria-hidden="true" />;
}
