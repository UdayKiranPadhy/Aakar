/**
 * Keyboard-shortcut help dialog (opened with `?`). A modal ARIA dialog with a
 * hand-rolled focus trap (no extra dependency, matching the Tooltip/Combobox
 * portals): focus moves in on open and is restored on close, Tab cycles within,
 * Escape and a backdrop click dismiss.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { useArchStore } from "../../store/archStore";
import styles from "./HelpOverlay.module.css";

type Shortcut = Readonly<{ keys: ReadonlyArray<string>; desc: string }>;
type Group = Readonly<{ title: string; items: ReadonlyArray<Shortcut> }>;

const SHORTCUTS: ReadonlyArray<Group> = [
  {
    title: "Module tree",
    items: [
      { keys: ["↑", "↓"], desc: "Move between modules" },
      { keys: ["→"], desc: "Expand / enter children" },
      { keys: ["←"], desc: "Collapse / go to parent" },
      { keys: ["Enter"], desc: "Open the focused module" },
      { keys: ["Home", "End"], desc: "First / last module" },
    ],
  },
  {
    title: "Detail panel",
    items: [
      { keys: ["Click"], desc: "A section header collapses it" },
      { keys: ["Type"], desc: "The filter box narrows long field lists" },
    ],
  },
  {
    title: "General",
    items: [
      { keys: ["?"], desc: "Toggle this help" },
      { keys: ["Esc"], desc: "Close the dialog or detail panel" },
    ],
  },
];

export function HelpOverlay() {
  const open = useArchStore((s) => s.helpOpen);
  const close = useArchStore((s) => s.closeHelp);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const prevFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => prevFocus.current?.focus();
  }, [open]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <div className={styles.backdrop} onClick={close}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-overlay-title"
        className={styles.dialog}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <header className={styles.header}>
          <h2 id="help-overlay-title" className={styles.title}>
            Keyboard shortcuts
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.close}
            onClick={close}
            aria-label="Close help"
          >
            ✕
          </button>
        </header>

        <div className={styles.groups}>
          {SHORTCUTS.map((group) => (
            <section key={group.title} className={styles.group}>
              <h3 className={styles.groupTitle}>{group.title}</h3>
              <dl className={styles.list}>
                {group.items.map((item) => (
                  <div key={item.desc} className={styles.row}>
                    <dt className={styles.keys}>
                      {item.keys.map((k) => (
                        <kbd key={k} className={styles.kbd}>
                          {k}
                        </kbd>
                      ))}
                    </dt>
                    <dd className={styles.desc}>{item.desc}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
