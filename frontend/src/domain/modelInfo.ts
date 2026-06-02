/**
 * HuggingFace Hub metadata — mirrors the backend `HubModelInfo` (snake_case).
 *
 * Hand-kept in sync with `backend/src/aakar_api/domain/hub.py`. Open-ended
 * sub-objects (`safetensors`, `card_data`) stay loosely typed on purpose so new
 * Hub fields never break us.
 */

export type HubSibling = Readonly<{
  rfilename: string;
  size?: number;
}>;

export type ModelInfo = Readonly<{
  model_id: string;
  author?: string;
  downloads?: number;
  likes?: number;
  license?: string;
  pipeline_tag?: string;
  library_name?: string;
  last_modified?: string;
  gated?: boolean | string;
  tags: ReadonlyArray<string>;
  siblings: ReadonlyArray<HubSibling>;
  /** { parameters: { BF16: 8030261248, ... }, total: 8030261248 } */
  safetensors?: Readonly<{
    total?: number;
    parameters?: Readonly<Record<string, number>>;
  }>;
  /** Model-card YAML (base_model lineage, etc.) — open-ended. */
  card_data?: Readonly<Record<string, unknown>>;
}>;
