/**
 * Headroom pattern: returns `true` when the nav (or its top row) should hide —
 * the user is scrolling down, past the top — and `false` when near the top or
 * scrolling up.
 *
 * Two scroll topologies are supported:
 *   - default: `el` *is* the scroll container (the landing page's scroller).
 *   - `capture: true`: `el` is a stable *ancestor* of the real scroller, and
 *     the position is read from the event's target instead of `el`. The model
 *     dashboard scrolls inside each view's own `.view` element, which remounts
 *     whenever you switch views — so we listen on the stable `.content` wrapper
 *     in the capture phase. (Scroll events don't bubble, but they still reach
 *     capturing ancestors.)
 *
 * `resetKey` re-arms the headroom (back to visible) whenever it changes — e.g.
 * switching model views, where the new view starts scrolled to the top.
 *
 * Pass `null` for `el` (e.g. when the container isn't mounted) and it resets to
 * `false` so no stale "hidden" state lingers across view changes.
 */

import { useEffect, useRef, useState } from "react";

const HIDE_THRESHOLD = 80; // stay visible until scrolled past the nav itself
const DELTA_THRESHOLD = 6; // ignore sub-pixel jitter / trackpad rubber-banding

export function useHideOnScroll(
  el: HTMLElement | null,
  options: { capture?: boolean; resetKey?: unknown; ignoreSelector?: string } = {},
): boolean {
  const { capture = false, resetKey, ignoreSelector } = options;
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    setHidden(false);
    lastY.current = 0;

    if (!el) return;

    const onScroll = (e: Event) => {
      // In capture mode the scroll originates from a descendant scroller, so
      // read its position from the event target; otherwise `el` is the scroller.
      const scroller = capture ? (e.target as HTMLElement | null) : el;
      // Side chrome (e.g. the detail panel dock) scrolls independently of the
      // page; its scroll must not drive nav headroom. Such scrollers opt out
      // via `ignoreSelector`.
      if (ignoreSelector && scroller?.closest?.(ignoreSelector)) return;
      const y = scroller?.scrollTop ?? 0;
      const delta = y - lastY.current;

      if (y < HIDE_THRESHOLD) {
        setHidden(false);
      } else if (delta > DELTA_THRESHOLD) {
        setHidden(true);
      } else if (delta < -DELTA_THRESHOLD) {
        setHidden(false);
      }

      lastY.current = y;
    };

    el.addEventListener("scroll", onScroll, { passive: true, capture });
    return () => el.removeEventListener("scroll", onScroll, { capture });
  }, [el, capture, resetKey, ignoreSelector]);

  return hidden;
}
