/**
 * Section tabs — the left half of the nav's second row.
 *
 * Currently has only "Home". Add more entries here (e.g. "Docs", "About") as
 * the app grows; each new section is a `{ id, label }` row + a corresponding
 * branch in App.tsx's main-area renderer.
 *
 * Mirrors the visual treatment of `QuickModels` (same height, same active
 * underline) so the two strips read as a single tab row.
 */

import { clsx } from "clsx";

import { useArchStore, type View } from "../../store/archStore";
import styles from "./SectionTabs.module.css";

type Tab = Readonly<{
  id: View;
  label: string;
}>;

const TABS: ReadonlyArray<Tab> = [{ id: "home", label: "Home" }];

export function SectionTabs() {
  const view = useArchStore((s) => s.view);
  const setView = useArchStore((s) => s.setView);

  return (
    <nav aria-label="Sections" className={styles.nav}>
      {TABS.map(({ id, label }) => {
        const isActive = view === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
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
