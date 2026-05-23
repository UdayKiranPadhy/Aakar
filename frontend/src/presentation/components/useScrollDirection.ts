/**
 * Tracks vertical scroll direction on a given element and exposes a single
 * `collapsed` boolean — true when the NavBar's top row should hide.
 *
 * Rules:
 *   - Near the top of the scroll viewport (< COLLAPSE_THRESHOLD px), always
 *     return false so the full nav is visible. Avoids flicker on bounce.
 *   - Scrolling down past the threshold by at least DELTA_THRESHOLD px → true.
 *   - Scrolling up by at least DELTA_THRESHOLD px → false.
 *
 * Pass `null` (e.g. when the scroll container isn't mounted) and the hook
 * resets to `false` — no stale state lingers after a view change.
 */

import { useEffect, useRef, useState } from "react";

const COLLAPSE_THRESHOLD = 80; // don't collapse until user has scrolled past the nav itself
const DELTA_THRESHOLD = 4; // ignore sub-pixel jitter / trackpad rubber-banding

export function useScrollDirection(el: HTMLElement | null): boolean {
  const [collapsed, setCollapsed] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    // Reset on every el change (mount, unmount, swap) so we never carry
    // collapsed state across view transitions.
    setCollapsed(false);
    lastY.current = 0;

    if (!el) return;

    const onScroll = () => {
      const y = el.scrollTop;
      const delta = y - lastY.current;

      if (y < COLLAPSE_THRESHOLD) {
        setCollapsed(false);
      } else if (delta > DELTA_THRESHOLD) {
        setCollapsed(true);
      } else if (delta < -DELTA_THRESHOLD) {
        setCollapsed(false);
      }

      lastY.current = y;
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [el]);

  return collapsed;
}
