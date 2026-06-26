/**
 * White concept glyphs for the section seal badges (lens.google style) — one
 * Material-ish outline icon per feature panel: search (Find), zoom (Math),
 * eye/focus (Attention), route (Token), bar-chart (Compare), cap (Learn).
 * Stroke uses `currentColor` so the parent (SealBadge's icon slot) sets the
 * colour to white.
 */

type GlyphProps = { size?: number };

const base = (size: number) =>
  ({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2.2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  }) as const;

export function SearchGlyph({ size = 40 }: GlyphProps) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </svg>
  );
}

export function ZoomGlyph({ size = 40 }: GlyphProps) {
  return (
    <svg {...base(size)}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <line x1="20" y1="20" x2="15.5" y2="15.5" />
      <line x1="10.5" y1="7.8" x2="10.5" y2="13.2" />
      <line x1="7.8" y1="10.5" x2="13.2" y2="10.5" />
    </svg>
  );
}

export function EyeGlyph({ size = 40 }: GlyphProps) {
  return (
    <svg {...base(size)}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function RouteGlyph({ size = 40 }: GlyphProps) {
  return (
    <svg {...base(size)}>
      <circle cx="6" cy="18" r="2.4" fill="currentColor" stroke="none" />
      <circle cx="18" cy="6" r="2.4" fill="currentColor" stroke="none" />
      <path d="M7.7 16.3C11 13 13 11 16.3 7.7" />
    </svg>
  );
}

// Compare — three bars of differing height (a side-by-side stat comparison).
export function CompareGlyph({ size = 40 }: GlyphProps) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="12" width="4.2" height="8" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="9.9" y="6" width="4.2" height="14" rx="1.2" fill="currentColor" stroke="none" />
      <rect x="16.3" y="14.5" width="4.2" height="5.5" rx="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Learn — a graduation cap: a filled mortarboard, a hanging band, and a tassel.
export function LearnGlyph({ size = 40 }: GlyphProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 4 22 8.6 12 13.2 2 8.6 Z" fill="currentColor" stroke="none" />
      <path d="M6.4 10.4V15c0 1.5 2.5 2.9 5.6 2.9s5.6-1.4 5.6-2.9v-4.6" />
      <path d="M21.4 8.8v5.2" />
      <circle cx="21.4" cy="15" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}
