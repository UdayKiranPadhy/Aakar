/**
 * Tooltip — a small hover/focus popover for inline definitions.
 *
 * The trigger wraps any inline content (typically a field label) and gets a
 * dotted underline + `cursor: help` to signal "there's a definition here." The
 * bubble is rendered into a `document.body` portal with `position: fixed` so it
 * is never clipped by the detail panel's own `overflow: auto` scroll container.
 *
 * Accessible: the trigger is focusable and the bubble is `role="tooltip"` wired
 * via `aria-describedby`, so it opens on keyboard focus and on pointer hover,
 * and closes on blur / mouse-leave / Escape.
 */

import { useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import styles from "./Tooltip.module.css";

const MAX_WIDTH = 260;
const GAP = 6;

type Placement = { top: number; left: number; above: boolean };

export function Tooltip({
  content,
  children,
}: {
  content: ReactNode;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<Placement | null>(null);
  const id = useId();

  function show() {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Clamp horizontally so a label near the panel's right edge doesn't push
    // the bubble off-screen; flip above when there's little room below.
    const left = Math.max(8, Math.min(r.left, window.innerWidth - MAX_WIDTH - 12));
    const above = r.bottom > window.innerHeight - 90;
    setPlacement({ left, top: above ? r.top - GAP : r.bottom + GAP, above });
  }

  function hide() {
    setPlacement(null);
  }

  return (
    <span
      ref={triggerRef}
      className={styles.trigger}
      tabIndex={0}
      aria-describedby={placement ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === "Escape") hide();
      }}
    >
      {children}
      {placement &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            className={`${styles.bubble} ${placement.above ? styles.above : ""}`}
            style={{ top: placement.top, left: placement.left, maxWidth: MAX_WIDTH }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
