/**
 * Overview — the model's HuggingFace Hub card: stats (downloads / likes /
 * updated / created), status badges (inference / gated / quantization),
 * architecture at a glance, safetensors dtype breakdown, lineage, tags,
 * tokenizer info, model files, linked spaces, and the README as markdown.
 */

import { useState } from "react";
import { clsx } from "clsx";

import { useModelInfo } from "../../../application/useModelInfo";
import type { ModelInfo, HubSibling } from "../../../domain/modelInfo";
import type { Spec } from "../../../domain/spec";
import { formatBytes, formatParamCount } from "../../components/ui/format";
import { Pill } from "../../components/ui/Pill";
import type { ModelViewProps } from "../ModelViewRegistry";
import { ViewEmpty, ViewError, ViewLoading, ViewSection } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import { Markdown } from "./Markdown";
import styles from "./OverviewView.module.css";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function baseModels(cardData: Readonly<Record<string, unknown>> | undefined): string[] {
  const base = cardData?.base_model;
  if (typeof base === "string") return [base];
  if (Array.isArray(base)) return base.filter((x): x is string => typeof x === "string");
  return [];
}

// Palette for the dtype bar segments — visually distinct, on-brand.
const DTYPE_COLORS: Record<string, string> = {
  BF16: "#4285f4",
  F16: "#34a853",
  F32: "#ea4335",
  F64: "#fbbc05",
  I8: "#8e24aa",
  U8: "#e040fb",
  I16: "#00acc1",
  I32: "#ff7043",
  I64: "#6d4c41",
};
function dtypeColor(dtype: string): string {
  return DTYPE_COLORS[dtype] ?? "#9e9e9e";
}

