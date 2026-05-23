/**
 * Composition Spec — JSON shape returned by GET /api/architecture.
 *
 * Hand-mirrored from `backend/src/aakar_api/domain/spec.py` (the source of
 * truth). Documented as a canonical contract in `docs/spec-contract.md`.
 * When the contract changes, this file, the Pydantic models, and the doc
 * must all update in the same commit.
 */

export type Node = Readonly<{
  id: string;
  type: string;
  label: string;
  meta?: string;
  params: Readonly<Record<string, string | number | boolean>>;
  children?: ReadonlyArray<Node>;
  has_internals?: boolean;
  param_count?: number;
  input_shape?: string;
  output_shape?: string;
}>;

export type Spec = Readonly<{
  model_id: string;
  model_type: string;
  config_summary: Readonly<Record<string, string | number | boolean>>;
  graph: ReadonlyArray<Node>;
  notes?: ReadonlyArray<string>;
}>;
