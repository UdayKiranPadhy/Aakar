/**
 * A draggable vertical divider that resizes the panel it sits on.
 *
 * Self-contained: it owns the pointer-drag lifecycle (window listeners so the
 * drag keeps tracking outside the strip) and clamps the result to [min, max].
 * It reports the new width via `onChange` and brackets the drag with
 * `onDragChange` so the parent can suppress its width transition while dragging.
 *
 * `invert` flips the drag direction: a handle on a panel's *start* (left) edge
 * grows the panel as the pointer moves left, so the right-hand detail panel
 * passes `invert`; the left sidebar (handle on its end edge) does not.
 *
 * Exposed as an ARIA `separator` with keyboard support (←/→, ⇧ for a larger
 * step) so the panels are resizable without a pointer.
 */

import { useCallback } from "react";
import { clsx } from "clsx";

import styles from "./ResizeHandle.module.css";

const STEP = 16;
const STEP_LARGE = 48;

type ResizeHandleProps = Readonly<{
  /** Current width of the panel being resized (px). */
  width: number;
  min: number;
  max: number;
  /** Handle sits on the panel's start (left) edge; dragging left grows it. */
  invert?: boolean;
  onChange: (next: number) => void;
  /** Called true on drag start, false on drag end. */
  onDragChange?: (dragging: boolean) => void;
  ariaLabel: string;
}>;

export function ResizeHandle({
  width,
  min,
  max,
  invert = false,
  onChange,
  onDragChange,
  ariaLabel,
}: ResizeHandleProps) {
  const clamp = useCallback(
    (n: number) => Math.min(max, Math.max(min, Math.round(n))),
    [min, max],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore secondary buttons; only start a drag for the primary pointer.
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = width;
      const sign = invert ? -1 : 1;

      const onMove = (ev: PointerEvent) => {
        onChange(clamp(startWidth + sign * (ev.clientX - startX)));
      };
      const stop = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", stop);
        window.removeEventListener("pointercancel", stop);
        document.body.style.removeProperty("cursor");
        document.body.style.removeProperty("user-select");
        onDragChange?.(false);
      };

      onDragChange?.(true);
      // Keep the resize cursor + kill text selection for the whole drag,
      // even when the pointer leaves the thin handle strip.
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", stop);
      window.addEventListener("pointercancel", stop);
    },
    [width, invert, onChange, onDragChange, clamp],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const grow = invert ? "ArrowLeft" : "ArrowRight";
      const shrink = invert ? "ArrowRight" : "ArrowLeft";
      const step = e.shiftKey ? STEP_LARGE : STEP;
      if (e.key === grow) {
        e.preventDefault();
        onChange(clamp(width + step));
      } else if (e.key === shrink) {
        e.preventDefault();
        onChange(clamp(width - step));
      }
    },
    [width, invert, onChange, clamp],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      aria-valuenow={width}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={clsx(styles.handle, invert ? styles.start : styles.end)}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    />
  );
}
