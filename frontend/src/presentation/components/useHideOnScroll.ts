/**
 * Headroom pattern: returns `true` when the nav should hide (the user is
 * scrolling down, past the top) and `false` when near the top or scrolling up.
 *
 * Listens to the given scroll element (the landing page's scroll container).
 * Pass `null` (e.g. when that container isn't mounted) and it resets to `false`
 * so no stale "hidden" state lingers across view changes.
 */

import { useEffect, useRef, useState } from "react";

const HIDE_THRESHOLD = 80; // stay visible until scrolled past the nav itself
const DELTA_THRESHOLD = 6; // ignore sub-pixel jitter / trackpad rubber-banding

export function useHideOnScroll(el: HTMLElement | null): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    setHidden(false);
    lastY.current = 0;

    if (!el) return;

    const onScroll = () => {
      const y = el.scrollTop;
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

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [el]);

  return hidden;
}
