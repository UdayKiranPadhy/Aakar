/**
 * Module-role predicates — "what kind of module is this?".
 *
 * The answer is a **fact computed by the backend** and shipped on every node as
 * `node.role` (see `backend/.../introspection/role.py`). The backend has the
 * ground truth the frontend can't see — the real `config` and every parameter's
 * tensor shape — so it decides the role from config dims + shapes + namespace +
 * structure, never from class/attribute/child names. The frontend simply reads
 * that fact; it does not re-derive or guess.
 *
 * These predicates are the single source of truth shared by the canvas's
 * semantic flow and the Token Journey, so the two views always segment a model
 * the same way. Where the backend couldn't prove a role (`role` is absent), they
 * return `false` and callers degrade gracefully (render the real module,
 * unlabeled) rather than guessing.
 */

import type { Node } from "./spec";

export function isAttention(node: Node): boolean {
  return node.role === "attention";
}

/** Feed-forward block — a dense MLP or a Mixture-of-Experts block. */
export function isMlp(node: Node): boolean {
  return node.role === "mlp" || node.role === "moe";
}

export function isMoe(node: Node): boolean {
  return node.role === "moe";
}

export function isNorm(node: Node): boolean {
  return node.role === "norm";
}

export function isTokenEmbedding(node: Node): boolean {
  return node.role === "token_embedding";
}

export function isPositionEmbedding(node: Node): boolean {
  return node.role === "position_embedding";
}

export function isLmHead(node: Node): boolean {
  return node.role === "lm_head";
}

/** The ModuleList of decoder layers (backend confirmed length == num_hidden_layers). */
export function isLayerStack(node: Node): boolean {
  return node.role === "layer_stack";
}

/**
 * A decoder layer is a module whose direct children include both an attention and an
 * MLP/MoE sub-layer — derived from the children's (backend-assigned) roles. The backend
 * does not tag the layer itself, since "decoder layer" is a structural relationship, not
 * a leaf role. Takes the children explicitly (the caller already has them in hand).
 */
export function isDecoderLayer(children: ReadonlyArray<Node>): boolean {
  return children.some(isAttention) && children.some(isMlp);
}
