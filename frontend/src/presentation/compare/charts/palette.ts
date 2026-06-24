/**
 * Token-backed colour helpers for the Compare charts. Every colour is a CSS
 * `var(--token)` reference (never raw hex), so the charts stay token-driven
 * like the rest of the app. The A/B series follow the existing ModelCard tone
 * convention (A = accent blue, B = green).
 */

export const SERIES_A = "var(--color-accent)";
export const SERIES_B = "var(--g-green)";

/** Token-backed categorical palette for donut slices / multi-category charts. */
const CATEGORICAL: ReadonlyArray<string> = [
  "var(--g-blue)",
  "var(--g-green)",
  "var(--g-purple)",
  "var(--viz-residual)",
  "var(--viz-io)",
  "var(--g-red)",
  "var(--viz-matrix)",
  "var(--g-yellow-ink)",
  "var(--viz-norm)",
];

export const CATEGORICAL_COUNT = CATEGORICAL.length;

/** Deterministic colour for category `index`, cycling the palette (wraps safely). */
export function categoricalColor(index: number): string {
  const safe = Number.isFinite(index) && index >= 0 ? index % CATEGORICAL.length : 0;
  return CATEGORICAL[safe] ?? "var(--g-blue)";
}
