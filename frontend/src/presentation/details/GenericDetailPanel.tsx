/**
 * Default detail-panel content — used for every node type in v0.1.
 *
 * Renders sections for: Configuration (params), Shapes (input/output/weight/
 * bias), Parameters (param_count + memory), Compute (FLOPs), Buffers, plus a
 * Model-level info strip pulled from the Spec.
 *
 * Sections are hidden if the relevant data is absent.
 */

import { useState } from "react";

import { Button } from "../components/ui/Button";
import type { DetailPanelProps } from "./DetailRegistry";
import { SourceViewer } from "./SourceViewer";
import {
  formatBytes,
  formatFlops,
  formatParamCount,
  formatShape,
} from "../components/ui/format";
import { useArchStore } from "../../store/archStore";
import type { Spec } from "../../domain/spec";
import { ClassificationSection } from "./ClassificationSection";
import { DetailFilter, filterEntries } from "./DetailFilter";
import { FieldKey, FieldRow, Section } from "./DetailSection";
import { explainRole } from "./explanations";
import { OperationsSection } from "./OperationsSection";
import { ViewAllConfigLink } from "./ViewAllConfigLink";
import styles from "./GenericDetailPanel.module.css";

// Above this many filterable fields, show a filter box and collapse the long lists.
const FILTER_THRESHOLD = 12;

export function GenericDetailPanel({ node, onExpand, onClose }: DetailPanelProps) {
  // Spec-level metadata (attention impl, position encoding, etc.) lives next
  // to the per-node info because students inspecting a block almost always
  // want the model-wide context to ground the layer's behavior.
  const spec = useArchStore((s) => s.spec);
  const isRoot = !node.module_path;
  const [filter, setFilter] = useState("");

  // Long models clutter the panel; offer a filter (and collapse the long lists)
  // only when there's enough to be worth narrowing.
  const filterableCount =
    Object.keys(node.params).length + Object.keys(node.buffers ?? {}).length;
  const showFilter = filterableCount > FILTER_THRESHOLD;

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <div>
          <div className={styles.headerTitle}>{node.label}</div>
          {node.meta && <div className={styles.headerMeta}>{node.meta}</div>}
          <div className={styles.headerType}>{node.type}</div>
        </div>
        <button
          type="button"
          aria-label="Close panel"
          onClick={onClose}
          className={styles.closeButton}
        >
          ✕
        </button>
      </header>

      <div className={styles.body}>
        <RoleBlurb role={node.role} />
        {showFilter && <DetailFilter value={filter} onChange={setFilter} />}
        {isRoot && spec && <ModelInfoSection spec={spec} />}
        <SourceSection node={node} />
        <ClassificationSection node={node} />
        <TensorPathSection node={node} />
        <OperationsSection operations={node.operations} />
        <ParamsSection params={node.params} query={filter} moduleClass={node.module_class} />
        <ShapesSection
          input={node.input_shape}
          output={node.output_shape}
          weight={node.weight_shape}
          bias={node.bias_shape}
        />
        <ParamCountSection
          paramCount={node.param_count}
          memoryBytes={node.memory_bytes}
          dtype={spec?.param_dtype}
        />
        <ComputeSection flops={node.flops} flopsReference={spec?.flops_reference} />
        <SubmoduleBreakdownSection node={node} query={filter} />
        <BuffersSection buffers={node.buffers} query={filter} />
        <ViewAllConfigLink />
      </div>

      {node.has_internals && onExpand && (
        <footer className={styles.footer}>
          <Button
            variant="primary"
            size="md"
            className={styles.footerButton}
            onClick={() => onExpand(node.id)}
          >
            Expand internals
          </Button>
        </footer>
      )}
    </div>
  );
}

function RoleBlurb({ role }: { role?: string }) {
  const ex = explainRole(role);
  if (!ex) return null;
  return <p className={styles.roleBlurb}>{ex.what}</p>;
}

