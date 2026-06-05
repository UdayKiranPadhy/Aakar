/**
 * The "pipe" between two stages — shows the tensor shape flowing through and
 * highlights it when the shape changes (embedding, LM head).
 */

import { clsx } from "clsx";

import styles from "./JourneyView.module.css";

export function JourneyConnector({
  shape,
  changed = false,
}: {
  shape: string | null;
  changed?: boolean;
}) {
  return (
    <div className={clsx(styles.connector, changed && styles.connectorChanged)} aria-hidden="true">
      {shape && <span className={styles.connectorShape}>{shape}</span>}
    </div>
  );
}
