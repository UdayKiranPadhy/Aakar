/**
 * Two-row top navigation, modelled on news.google.com.
 *
 * Row 1 — brand (left), pill search (center, ModelInputBar), action icons +
 * version (right).
 * Row 2 — SectionTabs + QuickModels, separated by a hairline.
 *
 * The whole nav is a single visual unit (one hairline border below). Inner
 * sub-components (`Brand`, `IconButton`, icon SVGs) are private to this file
 * because they have no other consumers; if any of them grows a second caller,
 * extract it.
 */

import { type ReactNode } from "react";
import { clsx } from "clsx";

import { useArchStore } from "../../store/archStore";
import { ModelInputBar } from "./ModelInputBar";
import { QuickModels } from "./QuickModels";
import { SectionTabs } from "./SectionTabs";
import styles from "./NavBar.module.css";

type Props = {
  onSubmit: (modelId: string) => void;
  /**
   * When true, the top row slides up out of view and the tab row stays put
   * (Google-Business "headroom" pattern). Implemented via:
   *   - the outer wrapper's height animating from 108px → 44px (so main
   *     content reflows up smoothly), and
   *   - the inner header translating -64px (one row height) in lockstep, with
   *     `overflow: visible` on the wrapper letting the now-hidden row 1 sit
   *     above the viewport's top edge.
   */
  collapsed?: boolean;
};

export function NavBar({ onSubmit, collapsed = false }: Props) {
  const setView = useArchStore((s) => s.setView);

  return (
    <div className={clsx(styles.wrapper, collapsed && styles.wrapperCollapsed)}>
      <header className={clsx(styles.header, collapsed && styles.headerCollapsed)}>
        <div className={styles.row1}>
          <Brand onClick={() => setView("home")} />
          <div className={styles.searchSlot}>
            <ModelInputBar onSubmit={onSubmit} />
          </div>
          <div className={styles.actions}>
            <IconButton title="Help" href="https://github.com/anthropics/aakar#readme">
              <HelpIcon />
            </IconButton>
            <IconButton title="GitHub" href="https://github.com/anthropics/aakar">
              <GitHubIcon />
            </IconButton>
            <span className={styles.version}>v0.1</span>
          </div>
        </div>
        <div className={styles.row2}>
          <SectionTabs />
          <span aria-hidden="true" className={styles.divider} />
          <QuickModels onSubmit={onSubmit} />
        </div>
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
    <a
      href="/"
      onClick={handleClick}
      className={styles.brand}
      aria-label="Aakar — home"
    >
      <span className={styles.brandText}>Aakar</span>
    </a>
  );
}

type IconButtonProps = {
  title: string;
  href?: string;
  children: ReactNode;
};

function IconButton({ title, href, children }: IconButtonProps) {
  if (href) {
    return (
      <a
        href={href}
        title={title}
        aria-label={title}
        target="_blank"
        rel="noreferrer"
        className={styles.iconButton}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" title={title} aria-label={title} className={styles.iconButton}>
      {children}
    </button>
  );
}

function HelpIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.7c0 1.4-2.4 2.1-2.4 3.3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.4 3-.405 1.02.005 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
