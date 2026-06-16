/**
 * Colour tone for an operation `category`, shared by the canvas op glyph
 * (`OperationNode`) and the detail-panel ops list (`OperationsSection`) so the
 * two surfaces always agree on what, say, a matmul looks like.
 *
 * Maps to the Google-palette tokens in `tokens.css` — no hardcoded hex.
 */

export type OpTone = { color: string; bg: string };

const NEUTRAL: OpTone = { color: "var(--color-ink-subtle)", bg: "var(--color-canvas)" };

const TONES: Record<string, OpTone> = {
  matmul: { color: "var(--g-purple)", bg: "var(--g-purple-subtle)" },
  activation: { color: "var(--g-yellow-ink)", bg: "var(--g-yellow-subtle)" },
  norm: { color: "var(--g-green)", bg: "var(--g-green-subtle)" },
  elementwise: { color: "var(--g-blue-strong)", bg: "var(--g-blue-subtle)" },
  embedding: { color: "var(--g-red)", bg: "var(--g-red-subtle)" },
  attention: { color: "var(--g-purple)", bg: "var(--g-purple-subtle)" },
  shape: NEUTRAL,
  other: NEUTRAL,
};

export function opCategoryTone(category: string): OpTone {
  return TONES[category] ?? NEUTRAL;
}
