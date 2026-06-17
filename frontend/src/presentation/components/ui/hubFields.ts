/**
 * Pure helpers for interpreting HuggingFace Hub metadata (`ModelInfo`) — license
 * resolution, modality inference, topic-tag filtering, README summarising, and
 * safe special-token unwrapping. Shared by the single-model Overview view and the
 * Compare tabs so the logic lives in exactly one place.
 *
 * Everything here is fact-driven: a helper returns `null`/`[]` rather than
 * guessing when the Hub didn't provide the datum.
 */

import type { HubToken, ModelInfo } from "../../../domain/modelInfo";

/** Capitalise each hyphen/underscore/space-separated word: "long-context" → "Long Context". */
export function prettyWords(raw: string): string {
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const KNOWN_LICENSES: Record<string, string> = {
  mit: "MIT",
  "apache-2.0": "Apache-2.0",
  apache: "Apache",
  "bsd-3-clause": "BSD-3-Clause",
  "bsd-2-clause": "BSD-2-Clause",
  "gpl-3.0": "GPL-3.0",
  "agpl-3.0": "AGPL-3.0",
  "lgpl-3.0": "LGPL-3.0",
  "cc-by-4.0": "CC-BY-4.0",
  "cc-by-sa-4.0": "CC-BY-SA-4.0",
  "cc-by-nc-4.0": "CC-BY-NC-4.0",
  "cc-by-nc-sa-4.0": "CC-BY-NC-SA-4.0",
  "creativeml-openrail-m": "CreativeML-OpenRAIL-M",
  "bigscience-openrail-m": "BigScience-OpenRAIL-M",
  openrail: "OpenRAIL",
  "openrail++": "OpenRAIL++",
  unlicense: "Unlicense",
  other: "Other",
};

function prettyLicense(raw: string): string {
  const key = raw.toLowerCase().trim();
  if (KNOWN_LICENSES[key]) return KNOWN_LICENSES[key];
  return raw
    .split("-")
    .map((seg) => (/^[a-z]+$/.test(seg) ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg))
    .join("-");
}

/** Resolve a display license from the top-level field, a `license:` tag, or card data; null if none. */
export function deriveLicense(info: ModelInfo): string | null {
  if (typeof info.license === "string" && info.license) return prettyLicense(info.license);
  const tag = info.tags.find((t) => t.toLowerCase().startsWith("license:"));
  if (tag) return prettyLicense(tag.slice(tag.indexOf(":") + 1));
  const cd = info.card_data?.license;
  if (typeof cd === "string" && cd) return prettyLicense(cd);
  return null;
}

/** Top-level "Multimodal / Vision / Audio" descriptor inferred from the pipeline tag; null otherwise. */
export function deriveModality(pipeline?: string): string | null {
  if (!pipeline) return null;
  const p = pipeline.toLowerCase();
  const hasImg = p.includes("image") || p.includes("visual") || p.includes("video");
  const hasAud = p.includes("audio") || p.includes("speech");
  const hasTxt = p.includes("text") || p.includes("token");
  if ((hasImg || hasAud) && hasTxt) return "Multimodal";
  if (hasImg && hasAud) return "Multimodal";
  if (hasImg) return "Vision";
  if (hasAud) return "Audio";
  return null;
}

/** Meaningful "topic" tags for the About section — Hub tags minus plumbing. */
const TAG_NOISE_PREFIX = ["license:", "region:", "arxiv:", "dataset:", "base_model", "doi:", "co2_eq", "deploy:"];
const TAG_NOISE_EXACT = new Set([
  "safetensors",
  "transformers",
  "pytorch",
  "tensorflow",
  "jax",
  "gguf",
  "onnx",
  "endpoints_compatible",
  "autotrain_compatible",
  "text-generation-inference",
  "custom_code",
  "has_space",
  "model-index",
  "eval-results",
  "mteb",
]);

export function deriveTopicTags(info: ModelInfo): string[] {
  const cd = info.card_data?.tags;
  const cardTags = Array.isArray(cd) ? cd.filter((t): t is string => typeof t === "string") : [];
  const source = cardTags.length > 0 ? cardTags : info.tags;
  const modelType = info.config?.model_type?.toLowerCase();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of source) {
    const t = raw.toLowerCase();
    if (TAG_NOISE_PREFIX.some((p) => t.startsWith(p))) continue;
    if (TAG_NOISE_EXACT.has(t)) continue;
    if (t === info.pipeline_tag || t === modelType) continue;
    if (t.length < 2 || seen.has(t)) continue;
    seen.add(t);
    out.push(prettyWords(raw));
    if (out.length >= 8) break;
  }
  return out;
}

// A paragraph that ends mid-thought (it ran into a heading or list in the
// README) gets a trailing ellipsis so it doesn't read as a hard stop.
function tidy(s: string): string {
  return /[.!?:…]$/.test(s) ? s : `${s}…`;
}

function cleanProse(s: string): string {
  return s
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "") // badge links: [![alt](img)](href)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // images
    .replace(/\[\]\([^)]*\)/g, "") // empty-text links left after image strip
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links → text
    .replace(/`([^`]+)`/g, "$1") // inline code
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1") // bold / italic
    .replace(/<[^>]+>/g, "") // stray html
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > n * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** First two prose paragraphs of the README (frontmatter / badges / tables stripped). */
export function extractReadmeSummary(readme: string | null): { lead: string | null; body: string | null } {
  if (!readme) return { lead: null, body: null };
  const md = readme.replace(/^﻿?\s*---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const paras: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) {
      const text = buf.join(" ");
      if (/[a-zA-Z]{3,}/.test(text)) paras.push(text);
      buf = [];
    }
  };
  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (
      !line ||
      line.startsWith("#") ||
      line.startsWith(">") ||
      line.startsWith("|") ||
      line.startsWith("<") ||
      /^[-*+]\s/.test(line) ||
      /^\d+\.\s/.test(line) ||
      /^([-*=_])\1{2,}$/.test(line)
    ) {
      flush();
      if (paras.length >= 2) break;
      continue;
    }
    const cleaned = cleanProse(line);
    if (cleaned) buf.push(cleaned);
    else flush();
  }
  flush();
  return {
    lead: paras[0] ? tidy(truncate(paras[0], 260)) : null,
    body: paras[1] ? tidy(truncate(paras[1], 360)) : null,
  };
}

/**
 * Safely unwrap a `tokenizer_config` special token to its display string. The Hub
 * returns these as a plain string, an `AddedToken` object (`{ content }`), or
 * `null` — so this guarantees no object is ever handed to a React child.
 */
export function tokenText(token: HubToken | undefined): string | null {
  if (typeof token === "string") return token || null;
  if (token && typeof token === "object" && typeof token.content === "string") {
    return token.content || null;
  }
  return null;
}
