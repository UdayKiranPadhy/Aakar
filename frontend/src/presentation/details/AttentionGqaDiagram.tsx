/**
 * Grouped-query attention grouping diagram.
 *
 * Draws `numHeads` query heads (top row) fanning into `kvHeads` shared key/value
 * heads (bottom row), so the sharing ratio is visible at a glance: MQA collapses
 * to one KV head, GQA to a few, MHA would be 1:1 (and is never drawn — see below).
 *
 * Pure function of two facts the backend supplies. Renders nothing unless both are
 * known AND there is real sharing (`kvHeads < numHeads`); we never draw a 1:1 grid
 * that would imply GQA where the model is plain multi-head attention.
 */

const VIEW_W = 280;
const PAD = 12;
const Q_Y = 18;
const KV_Y = 84;

export function AttentionGqaDiagram({
  numHeads,
  kvHeads,
}: {
  numHeads: number;
  kvHeads: number;
}) {
  if (!(numHeads > 0 && kvHeads > 0 && kvHeads < numHeads)) return null;

  const ratio = Math.round(numHeads / kvHeads);
  const span = VIEW_W - PAD * 2;
  const qStep = span / numHeads;
  const kvStep = span / kvHeads;
  const qSize = Math.max(4, Math.min(13, qStep - 3));
  const kvSize = Math.max(12, Math.min(28, kvStep - 8));

  const qx = (i: number) => PAD + qStep * (i + 0.5);
  const kvx = (g: number) => PAD + kvStep * (g + 0.5);
  const groupOf = (i: number) => Math.min(kvHeads - 1, Math.floor(i / ratio));

  const queries = Array.from({ length: numHeads }, (_, i) => i);
  const kvs = Array.from({ length: kvHeads }, (_, g) => g);

  const regime = kvHeads === 1 ? "MQA" : "GQA";

  return (
    <figure style={{ margin: "8px 0 0" }}>
      <svg
        viewBox={`0 0 ${VIEW_W} 108`}
        width="100%"
        role="img"
        aria-label={`${numHeads} query heads grouped into ${kvHeads} shared key/value heads (${regime}, ratio ${ratio}:1)`}
      >
        {/* connectors first, so the cells sit on top */}
        {queries.map((i) => (
          <line
            key={`c${i}`}
            x1={qx(i)}
            y1={Q_Y + qSize}
            x2={kvx(groupOf(i))}
            y2={KV_Y}
            stroke="var(--color-hairline-strong)"
            strokeWidth={0.75}
          />
        ))}
        {queries.map((i) => (
          <rect
            key={`q${i}`}
            x={qx(i) - qSize / 2}
            y={Q_Y}
            width={qSize}
            height={qSize}
            rx={2}
            fill="color-mix(in srgb, var(--viz-attention) 22%, var(--color-bg))"
            stroke="var(--viz-attention)"
            strokeWidth={0.75}
          />
        ))}
        {kvs.map((g) => (
          <rect
            key={`kv${g}`}
            x={kvx(g) - kvSize / 2}
            y={KV_Y}
            width={kvSize}
            height={kvSize}
            rx={3}
            fill="color-mix(in srgb, var(--viz-attention) 65%, var(--color-bg))"
            stroke="var(--viz-attention)"
            strokeWidth={1}
          />
        ))}
      </svg>
      <figcaption
        style={{ fontSize: "11px", color: "var(--color-ink-muted)", marginTop: "4px" }}
      >
        {numHeads} query heads share {kvHeads} key/value head{kvHeads === 1 ? "" : "s"} —{" "}
        {ratio} quer{ratio === 1 ? "y" : "ies"} per KV head ({regime}).
      </figcaption>
    </figure>
  );
}