function quantMethodLabel(config: ModelInfo["config"]): string | null {
  const qc = config?.quantization_config;
  if (!qc) return null;
  const method = qc.quant_method;
  return typeof method === "string" ? method.toUpperCase() : "quantized";
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function OverviewView({ spec }: ModelViewProps) {
  const { info, readme, loading, error } = useModelInfo(spec.model_id);

  if (loading) {
    return (
      <div className={shared.view}>
        <ViewLoading label="Loading model card…" />
      </div>
    );
  }
  if (error) {
    return (
      <div className={shared.view}>
        <ViewError message={error} />
      </div>
    );
  }
  if (!info) {
    return (
      <div className={shared.view}>
        <ViewEmpty message="No model information available." />
      </div>
    );
  }

  const lineage = baseModels(info.card_data);
  const updated = formatDate(info.last_modified);
  const created = formatDate(info.created_at);

  return (
    <div className={shared.view}>
      {/* 1. Header: model id + pipeline/license/library pills */}
      <header className={styles.header}>
        <h2 className={styles.modelId}>{info.model_id}</h2>
        <div className={styles.pills}>
          {info.pipeline_tag && <Pill tone="accent">{info.pipeline_tag}</Pill>}
          {info.library_name && <Pill tone="neutral">{info.library_name}</Pill>}
        </div>
      </header>

      {/* 2. Stats row */}
      <div className={styles.stats}>
        {typeof info.downloads === "number" && (
          <Stat value={formatParamCount(info.downloads)} label="Downloads" />
        )}
        {typeof info.likes === "number" && <Stat value={info.likes.toLocaleString()} label="Likes" />}
        {updated && <Stat value={updated} label="Updated" />}
        {created && <Stat value={created} label="Created" />}
        {typeof info.used_storage === "number" && (
          <Stat value={formatBytes(info.used_storage) ?? "—"} label="Storage" />
        )}
      </div>

      {/* 3. Badges row */}
      <BadgesRow info={info} />

      {/* 4. Architecture at a glance */}
      <ArchitectureGlance spec={spec} info={info} />

      {/* 5. Safetensors dtype breakdown */}
      <DtypeBreakdown info={info} />

      {/* 6. Lineage */}
      {lineage.length > 0 && (
        <p className={styles.lineage}>
          Fine-tuned from{" "}
          {lineage.map((model, i) => (
            <span key={model}>
              {i > 0 && ", "}
              <a href={`https://huggingface.co/${model}`} target="_blank" rel="noreferrer noopener">
                {model}
              </a>
            </span>
          ))}
        </p>
      )}

      {/* 7. Tags */}
      {info.tags.length > 0 && (
        <div className={styles.tags}>
          {info.tags.map((tag) => (
            <Pill key={tag} tone="neutral">
              {tag}
            </Pill>
          ))}
        </div>
      )}

      {/* 8. Tokenizer info */}
      <TokenizerInfo info={info} />

      {/* 9. Model files */}
      <ModelFiles siblings={info.siblings} />

      {/* 10. Linked Spaces */}
      <LinkedSpaces spaces={info.spaces} />

      {/* 11. README */}
      {readme ? (
        <Markdown source={readme} modelId={info.model_id} />
      ) : (
        <ViewEmpty message="This model has no README / model card." />
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

function BadgesRow({ info }: { info: ModelInfo }) {
  const quant = quantMethodLabel(info.config);
  const hasBadge = info.inference || info.gated !== undefined || info.license || quant;
  if (!hasBadge) return null;

  const inferDotClass = info.inference === "warm"
    ? styles.badgeDotWarm
    : info.inference === "loading"
      ? styles.badgeDotLoading
      : styles.badgeDotCold;

  return (
    <div className={styles.badges}>
      {info.inference && (
        <span className={styles.badge}>
          <span className={clsx(styles.badgeDot, inferDotClass)} />
          Inference: {info.inference}
        </span>
      )}
      {info.gated !== undefined && (
        <span className={styles.badge}>
          {info.gated === false ? "Open access" : `Gated (${String(info.gated)})`}
        </span>
      )}
      {info.license && (
        <span className={styles.badge}>
          {info.license}
        </span>
      )}
      {quant && (
        <span className={styles.badge}>
          Quantized: {quant}
        </span>
      )}
    </div>
  );
}

function ArchitectureGlance({ spec, info }: { spec: Spec; info: ModelInfo }) {
  const summary = spec.config_summary;
  const architectures = info.config?.architectures;

  const facts: Array<{ key: string; label: string; value: string }> = [];

  if (info.config?.model_type) {
    facts.push({ key: "model_type", label: "Model type", value: info.config.model_type });
  }
  if (architectures && architectures.length > 0) {
    facts.push({ key: "arch_class", label: "Architecture class", value: architectures.join(", ") });
  }
  if (typeof summary.num_hidden_layers === "number") {
    facts.push({ key: "layers", label: "Layers", value: String(summary.num_hidden_layers) });
  }
  if (typeof summary.hidden_size === "number") {
    facts.push({ key: "hidden", label: "Hidden size", value: String(summary.hidden_size) });
  }
  if (typeof summary.num_attention_heads === "number") {
    facts.push({ key: "heads", label: "Attention heads", value: String(summary.num_attention_heads) });
  }
  if (typeof summary.num_key_value_heads === "number") {
    facts.push({ key: "kv_heads", label: "KV heads", value: String(summary.num_key_value_heads) });
  }
  if (typeof summary.vocab_size === "number") {
    facts.push({ key: "vocab", label: "Vocab size", value: summary.vocab_size.toLocaleString() });
  }
  if (typeof summary.max_position_embeddings === "number") {
    facts.push({ key: "context", label: "Max context", value: summary.max_position_embeddings.toLocaleString() });
  }
  if (spec.param_dtype) {
    facts.push({ key: "dtype", label: "Param dtype", value: spec.param_dtype });
  }
  if (spec.position_encoding) {
    facts.push({ key: "pos_enc", label: "Position encoding", value: spec.position_encoding });
  }
  if (spec.attn_impl) {
    facts.push({ key: "attn_impl", label: "Attention impl", value: spec.attn_impl });
  }
  if (spec.tied_word_embeddings) {
    facts.push({ key: "tied", label: "Tied embeddings", value: "yes" });
  }

  if (facts.length === 0) return null;

  return (
    <ViewSection title="Architecture at a glance">
      <div className={styles.glanceGrid}>
        {facts.map((f) => (
          <div key={f.key} className={styles.glanceItem}>
            <span className={styles.glanceKey}>{f.label}</span>
            <span className={styles.glanceValue}>{f.value}</span>
          </div>
        ))}
      </div>
    </ViewSection>
  );
}

function DtypeBreakdown({ info }: { info: ModelInfo }) {
  const params = info.safetensors?.parameters;
  const total = info.safetensors?.total;
  if (!params || !total || total === 0) return null;

  const entries = Object.entries(params).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;

  return (
    <ViewSection title="Parameter distribution">
      <div className={styles.dtypeSection}>
        <div className={styles.dtypeBar}>
          {entries.map(([dtype, count]) => (
            <span
              key={dtype}
              className={styles.dtypeSegment}
              style={{
                width: `${(count / total) * 100}%`,
                background: dtypeColor(dtype),
              }}
              title={`${dtype}: ${formatParamCount(count)} (${((count / total) * 100).toFixed(1)}%)`}
            />
          ))}
        </div>
        <div className={styles.dtypeLegend}>
          {entries.map(([dtype, count]) => (
            <span key={dtype} className={styles.dtypeLegendItem}>
              <span className={styles.dtypeSwatch} style={{ background: dtypeColor(dtype) }} />
              <span>{dtype}</span>
              <span className={styles.dtypeCount}>{formatParamCount(count)}</span>
              <span>({((count / total) * 100).toFixed(1)}%)</span>
            </span>
          ))}
        </div>
      </div>
    </ViewSection>
  );
}

function TokenizerInfo({ info }: { info: ModelInfo }) {
  const tok = info.config?.tokenizer_config;
  if (!tok) return null;

  const tokens: Array<{ key: string; label: string; value: string }> = [];
  if (tok.bos_token) tokens.push({ key: "bos", label: "BOS", value: tok.bos_token });
  if (tok.eos_token) tokens.push({ key: "eos", label: "EOS", value: tok.eos_token });
  if (tok.pad_token) tokens.push({ key: "pad", label: "PAD", value: tok.pad_token });

  if (tokens.length === 0) return null;

  return (
    <ViewSection title="Tokenizer">
      <div className={styles.tokenRow}>
        {tokens.map((t) => (
          <span key={t.key} className={styles.tokenItem}>
            <span className={styles.tokenLabel}>{t.label}</span>
            <code className={styles.tokenValue}>{t.value}</code>
          </span>
        ))}
      </div>
    </ViewSection>
  );
}

const MAX_FILES_COLLAPSED = 6;

function ModelFiles({ siblings }: { siblings: ReadonlyArray<HubSibling> }) {
  const [expanded, setExpanded] = useState(false);

  if (siblings.length === 0) return null;

  const sorted = [...siblings].sort((a, b) => a.rfilename.localeCompare(b.rfilename));
  const show = expanded ? sorted : sorted.slice(0, MAX_FILES_COLLAPSED);

  return (
    <ViewSection title={`Files (${siblings.length})`}>
      <div className={styles.fileList}>
        {show.map((s) => (
          <div key={s.rfilename} className={styles.fileRow}>
            <span className={styles.fileName}>{s.rfilename}</span>
            {typeof s.size === "number" && (
              <span className={styles.fileSize}>{formatBytes(s.size)}</span>
            )}
          </div>
        ))}
      </div>
      {siblings.length > MAX_FILES_COLLAPSED && (
        <button
          type="button"
          className={styles.filesToggle}
          onClick={() => setExpanded(!expanded)}
        >
          <span className={clsx(styles.filesArrow, expanded && styles.filesArrowOpen)}>▶</span>
          {expanded ? "Show fewer" : `Show all ${siblings.length} files`}
        </button>
      )}
    </ViewSection>
  );
}

const MAX_SPACES_SHOWN = 5;

function LinkedSpaces({ spaces }: { spaces: ReadonlyArray<string> | undefined }) {
  if (!spaces || spaces.length === 0) return null;

  const shown = spaces.slice(0, MAX_SPACES_SHOWN);
  const remaining = spaces.length - shown.length;

  return (
    <ViewSection title={`Linked Spaces (${spaces.length})`}>
      <div className={styles.spacesRow}>
        {shown.map((id) => (
          <a
            key={id}
            className={styles.spaceLink}
            href={`https://huggingface.co/spaces/${id}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {id}
          </a>
        ))}
        {remaining > 0 && (
          <span className={styles.spacesMore}>+{remaining} more</span>
        )}
      </div>
    </ViewSection>
  );
}
