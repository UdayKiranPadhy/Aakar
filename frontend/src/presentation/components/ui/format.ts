/** Pretty-print a parameter count: 525336576 → "525M". */
export function formatParamCount(n: number): string {
  if (n === 0) return "0";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString();
}

/** Compact count for downloads/likes: 10154763 → "10.2M", 1234 → "1.2K". */
export function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
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
