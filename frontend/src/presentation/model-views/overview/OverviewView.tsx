/**
 * Overview — the model's "home" dashboard, modelled on a HuggingFace model
 * card: a breadcrumb + title block with badges and actions, a row of headline
 * stat cards, an About summary lifted from the README, and a grid of cards
 * (Architecture · Model Details · Parameters · Linked Spaces · Research · Files
 * · the full model card).
 *
 * Everything is *data-driven*: each card and each field renders only when the
 * Hub / introspection actually returned that datum. A multimodal model that
 * exposes only a total param count shows a lean Parameters card; a plain text
 * model shows layers / heads / context. No field is ever fabricated, so the
 * page degrades gracefully for any model the user searches.
 */

import { useRef, useState, type ReactNode } from "react";
import { clsx } from "clsx";

import { useModelInfo } from "../../../application/useModelInfo";
import type { ModelView } from "../../../domain/navigation";
import type { HubSibling, ModelInfo } from "../../../domain/modelInfo";
import type { Spec } from "../../../domain/spec";
import { useArchStore } from "../../../store/archStore";
import { formatBytes, formatCompact, formatDate, formatParamCount, pct } from "../../components/ui/format";
import { dtypeColor, dtypeEntries } from "../../components/ui/dtypePalette";
import { fileRank, fileType } from "../../components/ui/fileClassify";
import {
  deriveLicense,
  deriveModality,
  deriveTopicTags,
  extractReadmeSummary,
  prettyWords,
} from "../../components/ui/hubFields";
import type { ModelViewProps } from "../ModelViewRegistry";
import { ViewEmpty, ViewError, ViewLoading } from "../shared/primitives";
import shared from "../shared/primitives.module.css";
import { Markdown } from "./Markdown";
import styles from "./OverviewView.module.css";
import {
  ArrowRightIcon,
  BookIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChipIcon,
  CompareIcon,
  CubeIcon,
  DatabaseIcon,
  DownloadIcon,
  ExternalLinkIcon,
  FileIcon,
  HeartIcon,
  LayersIcon,
  PaperIcon,
  SpacesIcon,
  StarIcon,
} from "./OverviewIcons";

// ── Main ─────────────────────────────────────────────────────────────────────

