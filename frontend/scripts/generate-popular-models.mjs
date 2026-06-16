#!/usr/bin/env node
/**
 * Generates `src/infrastructure/api/popularModels.ts` — a popularity-ranked list
 * of HuggingFace model ids for the search-bar autocomplete.
 *
 * WHY a bundled list: calling the Hub directly from the browser is unreliable in
 * production (its CloudFront edges intermittently drop the per-origin CORS
 * header), and we don't want a backend hop for search. So we fetch popular ids
 * here (server-side — no CORS) at author/maintainer discretion and ship the
 * result as a static asset the app filters in memory. No runtime network call.
 *
 * Run:  pnpm generate:models
 *
 * WHAT we keep — only models the visualizer can actually load *and* that are
 * worth studying as an architecture:
 *
 *   1. Supported architecture. Every query is scoped to
 *      `pipeline_tag=text-generation&library=transformers`, so suggestions are
 *      decoder LLMs the introspector can build from a stock `transformers` class
 *      (no diffusion / vision / audio / embedding / time-series models, which
 *      either aren't `transformers` at all or aren't the LLM architectures this
 *      tool visualizes). Custom-code repos (`custom_code` tag → trust_remote_code)
 *      are dropped too: the introspector refuses to run them, so they'd only ever
 *      surface the "Architecture not supported" page.
 *   2. Ungated. Gated repos need an auth token to load, so the introspector
 *      can't fetch their config anyway — `gated` must be exactly `false`.
 *   3. Base models, not fine-tunes. An Instruct/Chat/quantized/distilled/merged
 *      derivative has the same nn.Module tree as its parent, so it adds clutter,
 *      not architecture. HF's structured `base_model:` tag is the primary signal
 *      and we drop anything carrying it; because that metadata is inconsistently
 *      populated, `isDerivativeName` additionally catches the well-known *naming*
 *      conventions it misses. (A long tail of older community fine-tunes declares
 *      neither — those can only be excluded by a brand blocklist, which we avoid
 *      so the rules stay valid as new families appear.)
 *
 * Popularity = downloads is the global ranking key; likes / trending widen
 * coverage.
 */

import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HUB = "https://huggingface.co/api/models";
const TARGET = 600;

// Per-item fields we need to filter. The list endpoint returns these inline
// (via `expand[]`), so no extra per-model request is needed.
const EXPAND = ["downloads", "gated", "tags", "pipeline_tag", "library_name"]
  .map((f) => `expand[]=${f}`)
  .join("&");

const SOURCES = [
  `pipeline_tag=text-generation&library=transformers&sort=downloads&direction=-1&limit=1000&${EXPAND}`,
  `pipeline_tag=text-generation&library=transformers&sort=likes&direction=-1&limit=400&${EXPAND}`,
  `pipeline_tag=text-generation&library=transformers&sort=trendingScore&direction=-1&limit=200&${EXPAND}`,
];

// --- "base model" name heuristics --------------------------------------------
// Fallback for repos whose structured `base_model:` tag is unset. Matched
// against the id, anchored to a path/separator boundary to avoid false hits
// (e.g. "distill" must not catch "distilgpt2", which is one 'l'). Technique- and
// format-based only — deliberately no brand names — so the rules don't rot as
// new model families ship.
const FINETUNE =
  /(?:^|[-_/.])(?:instruct|chat|sft|dpo|orpo|kto|grpo|ppo|rlhf|reasoner|reasoning|thinking|distill(?:ed)?|uncensored|abliterated|roleplay|lora|qlora|merged?)/i;
const QUANT =
  /(?:^|[-_/.])(?:gguf|awq|gptq|exl2|mlx|bnb|nf4|int4|int8|(?:nv|mx)?fp[48]|4bit|8bit|w\d+[aw]\d+)(?:[-_/.]|\d|$)/i;
// Short suffixes that are too ambiguous without a strict boundary: "-it" (Gemma
// instruct), "-ft" (generic fine-tune).
const SHORT_SUFFIX = /(?:^|[-_/.])(?:it|ft)(?:[-_/.]|\d|$)/i;
// CI/test fixtures (e.g. `tiny-random-LlamaForCausalLM`, `*-unit-test`). Real
// published models don't put the model *class* in the repo id.
const TEST_FIXTURE =
  /tiny[-_]random|For(?:CausalLM|ConditionalGeneration|SequenceClassification|MaskedLM)|(?:^|[-_/.])(?:testing|dummy|debug)(?:[-_/.]|$)|unit[-_]?test/i;

function isDerivativeName(id) {
  return FINETUNE.test(id) || QUANT.test(id) || SHORT_SUFFIX.test(id) || TEST_FIXTURE.test(id);
}

function isSupportedBaseModel(m) {
  const tags = m.tags ?? [];
  if (m.gated !== false) return false; // gated → introspector can't fetch config without a token
  if (m.library_name !== "transformers") return false; // introspector loads stock transformers classes
  if (m.pipeline_tag !== "text-generation") return false; // decoder LLMs only — what this tool visualizes
  if (tags.includes("custom_code")) return false; // trust_remote_code → not run, "Architecture not supported"
  if (tags.some((t) => t.startsWith("base_model:"))) return false; // HF says this is a derivative
  if (isDerivativeName(m.id)) return false; // derivative by naming convention (metadata not set)
  return true;
}

async function fetchSource(qs) {
  const res = await fetch(`${HUB}?${qs}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HF responded ${res.status}`);
  return res.json();
}

// id -> model object (keeping the max downloads seen — the global ranking key).
const modelsById = new Map();

for (const qs of SOURCES) {
  try {
    const models = await fetchSource(qs);
    for (const m of models) {
      if (!m?.id) continue;
      const dl = typeof m.downloads === "number" ? m.downloads : 0;
      const prev = modelsById.get(m.id);
      if (!prev || dl > (prev.downloads ?? -1)) modelsById.set(m.id, m);
    }
    console.log(`  ${qs.split("&sort")[0].slice(0, 48).padEnd(48)} → ${models.length} models`);
  } catch (e) {
    console.warn(`  ${qs.split("&sort")[0].slice(0, 48).padEnd(48)} → SKIPPED (${e.message})`);
  }
}

const all = [...modelsById.values()];
const ids = all
  .filter(isSupportedBaseModel)
  .sort((a, b) => (b.downloads ?? 0) - (a.downloads ?? 0)) // most downloads first
  .slice(0, TARGET)
  .map((m) => m.id);

console.log(`\nFiltered ${all.length} fetched → ${ids.length} ungated base text-generation models.`);

if (ids.length === 0) {
  console.error("No model ids survived filtering — aborting so the existing list isn't wiped.");
  process.exit(1);
}

const file = `// AUTO-GENERATED by scripts/generate-popular-models.mjs — do not edit by hand.
// Regenerate with:  pnpm generate:models   (last run: ${new Date().toISOString().slice(0, 10)})
//
// ${ids.length} popular HuggingFace model ids, ranked by downloads. Scoped to
// ungated, base (non-fine-tuned) text-generation transformers models — i.e.
// decoder LLMs the introspector can load. Powers the search-bar autocomplete
// entirely client-side (no network call).
export const POPULAR_MODELS: readonly string[] = [
${ids.map((id) => `  ${JSON.stringify(id)},`).join("\n")}
];
`;

const out = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/infrastructure/api/popularModels.ts",
);
writeFileSync(out, file);
console.log(`Wrote ${ids.length} model ids → ${out}`);
