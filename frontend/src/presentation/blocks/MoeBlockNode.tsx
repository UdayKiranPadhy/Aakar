/**
 * Block renderer for mixture-of-experts cards (registered on the backend's
 * `role: "moe"`, so it serves every MoE family without naming a class).
 *
 * Draws a compact expert-grid glyph — N expert tiles with the top-k routed ones
 * filled — the MoE analogue of how AttentionHeadNode grids attention heads. The
 * expert/top-k counts come from backend facts (`node.params` → `config_summary`);
 * if the expert count is unknown we degrade to a plain FFN-style card (no grid),
 * never inventing a count.
 *
 * (Card chrome is shared with GenericBlockNode so a MoE card sits flush beside the
 * attention card in the decoder-layer flow; only the expert glyph is bespoke.)
 */

import { clsx } from "clsx";

import type { BlockNodeProps } from "./BlockRegistry";
import { Pill } from "../components/ui/Pill";
import { formatBytes, formatParamCount } from "../components/ui/format";
import { useArchStore } from "../../store/archStore";
import { MOE_MAX_COLS } from "../layout/strategies/expertFanOut";
import generic from "./GenericBlockNode.module.css";
import styles from "./MoeBlockNode.module.css";

const MAX_VISIBLE = 18; // 3 rows of 6 — beyond this we show a "+N" overflow tile.

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function MoeBlockNode({
  node,
  level,
  selected,
  role,
  visualTone,
  onSelect,
  onExpand,
}: BlockNodeProps) {
  const cfg = useArchStore((s) => s.spec?.config_summary) ?? {};

  const numExperts =
    asNumber(node.params.num_experts) ??
    asNumber(node.params.num_local_experts) ??
    asNumber(cfg.num_local_experts) ??
    asNumber(cfg.num_experts);
  const topK =
    asNumber(node.params.num_experts_per_tok) ?? asNumber(cfg.num_experts_per_tok);

  const width = level === 1 ? 280 : 260;
  const canExpand = !!node.has_internals && !!onExpand;

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
      style={{ width }}
      aria-label={node.label}
      className={clsx(
        generic.card,
        selected && generic.cardSelected,
        role === "input" && generic.cardInput,
        role === "output" && generic.cardOutput,
        visualTone && generic[`tone_${visualTone}`],
      )}
    >
      <div className={generic.body}>
        <div className={clsx(generic.title, selected && generic.titleSelected)}>
          {node.label}
        </div>
        {(node.module_class || node.meta) && (
          <div className={generic.meta}>{node.module_class ?? node.meta}</div>
        )}

        {numExperts !== undefined && numExperts > 0 && (
          <ExpertGrid numExperts={numExperts} topK={topK} />
        )}

        {node.param_count !== undefined && node.param_count > 0 && (
          <div className={generic.params}>
            {formatParamCount(node.param_count)} params
            {node.memory_bytes !== undefined && node.memory_bytes > 0 && (
              <span className={generic.shapeAux}> · {formatBytes(node.memory_bytes)}</span>
            )}
          </div>
        )}
      </div>

      {selected && canExpand && (
        <button
          type="button"
          className={generic.expandButton}
          onClick={(e) => {
            e.stopPropagation();
            onExpand!(node.id);
          }}
          aria-label={`Expand ${node.label} internals`}
        >
          <Pill tone="accent">Expand internals ↗</Pill>
        </button>
      )}
    </div>
  );
}

function ExpertGrid({ numExperts, topK }: { numExperts: number; topK?: number }) {
  const active = Math.min(topK ?? 0, numExperts);
  const overflow = numExperts > MAX_VISIBLE ? numExperts - (MAX_VISIBLE - 1) : 0;
  const visible = overflow ? MAX_VISIBLE - 1 : numExperts;
  const cols = Math.min(numExperts, MOE_MAX_COLS);

  return (
    <>
      <div
        className={styles.experts}
        style={{ "--moe-cols": cols } as React.CSSProperties}
        aria-hidden
      >
        {Array.from({ length: visible }, (_, i) => (
          <span
            key={i}
            className={clsx(styles.expert, i < active && styles.expertActive)}
          />
        ))}
        {overflow > 0 && <span className={styles.overflow}>+{overflow}</span>}
      </div>
      <div className={styles.caption}>
        {topK !== undefined ? `${topK} of ${numExperts} experts / token` : `${numExperts} experts`}
      </div>
    </>
  );
}
