/**
 * Banner shown when the backend returns notes (e.g., generic fallback rendering).
 *
 * Sits below the breadcrumb / top bar.
 */

import { useArchStore } from "../../store/archStore";
import styles from "./GenericViewBanner.module.css";

export function GenericViewBanner() {
  const notes = useArchStore((s) => s.spec?.notes);
  if (!notes || notes.length === 0) return null;

  return (
    <div className={styles.banner}>
      {notes.map((n, i) => (
        <div key={i}>{n}</div>
      ))}
    </div>
  );
}
