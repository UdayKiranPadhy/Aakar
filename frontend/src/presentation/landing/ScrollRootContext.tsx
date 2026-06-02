/**
 * Carries the landing page's scroll container (the `homeScroll` div in App)
 * down to framer-motion reveal hooks. The container is an inner overflow:auto
 * div — NOT the window — so `whileInView` viewports and `useScroll` must be
 * told which element actually scrolls. We pass the ref object (stable identity);
 * its `.current` is populated before the provider's children mount (App gates
 * rendering on the captured element), so observers always see the real node.
 */

import { createContext, type RefObject } from "react";

export const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);
