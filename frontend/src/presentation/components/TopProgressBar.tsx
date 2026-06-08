/**
 * Thin indeterminate progress bar shown at the bottom edge of the nav while a
 * model loads. Re-creates Material's "linear indeterminate" look in pure CSS
 * (see the module) — no MUI. Indeterminate, so it carries no aria-valuenow.
 */

import styles from "./TopProgressBar.module.css";

export function TopProgressBar() {
  return (
    <div className={styles.track} role="progressbar" aria-label="Loading model architecture">
      <span className={styles.bar1} />
      <span className={styles.bar2} />
    </div>
  );
}