export function OverviewView({ spec }: ModelViewProps) {
  const { info, readme, loading, error } = useModelInfo(spec.model_id);
  const setModelView = useArchStore((s) => s.setModelView);
  const setAppMode = useArchStore((s) => s.setAppMode);
  const [readmeOpen, setReadmeOpen] = useState(false);
  const readmeRef = useRef<HTMLDivElement>(null);

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

  const hfUrl = `https://huggingface.co/${info.model_id}`;
  const goTo = (view: ModelView) => () => setModelView(view);
  const revealReadme = () => {
    setReadmeOpen(true);
    requestAnimationFrame(() =>
      readmeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.canvas}>
        <ModelBreadcrumb modelId={info.model_id} author={info.author} />

        {/* Title block: id + badges, with the primary actions on the right. */}
        <header className={styles.titleBlock}>
          <div className={styles.titleMain}>
            <h1 className={styles.title}>{info.model_id}</h1>
            <BadgeRow info={info} />
          </div>
          <div className={styles.actions}>
            <a className={clsx(styles.btn, styles.btnPrimary)} href={hfUrl} target="_blank" rel="noreferrer noopener">
              Open in HuggingFace
              <ExternalLinkIcon className={styles.btnIcon} />
            </a>
            <button type="button" className={clsx(styles.btn, styles.btnSecondary)} onClick={() => setAppMode("compare")}>
              <CompareIcon className={styles.btnIcon} />
              Compare
            </button>
            {typeof info.likes === "number" && (
              <a className={clsx(styles.btn, styles.btnSecondary)} href={hfUrl} target="_blank" rel="noreferrer noopener">
                <StarIcon className={styles.btnIcon} />
                {formatCompact(info.likes)}
              </a>
            )}
          </div>
        </header>

        <StatGrid spec={spec} info={info} />

        <AboutCard info={info} readme={readme} onViewReadme={readme ? revealReadme : undefined} />

        <div className={styles.twoCol}>
          <ArchitectureCard spec={spec} info={info} onDetails={goTo("architecture")} />
          <ModelDetailsCard spec={spec} info={info} />
        </div>

        <ParametersCard spec={spec} info={info} onDetails={goTo("parameters")} />

        <div className={styles.twoCol}>
          <LinkedSpacesCard spaces={info.spaces} modelId={info.model_id} />
          <ResearchCard info={info} onOpenResearch={goTo("research")} />
        </div>

        <FilesCard siblings={info.siblings} count={info.siblings.length} modelId={info.model_id} />

        {readme && (
          <div ref={readmeRef}>
            <ModelCardSection
              readme={readme}
              modelId={info.model_id}
              open={readmeOpen}
              onToggle={() => setReadmeOpen((v) => !v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Title block ────────────────────────────────────────────────────────────

function ModelBreadcrumb({ modelId, author }: { modelId: string; author?: string }) {
  const slash = modelId.indexOf("/");
  const owner = author ?? (slash >= 0 ? modelId.slice(0, slash) : null);
  const name = slash >= 0 ? modelId.slice(slash + 1) : modelId;
  return (
    <nav className={styles.crumbs} aria-label="Model location">
      <a className={styles.crumbLink} href="https://huggingface.co/models" target="_blank" rel="noreferrer noopener">
        Models
      </a>
      {owner && (
        <>
          <span className={styles.crumbSep}>/</span>
          <a
            className={styles.crumbLink}
            href={`https://huggingface.co/${owner}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {owner}
          </a>
        </>
      )}
      <span className={styles.crumbSep}>/</span>
      <span className={styles.crumbCurrent}>{name}</span>
    </nav>
  );
}

function BadgeRow({ info }: { info: ModelInfo }) {
  const modality = deriveModality(info.pipeline_tag);
  const license = deriveLicense(info);
  return (
    <div className={styles.badgeRow}>
      {modality && (
        <span className={clsx(styles.badge, styles.badgeStrong)}>
          <LayersIcon className={styles.badgeIcon} />
          {modality}
        </span>
      )}
      {info.library_name && (
        <span className={styles.badge}>
          <CubeIcon className={styles.badgeIcon} />
          {prettyWords(info.library_name)}
        </span>
      )}
      {info.pipeline_tag && <span className={clsx(styles.badge, styles.badgeAccent)}>{info.pipeline_tag}</span>}
      {license && (
        <span className={styles.badge}>
          <BookIcon className={styles.badgeIcon} />
          {license}
        </span>
      )}
    </div>
  );
}

// ── Stat cards ───────────────────────────────────────────────────────────────

function StatGrid({ spec, info }: { spec: Spec; info: ModelInfo }) {
  const params = totalParams(spec, info);
  const updated = formatDate(info.last_modified);
  const stats: Array<{ key: string; icon: ReactNode; value: string; label: string; tone?: string }> = [];

  if (typeof info.downloads === "number")
    stats.push({ key: "dl", icon: <DownloadIcon />, value: formatCompact(info.downloads), label: "Downloads", tone: styles.toneBlue });
  if (typeof info.likes === "number")
    stats.push({ key: "likes", icon: <HeartIcon />, value: info.likes.toLocaleString(), label: "Likes", tone: styles.toneLike });
  if (params !== null)
    stats.push({ key: "params", icon: <ChipIcon />, value: formatParamCount(params), label: "Parameters", tone: styles.tonePurple });
  if (typeof info.used_storage === "number")
    stats.push({ key: "store", icon: <DatabaseIcon />, value: formatBytes(info.used_storage) ?? "—", label: "Storage", tone: styles.toneGreen });
  if (updated) stats.push({ key: "upd", icon: <CalendarIcon />, value: updated, label: "Updated", tone: styles.toneAmber });
  if (info.spaces && info.spaces.length > 0)
    stats.push({ key: "spaces", icon: <SpacesIcon />, value: info.spaces.length.toLocaleString(), label: "Linked Spaces", tone: styles.toneBlue });

  if (stats.length === 0) return null;

  return (
    <div className={styles.statGrid}>
      {stats.map((s) => (
        <div key={s.key} className={styles.statCard}>
          <span className={clsx(styles.statIcon, s.tone)}>{s.icon}</span>
          <span className={styles.statValue}>{s.value}</span>
          <span className={styles.statLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── About ──────────────────────────────────────────────────────────────────

function AboutCard({
  info,
  readme,
  onViewReadme,
}: {
  info: ModelInfo;
  readme: string | null;
  onViewReadme?: () => void;
}) {
  const summary = extractReadmeSummary(readme);
  const topics = deriveTopicTags(info);
  if (!summary.lead && !summary.body && topics.length === 0) return null;

  return (
    <Card
      title="About"
      action={onViewReadme && <ActionButton onClick={onViewReadme} label="View full README" />}
    >
      {summary.lead && <p className={styles.aboutLead}>{summary.lead}</p>}
      {summary.body && <p className={styles.aboutBody}>{summary.body}</p>}
      {topics.length > 0 && (
        <div className={styles.topicRow}>
          {topics.map((t) => (
            <span key={t} className={styles.topic}>
              {t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Architecture (flow diagram) ──────────────────────────────────────────────

function ArchitectureCard({
  spec,
  info,
  onDetails,
}: {
  spec: Spec;
  info: ModelInfo;
  onDetails: () => void;
}) {
  const flow = pipelineFlow(info.pipeline_tag);
  const archClass = info.config?.architectures?.[0];
  const coreName = shortName(info.model_id);
  const kind = archKind(archClass, info.pipeline_tag);

  return (
    <Card title="Architecture" action={<ActionButton onClick={onDetails} label="View architecture details" />}>
      <div className={styles.flow}>
        <div className={styles.flowNode}>
          <span className={styles.flowLabel}>Input</span>
          <span className={styles.flowValue}>{flow.input}</span>
        </div>
        <ArrowRightIcon className={styles.flowArrow} />
        <button type="button" className={clsx(styles.flowNode, styles.flowCore)} onClick={onDetails}>
          <span className={styles.flowCoreName}>{coreName}</span>
          <span className={styles.flowCoreKind}>{kind}</span>
        </button>
        <ArrowRightIcon className={styles.flowArrow} />
        <div className={styles.flowNode}>
          <span className={styles.flowLabel}>Output</span>
          <span className={styles.flowValue}>{flow.output}</span>
        </div>
      </div>
      {spec.notes && spec.notes.length > 0 && <p className={styles.flowNote}>{spec.notes[0]}</p>}
    </Card>
  );
}

// ── Model details (key / value) ──────────────────────────────────────────────

function ModelDetailsCard({ spec, info }: { spec: Spec; info: ModelInfo }) {
  const rows: Array<{ label: string; value: string; mono?: boolean }> = [];
  const modelType = info.config?.model_type ?? spec.model_type;
  const archClass = info.config?.architectures?.[0];
  const license = deriveLicense(info);

  if (modelType) rows.push({ label: "Model Type", value: modelType, mono: true });
  if (archClass) rows.push({ label: "Architecture", value: archClass, mono: true });
  if (spec.attn_impl) rows.push({ label: "Attention", value: spec.attn_impl, mono: true });
  if (spec.position_encoding) rows.push({ label: "Position Encoding", value: spec.position_encoding, mono: true });
  if (spec.tied_word_embeddings) rows.push({ label: "Tied Embeddings", value: "yes" });
  if (license) rows.push({ label: "License", value: license });
  if (info.library_name) rows.push({ label: "Library", value: info.library_name });
  if (info.author) rows.push({ label: "Author", value: info.author });
  const created = formatDate(info.created_at);
  const updated = formatDate(info.last_modified);
  if (created) rows.push({ label: "Created", value: created });
  if (updated) rows.push({ label: "Last Updated", value: updated });

  if (rows.length === 0) return null;

  return (
    <Card title="Model Details">
      <dl className={styles.detailList}>
        {rows.map((r) => (
          <div key={r.label} className={styles.detailRow}>
            <dt className={styles.detailKey}>{r.label}</dt>
            <dd className={clsx(styles.detailVal, r.mono && styles.mono)}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

// ── Parameters (distribution + key numbers) ──────────────────────────────────

function ParametersCard({
  spec,
  info,
  onDetails,
}: {
  spec: Spec;
  info: ModelInfo;
  onDetails: () => void;
}) {
  const summary = spec.config_summary;
  const params = totalParams(spec, info);
  const dtype = dtypeEntries(info);

  const metrics: Array<{ label: string; value: string }> = [];
  if (params !== null) metrics.push({ label: "Total Parameters", value: formatParamCount(params) });
  pushNum(metrics, summary.num_hidden_layers, "Layers");
  pushNum(metrics, summary.hidden_size, "Hidden Size");
  pushNum(metrics, summary.num_attention_heads, "Attention Heads");
  pushNum(metrics, summary.num_key_value_heads, "KV Heads");
  if (typeof summary.max_position_embeddings === "number")
    metrics.push({ label: "Context Length", value: formatCompact(summary.max_position_embeddings) });
  if (typeof summary.vocab_size === "number")
    metrics.push({ label: "Vocabulary", value: summary.vocab_size.toLocaleString() });

  if (metrics.length === 0 && !dtype) return null;

  return (
    <Card title="Parameters" action={<ActionButton onClick={onDetails} label="View all details" />}>
      {dtype && (
        <div className={styles.dtype}>
          <span className={styles.dtypeCaption}>Parameter distribution (safetensors)</span>
          <div className={styles.dtypeBar}>
            {dtype.entries.map(([name, count]) => (
              <span
                key={name}
                className={styles.dtypeSeg}
                style={{ width: `${(count / dtype.total) * 100}%`, background: dtypeColor(name) }}
                title={`${name}: ${formatParamCount(count)} (${pct(count, dtype.total)})`}
              />
            ))}
          </div>
          <div className={styles.dtypeLegend}>
            {dtype.entries.map(([name, count]) => (
              <span key={name} className={styles.dtypeLegendItem}>
                <span className={styles.dtypeSwatch} style={{ background: dtypeColor(name) }} />
                <span className={styles.mono}>{name}</span>
                <span className={styles.dtypeLegendVal}>
                  {formatParamCount(count)} ({pct(count, dtype.total)})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
      {metrics.length > 0 && (
        <div className={styles.metricGrid}>
          {metrics.map((m) => (
            <div key={m.label} className={styles.metric}>
              <span className={styles.metricValue}>{m.value}</span>
              <span className={styles.metricLabel}>{m.label}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ── Linked spaces ────────────────────────────────────────────────────────────

const MAX_SPACES = 5;

function LinkedSpacesCard({
  spaces,
  modelId,
}: {
  spaces: ReadonlyArray<string> | undefined;
  modelId: string;
}) {
  if (!spaces || spaces.length === 0) return null;
  const shown = spaces.slice(0, MAX_SPACES);
  const remaining = spaces.length - shown.length;

  return (
    <Card
      title={`Linked Spaces (${spaces.length})`}
      action={
        <ActionLink href={`https://huggingface.co/${modelId}`} label="View all" external />
      }
    >
      <ul className={styles.linkList}>
        {shown.map((id) => (
          <li key={id}>
            <a
              className={styles.linkRow}
              href={`https://huggingface.co/spaces/${id}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <SpacesIcon className={styles.linkIcon} />
              <span className={styles.linkText}>{id}</span>
              <span className={styles.linkTag}>Space</span>
            </a>
          </li>
        ))}
      </ul>
      {remaining > 0 && <p className={styles.linkMore}>+{remaining} more spaces</p>}
    </Card>
  );
}

// ── Research & resources ─────────────────────────────────────────────────────

function ResearchCard({ info, onOpenResearch }: { info: ModelInfo; onOpenResearch: () => void }) {
  const arxiv = info.tags
    .filter((t) => t.toLowerCase().startsWith("arxiv:"))
    .map((t) => t.slice("arxiv:".length))
    .slice(0, 4);

  return (
    <Card title="Research & Resources" action={<ActionButton onClick={onOpenResearch} label="View all" />}>
      <ul className={styles.linkList}>
        {arxiv.map((id) => (
          <li key={id}>
            <a className={styles.linkRow} href={`https://arxiv.org/abs/${id}`} target="_blank" rel="noreferrer noopener">
              <PaperIcon className={styles.linkIcon} />
              <span className={styles.linkText}>arXiv:{id}</span>
              <span className={styles.linkTag}>Paper</span>
            </a>
          </li>
        ))}
        <li>
          <button type="button" className={styles.linkRow} onClick={onOpenResearch}>
            <BookIcon className={styles.linkIcon} />
            <span className={styles.linkText}>Papers, citations &amp; source code</span>
            <ArrowRightIcon className={styles.linkArrow} />
          </button>
        </li>
        <li>
          <a
            className={styles.linkRow}
            href={`https://huggingface.co/${info.model_id}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLinkIcon className={styles.linkIcon} />
            <span className={styles.linkText}>Model page on HuggingFace</span>
          </a>
        </li>
      </ul>
    </Card>
  );
}

// ── Files ──────────────────────────────────────────────────────────────────

const MAX_FILES = 8;

function FilesCard({
  siblings,
  count,
  modelId,
}: {
  siblings: ReadonlyArray<HubSibling>;
  count: number;
  modelId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (siblings.length === 0) return null;

  const sorted = [...siblings].sort(
    (a, b) => fileRank(a.rfilename) - fileRank(b.rfilename) || a.rfilename.localeCompare(b.rfilename),
  );
  const show = expanded ? sorted : sorted.slice(0, MAX_FILES);
  const remaining = sorted.length - show.length;

  return (
    <Card title={`Files (${count})`}>
      <div className={styles.fileTable}>
        <div className={clsx(styles.fileRow, styles.fileHead)}>
          <span>Name</span>
          <span>Type</span>
          <span className={styles.fileSizeCol}>Size</span>
        </div>
        {show.map((s) => (
          <div key={s.rfilename} className={styles.fileRow}>
            <a
              className={styles.fileName}
              href={`https://huggingface.co/${modelId}/blob/main/${encodeURI(s.rfilename)}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <FileIcon className={styles.fileIcon} />
              <span className={styles.fileNameText}>{s.rfilename}</span>
            </a>
            <span className={styles.fileType}>{fileType(s.rfilename)}</span>
            <span className={styles.fileSizeCol}>{formatBytes(s.size) ?? "—"}</span>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <button type="button" className={styles.fileToggle} onClick={() => setExpanded(true)}>
          + {remaining} more files
        </button>
      )}
      {expanded && sorted.length > MAX_FILES && (
        <button type="button" className={styles.fileToggle} onClick={() => setExpanded(false)}>
          Show fewer
        </button>
      )}
    </Card>
  );
}

// ── Full model card (README) ─────────────────────────────────────────────────

function ModelCardSection({
  readme,
  modelId,
  open,
  onToggle,
}: {
  readme: string;
  modelId: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <Card title="Model Card">
      <div className={clsx(styles.readme, !open && styles.readmeClamped)}>
        <Markdown source={readme} modelId={modelId} />
        {!open && <div className={styles.readmeFade} />}
      </div>
      <button type="button" className={styles.readmeToggle} onClick={onToggle}>
        {open ? "Show less" : "Show full model card"}
        <ChevronDownIcon className={clsx(styles.readmeChevron, open && styles.readmeChevronOpen)} />
      </button>
    </Card>
  );
}

// ── Building blocks ──────────────────────────────────────────────────────────

function Card({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={clsx(styles.card, className)}>
      {(title || action) && (
        <div className={styles.cardHead}>
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className={styles.cardAction} onClick={onClick}>
      {label}
      <ArrowRightIcon className={styles.cardActionIcon} />
    </button>
  );
}

function ActionLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  return (
    <a
      className={styles.cardAction}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
    >
      {label}
      <ArrowRightIcon className={styles.cardActionIcon} />
    </a>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function pushNum(
  out: Array<{ label: string; value: string }>,
  value: Spec["config_summary"][string] | undefined,
  label: string,
): void {
  if (typeof value === "number") out.push({ label, value: value.toLocaleString() });
}

function totalParams(spec: Spec, info: ModelInfo): number | null {
  if (typeof info.safetensors?.total === "number") return info.safetensors.total;
  const cs = spec.config_summary.total_params;
  return typeof cs === "number" ? cs : null;
}

function shortName(modelId: string): string {
  const slash = modelId.lastIndexOf("/");
  return slash >= 0 ? modelId.slice(slash + 1) : modelId;
}

/** Friendly "kind" line for the architecture core box. */
function archKind(archClass: string | undefined, pipeline: string | undefined): string {
  if (deriveModality(pipeline) === "Multimodal") return "Multimodal Transformer";
  const a = (archClass ?? "").toLowerCase();
  if (a.includes("causallm") || a.includes("lmhead")) return "Transformer Decoder";
  if (a.includes("formaskedlm")) return "Transformer Encoder";
  if (a.includes("forconditionalgeneration") || a.includes("seq2seq")) return "Encoder · Decoder";
  if (a.includes("forsequenceclassification") || a.includes("fortokenclassification")) return "Transformer Encoder";
  if (a.includes("model")) return "Transformer";
  return "Transformer";
}

const MODALITY_WORDS: Record<string, string> = {
  image: "Image",
  text: "Text",
  audio: "Audio",
  video: "Video",
  visual: "Image",
  speech: "Audio",
  token: "Tokens",
  any: "Any",
};
/** Map a pipeline tag to "input → output" modality labels (splits on "-to-"). */
function pipelineFlow(pipeline?: string): { input: string; output: string } {
  if (!pipeline) return { input: "Tokens", output: "Tokens" };
  const p = pipeline.toLowerCase();
  const label = (s: string) =>
    s
      .split("-")
      .map((w) => MODALITY_WORDS[w] ?? prettyWords(w))
      .join(" · ");
  if (p.includes("-to-")) {
    const idx = p.indexOf("-to-");
    return { input: label(p.slice(0, idx)), output: label(p.slice(idx + 4)) };
  }
  if (p.endsWith("-generation") || p === "fill-mask") return { input: "Text", output: "Text" };
  if (p.includes("speech-recognition")) return { input: "Audio", output: "Text" };
  if (p.includes("question-answering")) return { input: "Question · Context", output: "Answer" };
  if (p.includes("summarization") || p.includes("translation")) return { input: "Text", output: "Text" };
  const head = p.split("-")[0] ?? p;
  if (p.includes("classification")) return { input: label(head), output: "Class" };
  return { input: label(head), output: "Output" };
}
