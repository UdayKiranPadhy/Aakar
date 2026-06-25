/**
 * White concept glyphs for the section seal badges (lens.google style) — one
 * Material-ish outline icon per feature panel: search (Find), zoom (Math),
 * eye/focus (Attention), route (Token). Stroke uses `currentColor` so the
 * parent (SealBadge's icon slot) sets the colour to white.
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
