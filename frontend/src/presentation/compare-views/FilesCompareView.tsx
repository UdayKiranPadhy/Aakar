/**
 * Files tab — the repository file list for each model: total storage, a
 * file-type breakdown donut, the largest files, and the full file list. All
 * fetched from the Hub via `useModelInfo` (one fetch per slot, lazy — only when
 * this tab is active).
 */

import { useModelInfo, type ModelInfoState } from "../../application/useModelInfo";
import type { HubSibling } from "../../domain/modelInfo";
import type { Spec } from "../../domain/spec";
import { DonutChart } from "../compare/charts/DonutChart";
import { CompareSection, DualColumns, ModelCard, Stat, type Tone } from "../compare/primitives";
import { classifyFiles, fileRank, fileType } from "../components/ui/fileClassify";
import { formatBytes } from "../components/ui/format";
import { ViewError, ViewLoading } from "../model-views/shared/primitives";
import type { CompareViewProps } from "./CompareViewRegistry";
import shared from "./shared.module.css";
import styles from "./FilesCompareView.module.css";

const TOP_FILES = 5;

function FileRow({ file, modelId }: { file: HubSibling; modelId: string }) {
  const href = `https://huggingface.co/${modelId}/blob/main/${encodeURI(file.rfilename)}`;
  return (
    <li className={styles.fileRow}>
      <a className={styles.fileName} href={href} target="_blank" rel="noreferrer noopener" title={file.rfilename}>
        {file.rfilename}
      </a>
      <span className={styles.fileType}>{fileType(file.rfilename)}</span>
      <span className={styles.fileSize}>{formatBytes(file.size) ?? "—"}</span>
    </li>
  );
}

function FilesColumn({ spec, state, tone }: { spec: Spec | null; state: ModelInfoState; tone: Tone }) {
  if (!spec) {
    return (
      <ModelCard title={null} tone={tone}>
        <span className={shared.muted}>—</span>
      </ModelCard>
    );
  }
  if (state.loading) {
    return (
      <ModelCard title={spec.model_id} tone={tone}>
        <ViewLoading label="Loading files…" />
      </ModelCard>
    );
  }
  if (state.error || !state.info) {
    return (
      <ModelCard title={spec.model_id} tone={tone}>
        <ViewError message={state.error ?? "No file data available."} />
      </ModelCard>
    );
  }

  const { siblings, used_storage } = state.info;
  if (siblings.length === 0) {
    return (
      <ModelCard title={spec.model_id} tone={tone}>
        <span className={shared.muted}>No files listed.</span>
      </ModelCard>
    );
  }

  const buckets = classifyFiles(siblings);
  const totalBytes = buckets.reduce((sum, bkt) => sum + bkt.bytes, 0);
  const useBytes = totalBytes > 0;
  const slices = buckets.map((bkt) => ({ id: bkt.bucket, label: bkt.label, value: useBytes ? bkt.bytes : bkt.count }));
  const center = useBytes ? formatBytes(totalBytes) ?? "" : String(siblings.length);
  const fmtValue = useBytes ? (v: number) => formatBytes(v) ?? "" : (v: number) => v.toLocaleString();

  const largest = [...siblings]
    .filter((s) => typeof s.size === "number")
    .sort((x, y) => (y.size ?? 0) - (x.size ?? 0))
    .slice(0, TOP_FILES);
  const sorted = [...siblings].sort(
    (x, y) => fileRank(x.rfilename) - fileRank(y.rfilename) || x.rfilename.localeCompare(y.rfilename),
  );

  return (
    <ModelCard title={spec.model_id} tone={tone}>
      {typeof used_storage === "number" && (
        <Stat label="Total storage" value={formatBytes(used_storage) ?? "—"} accent />
      )}

      <DonutChart
        slices={slices}
        centerPrimary={center}
        centerSecondary={useBytes ? "total" : "files"}
        formatValue={fmtValue}
        ariaLabel={`File-type breakdown for ${spec.model_id}`}
      />

      {largest.length > 0 && (
        <div className={styles.block}>
          <span className={styles.blockTitle}>Largest files</span>
          <ul className={styles.fileList}>
            {largest.map((f) => (
              <FileRow key={f.rfilename} file={f} modelId={spec.model_id} />
            ))}
          </ul>
        </div>
      )}

      <div className={styles.block}>
        <span className={styles.blockTitle}>All files ({siblings.length})</span>
        <ul className={`${styles.fileList} ${styles.scroll}`}>
          {sorted.map((f) => (
            <FileRow key={f.rfilename} file={f} modelId={spec.model_id} />
          ))}
        </ul>
      </div>
    </ModelCard>
  );
}

export function FilesCompareView({ a, b }: CompareViewProps) {
  const infoA = useModelInfo(a?.model_id);
  const infoB = useModelInfo(b?.model_id);

  return (
    <CompareSection id="files" title="Repository files">
      <DualColumns>
        <FilesColumn spec={a} state={infoA} tone="a" />
        <FilesColumn spec={b} state={infoB} tone="b" />
      </DualColumns>
    </CompareSection>
  );
}
