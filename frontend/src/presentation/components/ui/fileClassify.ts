/**
 * Pure file-taxonomy helpers for HuggingFace repo `siblings`: a human label per
 * file, a sort priority that floats config/tokenizer above weight shards, and a
 * bucket grouping (weights / config / tokenizer / docs / other) that the Files
 * donut and largest-files lists are built from. Shared by the Overview view and
 * the Compare Files tab.
 */

import type { HubSibling } from "../../../domain/modelInfo";

/** Human label for a file by extension. */
export function fileType(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".safetensors.index.json")) return "Index";
  if (n.endsWith(".safetensors")) return "Safetensors";
  if (n.endsWith(".jinja")) return "Template";
  if (n.endsWith(".md")) return "Markdown";
  if (n.endsWith(".txt")) return "Text";
  if (n.endsWith(".json")) return "JSON";
  if (n.endsWith(".model") || n.endsWith(".vocab")) return "Tokenizer";
  if (n.endsWith(".bin") || n.endsWith(".pt") || n.endsWith(".pth") || n.endsWith(".ckpt")) return "PyTorch";
  if (n.endsWith(".gguf")) return "GGUF";
  if (n.endsWith(".onnx")) return "ONNX";
  if (n.endsWith(".h5")) return "Keras";
  if (n === ".gitattributes" || n === "license" || n.endsWith("/license")) return "Config";
  const dot = n.lastIndexOf(".");
  return dot >= 0 ? n.slice(dot + 1).toUpperCase() : "File";
}

/** Sort priority so config / tokenizer files surface above weight shards. */
export function fileRank(name: string): number {
  const n = name.toLowerCase();
  if (n === "readme.md") return 0;
  if (n === "config.json") return 1;
  if (n.includes("config") && n.endsWith(".json")) return 2;
  if (n.includes("token")) return 3;
  if (n.endsWith(".safetensors.index.json")) return 4;
  if (n.endsWith(".json") || n.endsWith(".jinja") || n.endsWith(".txt") || n.endsWith(".md")) return 5;
  if (n.endsWith(".safetensors") || n.endsWith(".bin")) return 7;
  return 6;
}

export type FileBucket = "weights" | "config" | "tokenizer" | "docs" | "other";

/** Coarse bucket a file falls into, for the file-type breakdown donut. */
export function fileBucket(name: string): FileBucket {
  const n = name.toLowerCase();
  if (n.endsWith(".safetensors.index.json")) return "config";
  if (
    n.endsWith(".safetensors") ||
    n.endsWith(".bin") ||
    n.endsWith(".pt") ||
    n.endsWith(".pth") ||
    n.endsWith(".ckpt") ||
    n.endsWith(".gguf") ||
    n.endsWith(".onnx") ||
    n.endsWith(".h5")
  ) {
    return "weights";
  }
  if (
    n.includes("token") ||
    n.includes("vocab") ||
    n.includes("merges") ||
    n.endsWith(".model") ||
    n.endsWith(".jinja")
  ) {
    return "tokenizer";
  }
  if (n.endsWith(".json")) return "config";
  if (n === ".gitattributes" || n === "license" || n.endsWith("/license")) return "config";
  if (n.endsWith(".md") || n.endsWith(".txt")) return "docs";
  return "other";
}

const BUCKET_LABEL: Record<FileBucket, string> = {
  weights: "Model weights",
  config: "Config / code",
  tokenizer: "Tokenizer",
  docs: "Documentation",
  other: "Other",
};
const BUCKET_ORDER: ReadonlyArray<FileBucket> = ["weights", "config", "tokenizer", "docs", "other"];

export type FileBucketSummary = Readonly<{
  bucket: FileBucket;
  label: string;
  /** Summed size of files in this bucket that report a size (0 when none do). */
  bytes: number;
  /** Number of files in this bucket (always counted, size or not). */
  count: number;
}>;

/**
 * Group `siblings` into file buckets, summing byte sizes (over files that have a
 * size) and counting files. Returns buckets in a stable order, omitting empties.
 */
export function classifyFiles(siblings: ReadonlyArray<HubSibling>): ReadonlyArray<FileBucketSummary> {
  const acc = new Map<FileBucket, { bytes: number; count: number }>();
  for (const s of siblings) {
    const bucket = fileBucket(s.rfilename);
    const cur = acc.get(bucket) ?? { bytes: 0, count: 0 };
    cur.count += 1;
    if (typeof s.size === "number") cur.bytes += s.size;
    acc.set(bucket, cur);
  }
  return BUCKET_ORDER.filter((b) => acc.has(b)).map((bucket) => {
    const v = acc.get(bucket)!;
    return { bucket, label: BUCKET_LABEL[bucket], bytes: v.bytes, count: v.count };
  });
}
