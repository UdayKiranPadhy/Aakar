/**
 * The travelling token — a single glowing element JourneyView positions over the
 * active stage (gliding between stops via a CSS transition). Tinted to the active
 * stage's tone by the `--tone` CSS var JourneyView sets on it.
 */

import { forwardRef } from "react";

import styles from "./JourneyView.module.css";

export const TokenPulse = forwardRef<HTMLDivElement, { label: string }>(function TokenPulse(
  { label },
  ref,
) {
  return (
    <div ref={ref} className={styles.pulse} aria-hidden="true">
      <span className={styles.pulseChip}>{label}</span>
      <span className={styles.pulseCore} />
    </div>
  );
});
