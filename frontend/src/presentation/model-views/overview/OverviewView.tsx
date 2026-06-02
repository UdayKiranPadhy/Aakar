/**
 * Overview — the model's HuggingFace Hub card: stats (downloads / likes /
 * updated), license + pipeline + library pills, lineage (base_model), tags, and
 * the README rendered as markdown.
 */

import { useModelInfo } from "../../../application/useModelInfo";
import { formatParamCount } from "../../components/ui/format";
import { Pill } from "../../components/ui/Pill";
import type { ModelViewProps } from "../ModelViewRegistry";
import { ViewEmpty, ViewError, ViewLoading } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import { Markdown } from "./Markdown";
import styles from "./OverviewView.module.css";

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

  return (
    <div className={shared.view}>
      <header className={styles.header}>
        <h2 className={styles.modelId}>{info.model_id}</h2>
        <div className={styles.pills}>
          {info.pipeline_tag && <Pill tone="accent">{info.pipeline_tag}</Pill>}
          {info.license && <Pill tone="neutral">{info.license}</Pill>}
          {info.library_name && <Pill tone="neutral">{info.library_name}</Pill>}
        </div>
      </header>

      <div className={styles.stats}>
        {typeof info.downloads === "number" && (
          <Stat value={formatParamCount(info.downloads)} label="Downloads" />
        )}
        {typeof info.likes === "number" && <Stat value={info.likes.toLocaleString()} label="Likes" />}
        {updated && <Stat value={updated} label="Updated" />}
      </div>

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

      {info.tags.length > 0 && (
        <div className={styles.tags}>
          {info.tags.map((tag) => (
            <Pill key={tag} tone="neutral">
              {tag}
            </Pill>
          ))}
        </div>
      )}

      {readme ? (
        <Markdown source={readme} />
      ) : (
        <ViewEmpty message="This model has no README / model card." />
      )}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
