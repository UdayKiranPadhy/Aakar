/**
 * Colour tokens for inline-SVG illustrations.
 *
 * CSS custom properties don't resolve inside SVG presentation *attributes*
 * (`fill="var(--x)"`), but they DO resolve via the `style` prop. So shapes use
 * `style={{ fill: c.blue }}` and we keep the values here as `var(--g-*)`
 * references — no hardcoded hex, still driven by tokens.css.
 */

export const ink = "var(--color-ink)";
export const inkMuted = "var(--color-ink-muted)";
export const inkSubtle = "var(--color-ink-subtle)";
export const hair = "var(--color-hairline-strong)";
export const surface = "var(--color-canvas)";
// Card / box fills in the illustrations — the page surface, so it flips to the
// dark surface in dark mode. (Name is historical; no longer literally white.)
export const white = "var(--color-bg)";

export const blue = "var(--g-blue)";
export const blueStrong = "var(--g-blue-strong)";
export const red = "var(--g-red)";
export const yellow = "var(--g-yellow)";
export const yellowInk = "var(--g-yellow-ink)";
export const green = "var(--g-green)";

/** Rotating order used to colour sequences of nodes/cells. */
export const palette = [blue, red, yellowInk, green, blueStrong] as const;
