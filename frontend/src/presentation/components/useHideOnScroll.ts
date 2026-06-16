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
// Freeze toggling within this many px of the bottom. Hiding the nav grows the
// scroll viewport, which shrinks max scrollTop and clamps the position back up
// — a phantom upward scroll that would flip the state and oscillate (nav +
// sidebar flicker) while the user keeps scrolling at the very end. The zone
// must exceed the nav's collapsible height (its row-1, 64px) so a hide can
// never trigger that clamp in the first place, breaking the feedback loop.
const BOTTOM_LOCK = 96;

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
      if (!scroller) return;
      // Side chrome (e.g. the detail panel dock) scrolls independently of the
      // page; its scroll must not drive nav headroom. Such scrollers opt out
      // via `ignoreSelector`.
      if (ignoreSelector && scroller.closest?.(ignoreSelector)) return;
      const y = scroller.scrollTop;
      const delta = y - lastY.current;
      // Track the live position even when frozen below, so the delta stays
      // correct once the user scrolls back up out of the bottom zone.
      lastY.current = y;

      // Don't toggle inside the bottom overscroll zone (see BOTTOM_LOCK): the
      // clamp that follows a hide would otherwise read as a scroll-up and start
      // an oscillation.
      if (scroller.scrollHeight - scroller.clientHeight - y <= BOTTOM_LOCK) return;

      if (y < HIDE_THRESHOLD) {
        setHidden(false);
      } else if (delta > DELTA_THRESHOLD) {
        setHidden(true);
      } else if (delta < -DELTA_THRESHOLD) {
        setHidden(false);
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true, capture });
    return () => el.removeEventListener("scroll", onScroll, { capture });
  }, [el, capture, resetKey, ignoreSelector]);

  return hidden;
}
