/**
 * Fires once when the target scrolls into the landing scroll container.
 * Used to trigger CSS-transition entrances (e.g. the diagram glide) — a plain,
 * framework-agnostic mechanism that reliably animates `transform`, independent
 * of framer-motion's reduced-motion handling.
 *
 * Returns a callback ref to attach to the target and a boolean that flips to
 * true (and stays true) once the element is at least `amount` visible.
 */

import { useContext, useEffect, useState } from "react";

import { ScrollRootContext } from "./ScrollRootContext";

export function useInView(amount = 0.3) {
  const root = useContext(ScrollRootContext);
  const [node, setNode] = useState<Element | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!node || inView) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true); // no observer support → just show it
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { root: root?.current ?? null, threshold: amount },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [node, root, amount, inView]);

  return [setNode, inView] as const;
}
