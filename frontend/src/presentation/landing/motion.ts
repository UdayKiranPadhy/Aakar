/**
 * Shared framer-motion variants + the reveal hook for the landing page.
 *
 * Reveal model: a container element initiates `whileInView` (gated to the
 * scroll-root container), then descendant motion elements that declare matching
 * `variants` inherit the "shown" label through framer's context — so copy,
 * SVG strokes (pathLength) and nodes all animate when their section scrolls in.
 * `once: true` keeps them revealed (matching lens.google).
 */

import { createContext, useContext } from "react";
import type { CSSProperties, RefObject } from "react";
import type { Variants } from "framer-motion";

import { ScrollRootContext } from "./ScrollRootContext";

/** When true (provided by a parent), `useRevealProps` renders content in its
 * final state with no scroll reveal — used when an outer wrapper owns the
 * entrance (e.g. a card that glides in as a whole, or a floating hero card). */
export const RevealDisabledContext = createContext(false);

/** Make a `scale` transform on an SVG element pivot around its own bbox centre
 * (SVG transforms default to the (0,0) user-space origin otherwise). */
export const centerBox: CSSProperties = { transformBox: "fill-box", transformOrigin: "center" };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0, 0, 0.2, 1] } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.82 },
  shown: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] } },
};

export const drawLine: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  shown: { pathLength: 1, opacity: 1, transition: { duration: 1.05, ease: [0, 0, 0.2, 1] } },
};

/** Orchestration-only parent: staggers its children, no visual change itself. */
export function staggerContainer(stagger = 0.09, delayChildren = 0.04): Variants {
  return {
    hidden: {},
    shown: { transition: { staggerChildren: stagger, delayChildren, when: "beforeChildren" } },
  };
}

/** Props to spread on a motion element to reveal it when it scrolls into the
 * container. If reveal is disabled by a parent, returns props that render the
 * final ("shown") state with no animation. */
export function useRevealProps(amount = 0.3) {
  const root = useContext(ScrollRootContext);
  const disabled = useContext(RevealDisabledContext);
  if (disabled) {
    return { initial: "shown" as const, animate: "shown" as const };
  }
  return {
    initial: "hidden" as const,
    whileInView: "shown" as const,
    viewport: {
      root: (root ?? undefined) as RefObject<Element> | undefined,
      once: true,
      amount,
    },
  };
}
