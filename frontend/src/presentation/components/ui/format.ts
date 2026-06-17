/** Pretty-print a parameter count: 525336576 → "525M". */
export function formatParamCount(n: number): string {
  if (n === 0) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

/** [4096, 4096] → "4096 × 4096"; [4096] → "4096"; empty → null. */
export function formatShape(shape: ReadonlyArray<number> | undefined): string | null {
  if (!shape || shape.length === 0) return null;
  return shape.join(" × ");
}

/** Bytes → "8.0 GB" / "16.0 MB" / "768 B". */
export function formatBytes(n: number | undefined): string | null {
  if (n === undefined || n === null) return null;
  if (n === 0) return "0 B";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} TB`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return `${n} B`;
}

/** FLOPs → "2.10 GF" / "421 MF". */
export function formatFlops(n: number | undefined): string | null {
  if (n === undefined || n === null) return null;
  if (n === 0) return "0 F";
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} TF`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GF`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MF`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KF`;
  return `${n} F`;
}

/** Compact count for download/like-style numbers: 5595879 → "5.6M", 1500 → "1.5K", 128000 → "128K". */
export function formatCompact(n: number): string {
  if (n < 1000) return n.toLocaleString();
  if (n < 1e6) return `${(n / 1e3).toFixed(n % 1e3 === 0 ? 0 : 1)}K`.replace(".0K", "K");
  if (n < 1e9) return `${(n / 1e6).toFixed(1)}M`.replace(".0M", "M");
  return `${(n / 1e9).toFixed(1)}B`.replace(".0B", "B");
}

/** ISO-8601 → "Jan 15, 2024"; null for missing / unparseable input. */
export function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(date);
}

/** Percent of a total, trimming a trailing ".0": pct(1, 4) → "25%", pct(1, 3) → "33.3%". */
export function pct(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`.replace(".0%", "%");
}
