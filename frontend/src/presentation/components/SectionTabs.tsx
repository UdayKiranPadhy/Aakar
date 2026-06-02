/**
 * Section tabs — the left half of the nav's second row.
 *
 * App-level tabs (cross-model): the loaded **Model** dashboard, **Compare**,
 * and **Learn**. Each is an `AppMode`; selecting one switches the main area
 * (see App.tsx). Per-model view switching (Overview / Config / …) lives in the
 * left ModelSidebar, not here.
 *
 * Mirrors the visual treatment of `QuickModels` (same height, same active
 * underline) so the two strips read as a single tab row.
 */

import { clsx } from "clsx";

import type { AppMode } from "../../domain/navigation";
import { useArchStore } from "../../store/archStore";
import styles from "./SectionTabs.module.css";

type Tab = Readonly<{
  id: AppMode;
  label: string;
}>;

const TABS: ReadonlyArray<Tab> = [
  { id: "model", label: "Model" },
  { id: "compare", label: "Compare" },
  { id: "learn", label: "Learn" },
];

export function SectionTabs() {
  const appMode = useArchStore((s) => s.appMode);
  const setAppMode = useArchStore((s) => s.setAppMode);

  return (
    <nav aria-label="Sections" className={styles.nav}>
      {TABS.map(({ id, label }) => {
        const isActive = appMode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setAppMode(id)}
            aria-current={isActive ? "page" : undefined}
            className={clsx(styles.tab, isActive && styles.tabActive)}
          >
            {label}
            {isActive && <span aria-hidden="true" className={styles.underline} />}
          </button>
        );
      })}
    </nav>
  );
}
