/**
 * Default block-renderer registrations.
 *
 * Custom renderers override `GenericBlockNode` (the fallback) for specific
 * node types. To add a new one:
 *
 *   import { blockRegistry } from "./BlockRegistry";
 *   import { SparseAttentionNode } from "./SparseAttentionNode";
 *   blockRegistry.register("sparse_attention", SparseAttentionNode);
 *
 * Imported once from `main.tsx` for side effects.
 */

import { ActivationNode } from "./ActivationNode";
import { AttentionHeadNode } from "./AttentionHeadNode";
import { blockRegistry } from "./BlockRegistry";
import { EmbeddingNode } from "./EmbeddingNode";
import { FlowGlyphNode } from "./FlowGlyphNode";
import { LinearNode } from "./LinearNode";
import { MoeBlockNode } from "./MoeBlockNode";
import { OperationNode } from "./OperationNode";

// Heads are rendered ~3× narrower than a default block — at level 4 we
// render N of them side-by-side and need the grid to fit a normal viewport.
blockRegistry.register("attention_head", AttentionHeadNode);
blockRegistry.register("flow_input", FlowGlyphNode);
blockRegistry.register("flow_residual", FlowGlyphNode);
blockRegistry.register("attention_heads", FlowGlyphNode);
blockRegistry.register("attention_scores", FlowGlyphNode);
blockRegistry.register("attention_softmax", FlowGlyphNode);
blockRegistry.register("attention_mix", FlowGlyphNode);
blockRegistry.register("mlp_multiply", FlowGlyphNode);

// Generic forward-pass operation glyph (operationFlow.ts) — one renderer for
// every traced ATen op regardless of module class; colour keys off category.
blockRegistry.register("operation", OperationNode);

// Custom block renderers for core layers
blockRegistry.register("embedding", EmbeddingNode);
blockRegistry.register("linear", LinearNode);

// Category-keyed renderers — one component handles every activation class
// regardless of name (SiLU, GELU, ReLU, …).
blockRegistry.registerCategory("activation", ActivationNode);

// Role-keyed renderers — family-agnostic, resolved on the backend's fact-derived
// `node.role` (set only when proven), so every mixture-of-experts block (Mixtral,
// Qwen-MoE, DeepSeek, …) gets the expert-grid card without naming a class.
blockRegistry.registerRole("moe", MoeBlockNode);

