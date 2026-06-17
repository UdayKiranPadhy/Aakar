/**
 * Pure: auto-derived "Key differences" bullets for the Compare Overview tab. A
 * bullet is emitted ONLY when both models carry the field AND they actually
 * differ — so the panel hides itself entirely for two identical (or one-sided)
 * inputs. Everything is computed from real config facts; nothing is fabricated.
 */

import type { Spec } from "../../../domain/spec";
import { formatParamCount } from "../../components/ui/format";
import { attentionRegime, summaryNumber, totalParams } from "./engineering";

export type KeyDifference = Readonly<{ label: string; text: string }>;

function shortName(id: string): string {
  const i = id.lastIndexOf("/");
  return i >= 0 ? id.slice(i + 1) : id;
}

export function keyDifferences(a: Spec | null, b: Spec | null): ReadonlyArray<KeyDifference> {
  if (!a || !b) return [];
  const out: KeyDifference[] = [];
  const aShort = shortName(a.model_id);
  const bShort = shortName(b.model_id);

  // Parameter ratio.
  const pa = totalParams(a);
  const pb = totalParams(b);
  if (pa !== undefined && pb !== undefined && pa !== pb && Math.min(pa, pb) > 0) {
    const aBigger = pa > pb;
    const big = aBigger ? pa : pb;
    const small = aBigger ? pb : pa;
    const ratio = big / small;
    out.push({
      label: "Parameters",
      text: `${aBigger ? aShort : bShort} has ${ratio.toFixed(ratio >= 10 ? 0 : 1)}× more parameters (${formatParamCount(big)} vs ${formatParamCount(small)})`,
    });
  }

  const numeric = (label: string, noun: string, key: string) => {
    const va = summaryNumber(a.config_summary, key);
    const vb = summaryNumber(b.config_summary, key);
    if (va === undefined || vb === undefined || va === vb) return;
    const aMore = va > vb;
    out.push({
      label,
      text: `${aMore ? aShort : bShort} has more ${noun} (${(aMore ? va : vb).toLocaleString()} vs ${(aMore ? vb : va).toLocaleString()})`,
    });
  };

  numeric("Depth", "decoder layers", "num_hidden_layers");
  numeric("Attention heads", "attention heads", "num_attention_heads");
  numeric("KV heads", "key-value heads", "num_key_value_heads");
  numeric("Vocabulary", "vocabulary tokens", "vocab_size");

  // Context window (phrased naturally rather than "more context length").
  const ca = summaryNumber(a.config_summary, "max_position_embeddings");
  const cb = summaryNumber(b.config_summary, "max_position_embeddings");
  if (ca !== undefined && cb !== undefined && ca !== cb) {
    const aMore = ca > cb;
    out.push({
      label: "Context",
      text: `${aMore ? aShort : bShort} has a longer context window (${(aMore ? ca : cb).toLocaleString()} vs ${(aMore ? cb : ca).toLocaleString()} tokens)`,
    });
  }

  // Attention regime (MHA / GQA / MQA).
  const ra = attentionRegime(a.config_summary);
  const rb = attentionRegime(b.config_summary);
  if (ra !== "—" && rb !== "—" && ra !== rb) {
    out.push({ label: "Attention", text: `${aShort} uses ${ra}, ${bShort} uses ${rb}` });
  }

  // MoE vs dense (only when exactly one side declares experts).
  const ea = summaryNumber(a.config_summary, "num_local_experts");
  const eb = summaryNumber(b.config_summary, "num_local_experts");
  if ((ea !== undefined) !== (eb !== undefined)) {
    const moeShort = ea !== undefined ? aShort : bShort;
    const denseShort = ea !== undefined ? bShort : aShort;
    const experts = ea ?? eb;
    out.push({
      label: "Architecture",
      text: `${moeShort} uses a mixture-of-experts FFN (${experts} experts); ${denseShort} is dense`,
    });
  }

  return out;
}
