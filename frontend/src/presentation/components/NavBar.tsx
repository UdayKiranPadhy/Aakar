/**
 * Single-row top navigation: brand (left) + the SectionTabs centred in the
 * middle (Model / Compare / Learn). One visual unit with a hairline border
 * below.
 *
 * The inner `Brand` sub-component is private to this file; if it grows a second
 * caller, extract it.
 */

import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { SectionTabs } from "./SectionTabs";
import { TopProgressBar } from "./TopProgressBar";
import styles from "./NavBar.module.css";

type Props = {
  /** Headroom pattern: when true the whole nav slides up out of view (home). */
  hidden?: boolean;
};

export function NavBar({ hidden = false }: Props) {
  const setAppMode = useArchStore((s) => s.setAppMode);
  const appMode = useArchStore((s) => s.appMode);
  const loading = useArchStore((s) => s.loading);

  // The section tabs are only useful once you've left the landing page. The home
  // view shows just the brand, and the nav overlays the scrolling page there so
  // hiding/showing it never shifts the snap geometry.
  const showTabs = appMode !== "home";
  const overlay = appMode === "home";

  return (
    <div
      className={clsx(
        styles.wrapper,
        overlay && styles.wrapperOverlay,
        hidden && styles.wrapperHidden,
      )}
    >
      <header className={styles.header}>
        <div className={styles.row}>
          <Brand onClick={() => setAppMode("home")} />
          {showTabs && (
            <div className={styles.tabsSlot}>
              <SectionTabs />
            </div>
          )}
        </div>
        {loading && <TopProgressBar />}
      </header>
    </div>
  );
}

function Brand({ onClick }: { onClick: () => void }) {
  // Reset the route to the home view rather than reloading the page; preserves
  // the loaded spec so users can return to it via a quick-model tab.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onClick();
  };
  return (
    <a href="/" onClick={handleClick} className={styles.brand} aria-label="Aakar — home">
      <span className={styles.brandText}>Aakar</span>
    </a>
  );
}
