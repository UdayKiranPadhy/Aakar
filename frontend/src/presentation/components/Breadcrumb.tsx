/**
 * Breadcrumb strip — visible only when expansionPath is non-empty.
 *
 * Each segment is a button that collapses to that level.
 */

import { useNavigation } from "../../application/useNavigation";
import { useArchStore } from "../../store/archStore";
import styles from "./Breadcrumb.module.css";

export function Breadcrumb() {
  const modelId = useArchStore((s) => s.spec?.model_id);
  const { breadcrumb, goToLevel, goToRoot } = useNavigation();

  if (breadcrumb.length === 0) return null;

  return (
    <nav aria-label="Architecture navigation" className={styles.nav}>
      <button type="button" onClick={goToRoot} className={styles.rootButton}>
        ← {modelId ?? "root"}
      </button>
      {breadcrumb.map((node, i) => {
        const isLast = i === breadcrumb.length - 1;
        return (
          <span key={node.id} className={styles.segment}>
            <span className={styles.chevron}>›</span>
            <button
              type="button"
              onClick={() => goToLevel((i + 2) as 1 | 2 | 3)}
              className={isLast ? styles.crumbCurrent : styles.crumbLink}
              disabled={isLast}
            >
              {node.label}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
