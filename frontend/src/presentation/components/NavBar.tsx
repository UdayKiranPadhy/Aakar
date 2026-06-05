/**
 * Two-row top navigation, modelled on news.google.com.
 *
 * Row 1 — brand (left) + pill search (centered). Empty side spacers keep the
 * search centred on the page regardless of the brand's width.
 * Row 2 — SectionTabs + QuickModels (visualizer view only).
 *
 * The whole nav is a single visual unit (one hairline border below). The inner
 * `Brand` sub-component is private to this file; if it grows a second caller,
 * extract it.
 */

import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { ModelInputBar } from "./ModelInputBar";
import { SectionTabs } from "./SectionTabs";
import styles from "./NavBar.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
  /** Headroom pattern: when true the nav slides up out of view (on scroll-down). */
  hidden?: boolean;
};

export function NavBar({ onSubmit, hidden = false }: Props) {
  const setAppMode = useArchStore((s) => s.setAppMode);
  const appMode = useArchStore((s) => s.appMode);

  // The tab row (section tabs + quick-model chips) is only useful once you've
  // left the landing page. The home view shows just the top bar, and the nav
  // overlays the scrolling page there so hiding/showing it never shifts the
  // snap geometry.
  const showTabs = appMode !== "home";
  const overlay = appMode === "home";

  return (
    <div
      className={clsx(
        styles.wrapper,
        !showTabs && styles.wrapperSingle,
        overlay && styles.wrapperOverlay,
        hidden && styles.wrapperHidden,
      )}
    >
      <header className={styles.header}>
        <div className={styles.row1}>
          <div className={styles.side}>
            <Brand onClick={() => setAppMode("home")} />
          </div>
          <div className={styles.searchSlot}>
            <ModelInputBar onSubmit={onSubmit} />
          </div>
          <span aria-hidden="true" className={styles.side} />
        </div>
        {showTabs && (
          <div className={styles.row2}>
            <SectionTabs />
          </div>
        )}
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
