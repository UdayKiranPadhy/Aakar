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

import { AttentionHeadNode } from "./AttentionHeadNode";
import { blockRegistry } from "./BlockRegistry";
import { EmbeddingNode } from "./EmbeddingNode";
import { FlowGlyphNode } from "./FlowGlyphNode";
import { LinearNode } from "./LinearNode";

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

// Custom block renderers for core layers
blockRegistry.register("embedding", EmbeddingNode);
blockRegistry.register("linear", LinearNode);

