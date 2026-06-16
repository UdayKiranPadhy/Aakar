/**
 * Pure helpers for the Config Explorer (no React).
 *
 * FUTURE-PROOF: `flattenConfig` renders EVERY key (recursing nested objects and
 * arrays into dotted/bracketed paths), and `groupConfig` only *organizes* keys —
 * its heuristics never drop one (a catch-all "Other" bucket guarantees it). So
 * new `transformers` config fields always show up.
 */

export type ConfigValue = string | number | boolean | null;
export type ConfigLeaf = Readonly<{ path: string; value: ConfigValue }>;

export function flattenConfig(obj: Record<string, unknown>): ConfigLeaf[] {
  const out: ConfigLeaf[] = [];
  for (const [key, value] of Object.entries(obj)) {
    pushValue(out, key, value);
  }
  return out;
}

function pushValue(out: ConfigLeaf[], path: string, value: unknown): void {
  if (value === null || value === undefined) {
    out.push({ path, value: null });
  } else if (Array.isArray(value)) {
    if (value.length === 0) out.push({ path, value: "[]" });
    else value.forEach((item, i) => pushValue(out, `${path}[${i}]`, item));
  } else if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) out.push({ path, value: "{}" });
    else for (const [k, v] of entries) pushValue(out, `${path}.${k}`, v);
  } else if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    out.push({ path, value });
  } else {
    out.push({ path, value: String(value) });
  }
}

/** Render a leaf value for display. Shared by the Config Explorer and Compare diff. */
export function formatConfigValue(value: ConfigValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    return value.toLocaleString("en-US", { maximumFractionDigits: 20 });
  }
  return value;
}

type GroupDef = Readonly<{ id: string; label: string; test: RegExp }>;

// Order matters: first matching group on the TOP-LEVEL key wins.
const GROUPS: ReadonlyArray<GroupDef> = [
  { id: "attention", label: "Attention", test: /attn|attention|head|kv|rope|rotary|sliding|window/i },
  { id: "layers", label: "Layers & Depth", test: /_layers$|num_hidden|^depth$|block/i },
  { id: "mlp", label: "MLP & Experts", test: /mlp|ffn|intermediate|expert|moe/i },
  { id: "norm", label: "Normalization", test: /norm|eps|epsilon/i },
  { id: "tokens", label: "Tokens & IDs", test: /bos|eos|pad|sep|cls|unk|_token_id|special/i },
  { id: "embeddings", label: "Embeddings & Vocab", test: /embed|vocab|tie/i },
  { id: "precision", label: "Dtype & Quantization", test: /dtype|quant|bits|precision/i },
];
const OTHER = { id: "other", label: "Other" } as const;

function topLevelKey(path: string): string {
  return path.split(/[.[]/, 1)[0] ?? path;
}

export function groupKeyFor(path: string): string {
  const key = topLevelKey(path);
  for (const group of GROUPS) {
    if (group.test.test(key)) return group.id;
  }
  return OTHER.id;
}

export type ConfigGroup = Readonly<{
  id: string;
  label: string;
  leaves: ReadonlyArray<ConfigLeaf>;
}>;

export function groupConfig(leaves: ReadonlyArray<ConfigLeaf>): ReadonlyArray<ConfigGroup> {
  const byId = new Map<string, ConfigLeaf[]>();
  for (const leaf of leaves) {
    const id = groupKeyFor(leaf.path);
    const bucket = byId.get(id);
    if (bucket) bucket.push(leaf);
    else byId.set(id, [leaf]);
  }
  return [...GROUPS, OTHER]
    .filter((group) => byId.has(group.id))
    .map((group) => ({ id: group.id, label: group.label, leaves: byId.get(group.id) ?? [] }));
}