function SourceSection({ node }: { node: DetailPanelProps["node"] }) {
  if (!node.module_path && !node.module_class) return null;
  return (
    <Section title="Source">
      <dl className={styles.kvGrid}>
        {node.module_path && <FieldRow k="path" v={node.module_path} />}
        {node.module_class && (
          <>
            <dt className={styles.kvKey}>
              <FieldKey label="class" />
            </dt>
            <dd className={styles.kvValue}>
              {node.source_url ? (
                <a
                  href={node.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={styles.sourceLink}
                  title="Open class definition on GitHub"
                >
                  {node.module_class} ↗
                </a>
              ) : (
                node.module_class
              )}
            </dd>
          </>
        )}
      </dl>
      {node.source_url && <SourceViewer url={node.source_url} />}
    </Section>
  );
}

function TensorPathSection({ node }: { node: DetailPanelProps["node"] }) {
  if (!node.input_shape && !node.output_shape && !node.intermediates) return null;
  const intermediates = Object.entries(node.intermediates ?? {});
  return (
    <Section title="Tensor path">
      {(node.input_shape || node.output_shape) && (
        <div className={styles.tensorPath}>
          <span>{node.input_shape ?? "?"}</span>
          <span className={styles.tensorArrow}>→</span>
          <span>{node.output_shape ?? "?"}</span>
        </div>
      )}
      {intermediates.length > 0 && (
        <dl className={styles.kvGrid}>
          {intermediates.map(([k, v]) => (
            <FieldRow key={k} k={k} v={v} />
          ))}
        </dl>
      )}
    </Section>
  );
}

function ModelInfoSection({ spec }: { spec: Spec }) {
  const summary = spec.config_summary;
  const rows: Array<[string, string]> = [];
  if (spec.param_dtype) rows.push(["dtype", spec.param_dtype]);
  if (spec.attn_impl) rows.push(["attention", spec.attn_impl]);
  if (spec.position_encoding) rows.push(["position", spec.position_encoding]);
  if (spec.tied_word_embeddings !== undefined)
    rows.push(["tied embeddings", spec.tied_word_embeddings ? "yes" : "no"]);
  if (typeof summary.gqa_ratio === "number" && summary.gqa_ratio > 1)
    rows.push(["GQA", `${summary.gqa_ratio}:1`]);
  if (typeof summary.sliding_window === "number")
    rows.push(["sliding window", String(summary.sliding_window)]);
  if (typeof summary.num_local_experts === "number")
    rows.push([
      "MoE",
      `${summary.num_local_experts} experts, top-${summary.num_experts_per_tok ?? "?"}`,
    ]);
  if (typeof summary.bos_token_id === "number")
    rows.push(["bos / eos", `${summary.bos_token_id} / ${summary.eos_token_id ?? "?"}`]);
  if (summary.quantization_config) rows.push(["quantized", "yes"]);
  if (rows.length === 0) return null;
  return (
    <Section title="Model">
      <dl className={styles.kvGrid}>
        {rows.map(([k, v]) => (
          <FieldRow key={k} k={k} v={v} />
        ))}
      </dl>
    </Section>
  );
}

function ParamsSection({
  params,
  query,
  moduleClass,
}: {
  params: Readonly<Record<string, string | number | boolean>>;
  query: string;
  moduleClass?: string;
}) {
  const all = Object.entries(params);
  if (all.length === 0) return null;
  const entries = filterEntries(all, query);
  if (query && entries.length === 0) return null; // filtered everything out
  const title = moduleClass ? `${moduleClass} attributes` : "Attributes";
  return (
    // While filtering, keep sections open (not collapsible) so matches stay visible.
    <Section title={title} collapsible={!query} defaultOpen={all.length <= 8}>
      <dl className={styles.kvGrid}>
        {entries.map(([k, v]) => (
          <FieldRow key={k} k={k} v={String(v)} />
        ))}
      </dl>
    </Section>
  );
}

function ParamCountSection({
  paramCount,
  memoryBytes,
  dtype,
}: {
  paramCount?: number | null;
  memoryBytes?: number | null;
  dtype?: string | null;
}) {
  if (paramCount == null) return null;
  const memStr = formatBytes(memoryBytes ?? undefined);
  return (
    <Section title="Parameters">
      <div className={styles.paramCount}>
        {formatParamCount(paramCount)}
        <span className={styles.paramCountSecondary}>
          ({paramCount.toLocaleString()})
        </span>
      </div>
      {memStr && (
        <div className={styles.subtle}>
          {memStr}
          {dtype && <span className={styles.dim}> · {dtype}</span>}
        </div>
      )}
    </Section>
  );
}

function ShapesSection({
  input,
  output,
  weight,
  bias,
}: {
  input?: string;
  output?: string;
  weight?: ReadonlyArray<number>;
  bias?: ReadonlyArray<number>;
}) {
  const w = formatShape(weight);
  const b = formatShape(bias);
  if (!input && !output && !w && !b) return null;
  return (
    <Section title="Shapes">
      <dl className={styles.kvGrid}>
        {input && <FieldRow k="input" v={input} />}
        {output && <FieldRow k="output" v={output} />}
        {w && <FieldRow k="weight" v={w} />}
        {b && <FieldRow k="bias" v={b} />}
      </dl>
    </Section>
  );
}

function ComputeSection({
  flops,
  flopsReference,
}: {
  flops?: number | null;
  flopsReference?: Readonly<{ batch_size: number; seq_len: number }> | null;
}) {
  // Pydantic optional ints serialize as JSON `null`, not absent — so a strict
  // `=== undefined` check would fall through and crash on `null.toLocaleString()`.
  if (flops == null) return null;
  const ref = flopsReference
    ? `B=${flopsReference.batch_size}, S=${flopsReference.seq_len}`
    : null;
  return (
    <Section title="Compute (forward)">
      <div className={styles.paramCount}>
        {formatFlops(flops)}
        <span className={styles.paramCountSecondary}>
          ({flops.toLocaleString()} ops)
        </span>
      </div>
      {ref && <div className={styles.subtle}>at {ref}</div>}
    </Section>
  );
}

function BuffersSection({
  buffers,
  query,
}: {
  buffers?: Readonly<Record<string, ReadonlyArray<number>>> | null;
  query: string;
}) {
  if (!buffers) return null;
  const all = Object.entries(buffers);
  if (all.length === 0) return null;
  const entries = filterEntries(all, query);
  if (query && entries.length === 0) return null;
  return (
    <Section title="Buffers" collapsible={!query} defaultOpen={all.length <= 8}>
      <dl className={styles.kvGrid}>
        {entries.map(([name, shape]) => (
          <FieldRow key={name} k={name} v={formatShape(shape) ?? "[]"} />
        ))}
      </dl>
    </Section>
  );
}

function SubmoduleBreakdownSection({
  node,
  query,
}: {
  node: DetailPanelProps["node"];
  query: string;
}) {
  const all = (node.children ?? []).filter((child) => (child.param_count ?? 0) > 0);
  const total = node.param_count ?? 0;
  if (all.length === 0 || total <= 0) return null;
  const q = query.trim().toLowerCase();
  const children = q
    ? all.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          (c.module_class ?? "").toLowerCase().includes(q),
      )
    : all;
  if (q && children.length === 0) return null;
  return (
    <Section title="Parameter breakdown" collapsible={!query} defaultOpen={all.length <= 6}>
      <div className={styles.breakdown}>
        {children.slice(0, 6).map((child) => {
          const count = child.param_count ?? 0;
          const pct = Math.max(2, Math.round((count / total) * 100));
          return (
            <div key={child.id} className={styles.breakdownRow}>
              <div className={styles.breakdownTopline}>
                <span>{child.label}</span>
                <span>{formatParamCount(count)}</span>
              </div>
              <div className={styles.breakdownTrack}>
                <span className={styles.breakdownBar} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

