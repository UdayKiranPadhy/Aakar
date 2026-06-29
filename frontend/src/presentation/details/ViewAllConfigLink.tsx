/**
 * Bridges a module's curated detail panel to the full, uncurated model config —
 * the Config tab renders `spec.config_full` (every attribute the architecture
 * declares). One click; no duplication of that data into the panel.
 */

import { useArchStore } from "../../store/archStore";
import styles from "./GenericDetailPanel.module.css";

export function ViewAllConfigLink() {
  const setModelView = useArchStore((s) => s.setModelView);
  return (
    <button
      type="button"
      className={styles.configLink}
      onClick={() => setModelView("config")}
    >
      View full model config →
    </button>
  );
}
