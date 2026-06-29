/**
 * Default detail-panel registrations.
 *
 * v0.1 ships only `GenericDetailPanel` (the fallback). To add a custom
 * detail panel for a specific block type, register here.
 */

import { AttentionDetail } from "./AttentionDetail";
import { detailRegistry } from "./DetailRegistry";
import { EmbeddingDetail } from "./EmbeddingDetail";
import { ExplanationDetail } from "./ExplanationDetail";
import { LinearDetail } from "./LinearDetail";
import { MoeDetail } from "./MoeDetail";
import { NormalizationDetail } from "./NormalizationDetail";

// Custom detail panels for core layers
detailRegistry.register("embedding", EmbeddingDetail);
detailRegistry.register("linear", LinearDetail);

// Role-keyed panels — family-agnostic, resolved on the backend's fact-derived
// `node.role` (set only when proven), so every Llama/Qwen/Mistral/… attention
// or mixture-of-experts block gets these without naming a class. See docs/block-types.md.
detailRegistry.registerRole("attention", AttentionDetail);
detailRegistry.registerRole("moe", MoeDetail);
detailRegistry.registerRole("norm", NormalizationDetail);

// Click-to-explain for the synthetic nodes that aren't real modules: traced op
// glyphs (operationFlow.ts) and the hand-authored semantic glyphs
// (semanticFlow.ts). Resolved by the flow-node selection channel in DetailPanel.
detailRegistry.register("operation", ExplanationDetail);
detailRegistry.register("attention_heads", ExplanationDetail);
detailRegistry.register("attention_scores", ExplanationDetail);
detailRegistry.register("attention_softmax", ExplanationDetail);
detailRegistry.register("attention_mix", ExplanationDetail);
detailRegistry.register("mlp_multiply", ExplanationDetail);
detailRegistry.register("flow_input", ExplanationDetail);
detailRegistry.register("flow_residual", ExplanationDetail);

