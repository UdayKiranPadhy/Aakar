/**
 * Architecture tab — the hyperparameter spec table, attention / MoE details, a
 * per-model layer-stack comb, a source-code map (GitHub links across the module
 * tree), and the full raw-config diff. Composes the existing Compare sections
 * and adds the layer-stack + source-map blocks.
 */

import type { Node, Spec } from "../../domain/spec";
import { LayerStackComb } from "../compare/charts/LayerStackComb";
import { summaryNumber } from "../compare/helpers/engineering";
import { sourceLinks } from "../compare/helpers/sourceLinks";
import { AttentionMoeSection } from "../compare/sections/AttentionMoeSection";
import { ConfigDiffSection } from "../compare/sections/ConfigDiffSection";
import { SpecDiffSection } from "../compare/sections/SpecDiffSection";
import { CompareSection, DualColumns, ModelCard, type Tone } from "../compare/primitives";
import type { CompareViewProps } from "./CompareViewRegistry";
import shared from "./shared.module.css";

/** Module class of the repeated decoder layer, from the layer_stack node's first child. */
function firstLayerClass(spec: Spec | null): string | undefined {
  if (!spec) return undefined;
  let found: string | undefined;
  const walk = (nodes: ReadonlyArray<Node>): void => {
    for (const n of nodes) {
      if (found) return;
      if (n.role === "layer_stack" && n.children?.[0]?.module_class) {
        found = n.children[0].module_class;
        return;
      }
      if (n.children) walk(n.children);
    }
  };
  walk(spec.graph);
  return found;
}

function LayerColumn({ spec, tone }: { spec: Spec | null; tone: Tone }) {
  const layers = spec ? summaryNumber(spec.config_summary, "num_hidden_layers") : undefined;
  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      {layers !== undefined ? (
        <LayerStackComb count={layers} tone={tone} sublabel={firstLayerClass(spec)} />
      ) : (
        <span className={shared.muted}>—</span>
      )}
    </ModelCard>
  );
}

function SourceColumn({ spec, tone }: { spec: Spec | null; tone: Tone }) {
  const links = sourceLinks(spec);
  return (
    <ModelCard title={spec?.model_id ?? null} tone={tone}>
      {links.length === 0 ? (
        <span className={shared.muted}>No linked source.</span>
      ) : (
        <ul className={shared.linkList}>
          {links.map((l) => (
            <li key={l.url} className={shared.linkRow}>
              <span className={shared.linkClass} title={l.moduleClass}>
                {l.moduleClass}
              </span>
              <a className={shared.linkAnchor} href={l.url} target="_blank" rel="noreferrer noopener">
                Source ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </ModelCard>
  );
}

export function ArchitectureCompareView({ a, b }: CompareViewProps) {
  const layersA = a ? summaryNumber(a.config_summary, "num_hidden_layers") : undefined;
  const layersB = b ? summaryNumber(b.config_summary, "num_hidden_layers") : undefined;
  const hasLayers = layersA !== undefined || layersB !== undefined;
  const hasSource = sourceLinks(a).length > 0 || sourceLinks(b).length > 0;

  return (
    <>
      <SpecDiffSection a={a} b={b} />
      <AttentionMoeSection a={a} b={b} />

      {hasLayers && (
        <CompareSection id="layerstack" title="Layer stack">
          <DualColumns>
            <LayerColumn spec={a} tone="a" />
            <LayerColumn spec={b} tone="b" />
          </DualColumns>
        </CompareSection>
      )}

      {hasSource && (
        <CompareSection id="source" title="Source code mapping">
          <DualColumns>
            <SourceColumn spec={a} tone="a" />
            <SourceColumn spec={b} tone="b" />
          </DualColumns>
        </CompareSection>
      )}

      <ConfigDiffSection a={a} b={b} />
    </>
  );
}
