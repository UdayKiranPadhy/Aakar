/**
 * HuggingFace Hub metadata — fetched directly from the public HF Hub API.
 *
 * The frontend calls `GET https://huggingface.co/api/models/{id}?blobs=true`
 * and maps camelCase fields to our snake_case type in the repository layer.
 * Open-ended sub-objects (`safetensors`, `card_data`, `config`) stay loosely
 * typed on purpose so new Hub fields never break us.
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
  created_at?: string;
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
  /** Hub storage in bytes (sum of all file sizes). */
  used_storage?: number;
  /** Inference API status: "warm", "cold", "loading", or absent. */
  inference?: string;
  /** Top spaces using this model (IDs like "owner/space-name"). */
  spaces?: ReadonlyArray<string>;
  /** Model config from config.json (architectures, tokenizer, quant, etc.). */
  config?: Readonly<{
    architectures?: ReadonlyArray<string>;
    model_type?: string;
    quantization_config?: Readonly<Record<string, unknown>>;
    tokenizer_config?: Readonly<{
      bos_token?: string;
      eos_token?: string;
      pad_token?: string;
    }>;
  }>;
}>;
