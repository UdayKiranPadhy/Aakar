/**
 * Renderer for non-linearity blocks (SiLU, GELU, ReLU, Tanh, …).
 *
 * Registered against the backend `category: "activation"` instead of a specific
 * `type` (`silu`, `gelu`, …), so one component handles every activation class
 * — both stock PyTorch (`torch.nn.modules.activation.*`) and HF transformers
 * (`transformers.activations.*`) — without enumerating their names.
 *
 * Visual anatomy: ~140px pill, function name large, tiny inline SVG glyph of
 * the function's shape next to it. The glyph map below is cosmetic — anything
 * unmapped falls through to the generic curve.
 */

import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import styles from "./ActivationNode.module.css";

export function ActivationNode({ node, selected, role, onSelect }: BlockNodeProps) {
  const displayName = prettifyActivation(node.module_class ?? node.label);
  const glyph = glyphFor(node.module_class ?? "");

  const handleClick = () => onSelect?.(node.id);
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKey}
      aria-label={`Activation ${displayName}`}
      className={clsx(
        styles.pill,
        selected && styles.pillSelected,
        role === "input" && styles.pillInput,
        role === "output" && styles.pillOutput,
      )}
    >
      <span className={styles.glyph} aria-hidden="true">
        {glyph}
      </span>
      <span className={styles.label}>
        <span className={styles.name}>{displayName}</span>
        <span className={styles.tag}>activation</span>
      </span>
    </div>
  );
}

function prettifyActivation(name: string): string {
  // "SiLUActivation" / "GELUActivation" / "NewGELUActivation" → "SiLU" / "GELU"
  // Hugging Face wraps PyTorch activations with an "...Activation" suffix; the
  // bare name is what students recognise.
  return name.replace(/Activation$/, "");
}

const SVG_PROPS = {
  width: 22,
  height: 16,
  viewBox: "0 0 22 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function glyphFor(moduleClass: string): JSX.Element {
  const lower = moduleClass.toLowerCase();
  if (lower.includes("silu") || lower.includes("swish") || lower.includes("mish")) {
    // Slight dip below zero before rising — characteristic of SiLU/Swish.
    return (
      <svg {...SVG_PROPS}>
        <path d="M1 12 C 5 12, 7 13, 9 11 S 13 4, 21 2" />
      </svg>
    );
  }
  if (lower.includes("gelu")) {
    // Smooth S-curve through the origin region.
    return (
      <svg {...SVG_PROPS}>
        <path d="M1 12 C 6 12, 7 11, 9 9 S 13 3, 21 2" />
      </svg>
    );
  }
  if (lower.includes("relu") || lower.includes("threshold")) {
    // Flat-then-linear hinge.
    return (
      <svg {...SVG_PROPS}>
        <path d="M1 12 L 9 12 L 21 2" />
      </svg>
    );
  }
  if (lower.includes("tanh")) {
    // Antisymmetric S, saturating both ends.
    return (
      <svg {...SVG_PROPS}>
        <path d="M1 14 C 6 14, 7 10, 11 8 S 16 2, 21 2" />
      </svg>
    );
  }
  if (lower.includes("sigmoid") || lower.includes("softmax")) {
    // Monotone S from 0 to 1.
    return (
      <svg {...SVG_PROPS}>
        <path d="M1 13 C 7 13, 9 12, 11 8 S 15 3, 21 3" />
      </svg>
    );
  }
  // Generic smooth nonlinearity.
  return (
    <svg {...SVG_PROPS}>
      <path d="M1 12 C 7 12, 10 10, 11 8 S 15 3, 21 3" />
    </svg>
  );
}
