/**
 * The bottom-left hero image (next-token bars) detaches and travels into the
 * first feature section as the page scrolls — lens.google style — landing in
 * that section's illustration slot (which is left empty; see `data-travel-target`
 * in LandingPage) and then scrolling away with the section. The other four hero
 * cards stay put.
 *
 * It's `position: fixed` (no ancestor has a transform, so fixed is
 * viewport-relative and escapes the hero's clip). Its top/left/width are
 * scroll-linked: at scroll 0 it matches the bottom-left collage spot; by the
 * time the target section is snapped in, it exactly fills the empty slot; past
 * that it tracks the slot upward so it scrolls off naturally. Disabled under
 * reduced-motion. Geometry is measured from the live DOM (and on resize) so it
 * stays correct at any viewport size.
 */

import { useContext, useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

import { ScrollRootContext } from "../ScrollRootContext";
import { NextTokenBars } from "./NextTokenBars";
import { CardShape } from "./CardShape";
import styles from "./illustrations.module.css";

const START_W = 352;

type Geo = {
  sectionTop: number; // scroll distance at which the target section is snapped in
  startTop: number; // screen top of the bottom-left collage spot (scroll 0)
  targetTop: number; // screen top of the empty slot when the section is snapped in
  targetLeft: number;
  targetW: number;
};

const DEFAULT_GEO: Geo = { sectionTop: 900, startTop: 592, targetTop: 311, targetLeft: 776, targetW: 504 };

export function TravelingImage() {
  const root = useContext(ScrollRootContext);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll({
    container: (root ?? undefined) as RefObject<HTMLElement> | undefined,
  });
  const [geo, setGeo] = useState<Geo>(DEFAULT_GEO);

  useLayoutEffect(() => {
    const measure = () => {
      const scEl = root?.current as HTMLElement | null;
      const target = document.querySelector("[data-travel-target]");
      const section = target?.closest("section");
      if (!scEl || !target || !section) return;
      const scrollTop = scEl.scrollTop;
      const tr = target.getBoundingClientRect();
      const sr = section.getBoundingClientRect();
      const sectionTop = Math.round(sr.top + scrollTop); // document position of the section
      const targetW = tr.width;
      const targetTop = Math.round(tr.top + scrollTop - sectionTop); // slot's screen top when snapped
      const startH = (tr.height * START_W) / targetW; // collage-size height at scroll 0
      const startTop = scEl.clientHeight - 0.04 * scEl.clientHeight - startH;
      setGeo({ sectionTop, startTop, targetTop, targetLeft: tr.left, targetW });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [root]);

  const { sectionTop, startTop, targetTop, targetLeft, targetW } = geo;
  const top = useTransform(
    scrollY,
    [0, sectionTop, sectionTop * 2],
    reduce ? [startTop, startTop, startTop] : [startTop, targetTop, targetTop - sectionTop],
    { clamp: false },
  );
  const left = useTransform(scrollY, [0, sectionTop], reduce ? [0, 0] : [0, targetLeft]);
  const width = useTransform(scrollY, [0, sectionTop], reduce ? [START_W, START_W] : [START_W, targetW]);

  return (
    <motion.div className={styles.travelCard} style={{ top, left, width }} aria-hidden="true">
      <NextTokenBars />
      <CardShape variant="blue" />
    </motion.div>
  );
}
