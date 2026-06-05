/**
 * Module-role predicates — "what kind of module is this?", answered from the
 * backend's STRUCTURAL output, never from class-name string matching.
 *
 * Why structural: there is no library schema that says "this class is attention"
 * (the backend documents this in `introspection/_naming.py`). Re-matching the
 * substring "attention" in a class name on the frontend is brittle — it misfires
 * on a `FastAttention`, misses a `GQABlock`, etc. Instead we trust the signals the
 * backend already derives and ships in the Spec:
 *
 *   - `category`      — the module's Python *namespace* (e.g. torch.nn.modules.sparse
 *                       → "embedding", …linear → "linear", …normalization → "norm",
 *                       …activation → "activation", …container → "container").
 *   - `intermediates` — the backend's attention/MLP fingerprint, populated only after
 *                       it confirms the module via config head-counts OR the HF
 *                       projection-naming contract: `{q,k,v,attn_scores}` for attention,
 *                       `{up}` for MLP.
 *   - tensor shapes   — e.g. a norm is a shape-preserving leaf with a 1-D affine weight.
 *
 * Single source of truth shared by the canvas's semantic flow and the Token Journey,
 * so the two views always segment a model the same way. Where even the backend can't
 * fingerprint a module, these return `false` and callers degrade gracefully (show the
 * real module, unlabeled) rather than guessing.
 */

import type { Node } from "./spec";

function hasAttnFingerprint(node: Node): boolean {
  const inter = node.intermediates;
  return !!inter && ("attn_scores" in inter || "q" in inter);
}

function hasMlpFingerprint(node: Node): boolean {
  const inter = node.intermediates;
  return !!inter && "up" in inter;
}

/**
 * Attention — the backend's attention fingerprint (config heads / q,k,v projections),
 * on the module OR a descendant. Recursion matters for wrappers where the fingerprint
 * sits one level down. Bounded in practice by the tree depth; pair with `containsLayerStack`
 * when you must exclude the backbone (whose attention lives below the layer stack).
 */
export function isAttention(node: Node): boolean {
  return hasAttnFingerprint(node) || (node.children ?? []).some(isAttention);
}

/**
 * MLP / feed-forward — the backend's MLP fingerprint (`up` projection), on the module OR a
 * descendant. Recursion is essential for Mixture-of-Experts, where the `up` fingerprint lives
 * on the `experts` sub-module (e.g. gpt-oss `mlp → experts`, Mixtral `mlp → experts → expert`)
 * rather than on the MLP sub-layer node itself.
 */
export function isMlp(node: Node): boolean {
  return hasMlpFingerprint(node) || (node.children ?? []).some(isMlp);
}

/**
 * Normalization. `category === "norm"` covers torch's LayerNorm/BatchNorm (matched by
 * namespace). Model-family norms like RMSNorm live in model files (no namespace category),
 * but are shape-preserving leaf modules carrying a single 1-D affine weight — a structural
 * fingerprint independent of the class name.
 */
export function isNorm(node: Node): boolean {
  if (node.category === "norm") return true;
  const isLeaf = !node.children || node.children.length === 0;
  const oneDWeight = !!node.weight_shape && node.weight_shape.length === 1;
  return isLeaf && oneDWeight;
}

/** A decoder layer is, structurally, a module whose children include both attention and MLP. */
export function isDecoderLayer(_parent: Node, children: ReadonlyArray<Node>): boolean {
  return children.some(isAttention) && children.some(isMlp);
}

/**
 * A layer stack is an `nn.ModuleList`/`Sequential` (namespace `container`) whose children
 * are all decoder layers. (≥2 captures the "repeated layers" idea without a magic count.)
 * Because decoder layers carry BOTH attention and MLP, an MoE `experts` ModuleList — whose
 * children are FFN experts with no attention — is correctly excluded.
 */
export function isLayerStack(parent: Node, children: ReadonlyArray<Node>): boolean {
  return (
    parent.category === "container" &&
    children.length >= 2 &&
    children.every((node) => isDecoderLayer(node, node.children ?? []))
  );
}

/**
 * Does this subtree contain a layer stack? Used to distinguish a real decoder layer (whose
 * attention/MLP sub-layers are local) from the backbone/root (which only contains them via the
 * layer-stack container) — so the recursive `isAttention`/`isMlp` above don't mis-locate the
 * backbone as a sub-layer.
 */
export function containsLayerStack(node: Node): boolean {
  const children = node.children ?? [];
  if (isLayerStack(node, children)) return true;
  return children.some(containsLayerStack);
}

/**
 * Locate a specific submodule by its HF state-dict name (e.g. `q_proj`, `gate_proj`).
 * This is NOT type classification — it's looking up a *named* child via the documented,
 * stable HF naming contract that the backend itself relies on (see `_naming.py`). It's the
 * only way to know which child is the query projection vs the output projection when
 * drawing the detailed attention/MLP fan; there is no other signal that distinguishes them.
 */
export function findByName(children: ReadonlyArray<Node>, name: string): Node | undefined {
  return children.find((node) => node.id.endsWith(`.${name}`) || node.id === name);
}
