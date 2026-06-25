/**
 * Slow, eased panel-to-panel scrolling for the landing page.
 *
 * CSS scroll-snap settles almost instantly and its duration isn't configurable,
 * so on wheel / keyboard we take over: animate `scrollTop` to the adjacent panel
 * over a fixed DURATION with an ease, one panel per gesture. While we own the
 * scroll we neutralise CSS snap + smooth (inline) so they don't fight the rAF
 * animation. Active only where CSS snapping was (≥880×680, no reduced-motion);
 * on smaller screens / reduced-motion native scrolling is left untouched.
 *
 * Because the animation drives the real `scrollTop`, framer's scroll-linked
 * hooks (parallax, the traveling hero image) follow it for free.
 */

import { useEffect } from "react";

/** Panel-to-panel scroll duration, ms. Bump for a slower glide. */
const DURATION = 1700;
const SNAP_QUERY =
  "(prefers-reduced-motion: no-preference) and (min-width: 880px) and (min-height: 680px)";

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function useSlowSnapScroll(el: HTMLElement | null) {
  useEffect(() => {
    if (!el) return;
    const mql = window.matchMedia(SNAP_QUERY);
    let animating = false;
    let raf = 0;
    let cooldownUntil = 0;

    // Each panel's scrollTop position (rect-based, so it's robust regardless of
    // offsetParent).
    const panelOffsets = () => {
      const base = el.getBoundingClientRect().top - el.scrollTop;
      return (Array.from(el.children) as HTMLElement[]).map((c) => c.getBoundingClientRect().top - base);
    };

    const animateTo = (target: number) => {
      const start = el.scrollTop;
      const dist = target - start;
      if (Math.abs(dist) < 1) return;
      animating = true;
      const t0 = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - t0) / DURATION, 1);
        el.scrollTop = start + dist * easeInOutCubic(p);
        if (p < 1) {
          raf = requestAnimationFrame(step);
        } else {
          animating = false;
          cooldownUntil = performance.now() + 140; // let trackpad momentum settle
        }
      };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
    };

    const go = (dir: 1 | -1) => {
      const offsets = panelOffsets();
      if (offsets.length < 2) return;
      const cur = el.scrollTop;
      let idx = 0;
      let best = Infinity;
      offsets.forEach((o, i) => {
        const d = Math.abs(o - cur);
        if (d < best) {
          best = d;
          idx = i;
        }
      });
      const next = Math.max(0, Math.min(offsets.length - 1, idx + dir));
      const target = offsets[next];
      if (next !== idx && target !== undefined) animateTo(target);
    };

    const onWheel = (e: WheelEvent) => {
      if (!mql.matches) return; // native scroll on small screens / reduced-motion
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // leave horizontal intent alone
      e.preventDefault();
      if (animating || e.deltaY === 0 || performance.now() < cooldownUntil) return;
      go(e.deltaY > 0 ? 1 : -1);
    };

    const onKey = (e: KeyboardEvent) => {
      if (!mql.matches) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      let dir: 1 | -1 | 0 = 0;
      if (e.key === "ArrowDown" || e.key === "PageDown") dir = 1;
      else if (e.key === "ArrowUp" || e.key === "PageUp") dir = -1;
      else return;
      e.preventDefault();
      if (animating || performance.now() < cooldownUntil) return;
      go(dir);
    };

    // While we drive the scroll, turn off CSS snap + smooth so per-frame
    // scrollTop applies instantly (our ease provides the smoothness).
    const applyMode = () => {
      el.style.scrollSnapType = mql.matches ? "none" : "";
      el.style.scrollBehavior = mql.matches ? "auto" : "";
    };
    applyMode();

    mql.addEventListener("change", applyMode);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      mql.removeEventListener("change", applyMode);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      el.style.scrollSnapType = "";
      el.style.scrollBehavior = "";
    };
  }, [el]);
}
