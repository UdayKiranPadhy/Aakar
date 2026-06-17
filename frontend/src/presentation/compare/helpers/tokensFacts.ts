/**
 * Pure: the Tokens & Context fact rows for one model, assembled from the Spec
 * alone (numeric token IDs live in `config_summary`; RoPE scaling in
 * `config_full`). Each row is included ONLY when its value is present — no
 * tokenization examples, vocabulary composition, or efficiency (no data source).
 */

import type { Spec } from "../../../domain/spec";
import { summaryNumber } from "./engineering";

export type TokenFact = Readonly<{ label: string; value: string }>;

/** Compact "key: value, …" summary of `config_full.rope_scaling`; null when absent. */
function ropeScalingText(spec: Spec): string | null {
  const cf = spec.config_full as Record<string, unknown> | undefined;
  const rs = cf?.rope_scaling;
  if (!rs || typeof rs !== "object" || Array.isArray(rs)) return null;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(rs as Record<string, unknown>)) {
    if (v == null || typeof v === "object") continue;
    parts.push(`${k}: ${v}`);
  }
  return parts.length > 0 ? parts.join(", ") : null;
}

export function tokenRows(spec: Spec | null): ReadonlyArray<TokenFact> {
  if (!spec) return [];
  const cs = spec.config_summary;
  const out: TokenFact[] = [];
  const push = (label: string, value: string | null) => {
    if (value !== null) out.push({ label, value });
  };
  const numStr = (key: string) => {
    const v = summaryNumber(cs, key);
    return v === undefined ? null : v.toLocaleString();
  };

  push("Vocabulary size", numStr("vocab_size"));
  const ctx = summaryNumber(cs, "max_position_embeddings");
  push("Context window", ctx === undefined ? null : `${ctx.toLocaleString()} tokens`);
  push("BOS token id", numStr("bos_token_id"));
  push("EOS token id", numStr("eos_token_id"));
  push("PAD token id", numStr("pad_token_id"));
  const theta = summaryNumber(cs, "rope_theta");
  push("RoPE θ (base)", theta === undefined ? null : theta.toLocaleString());
  push("RoPE scaling", ropeScalingText(spec));
  const win = summaryNumber(cs, "sliding_window");
  push("Sliding window", win === undefined ? null : `${win.toLocaleString()} tokens`);
  const experts = summaryNumber(cs, "num_local_experts");
  const perTok = summaryNumber(cs, "num_experts_per_tok");
  push("Experts", experts === undefined ? null : `${experts} experts · top-${perTok ?? "?"}`);

  return out;
}
