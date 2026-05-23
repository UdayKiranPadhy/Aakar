/**
 * Default block-renderer registrations.
 *
 * v0.1 ships only `GenericBlockNode` (configured as the fallback in
 * BlockRegistry). To add a custom renderer for a specific block type:
 *
 *   import { blockRegistry } from "./BlockRegistry";
 *   import { SparseAttentionNode } from "./SparseAttentionNode";
 *   blockRegistry.register("sparse_attention", SparseAttentionNode);
 *
 * Imported once from `main.tsx` for side effects.
 */

// (no custom block renderers registered for v0.1)
export {};
