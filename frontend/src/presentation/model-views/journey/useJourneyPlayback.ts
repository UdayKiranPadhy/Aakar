/**
 * Playback for the token-journey pulse. Advances a "focused stage" index along
 * the flattened timeline; the pulse itself glides between stops via a CSS
 * transition (see JourneyView), so no per-frame rAF is needed. Auto-advance is
 * disabled under `prefers-reduced-motion` — the scrubber still steps instantly.
 */

import { useEffect, useRef, useState } from "react";

export type Playback = Readonly<{
  index: number;
  playing: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (i: number) => void;
}>;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useJourneyPlayback(count: number, dwellMs = 1800): Playback {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const reduced = useRef(prefersReducedMotion());

  // Keep the index in range when the journey (and thus `count`) changes.
  useEffect(() => {
    setIndex((i) => (count === 0 ? 0 : Math.min(i, count - 1)));
  }, [count]);

  useEffect(() => {
    if (!playing || count === 0 || reduced.current) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, dwellMs);
    return () => window.clearInterval(id);
  }, [playing, count, dwellMs]);

  return {
    index,
    playing,
    play: () => setPlaying(true),
    pause: () => setPlaying(false),
    toggle: () => setPlaying((p) => !p),
    seek: (i: number) => {
      setPlaying(false);
      setIndex(Math.max(0, Math.min(count - 1, i)));
    },
  };
}
