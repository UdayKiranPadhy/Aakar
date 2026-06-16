/**
 * Bytes-per-element for a torch dtype name.
 *
 * This is an intrinsic property of the dtype (a `bfloat16` element is 2 bytes by
 * definition), not model-specific data — so it's safe to keep as a constant. Used
 * to turn parameter counts into memory footprints, and to derive the precision
 * picker's options. Single source of truth shared by ModelInfoStrip and Compare.
 */

export const DTYPE_BYTES: Readonly<Record<string, number>> = {
  float32: 4,
  float16: 2,
  bfloat16: 2,
  float64: 8,
  int8: 1,
  uint8: 1,
};

/**
 * Bytes per element for `dtype`, or `fallback` when the dtype is unknown — e.g.
 * a quantized dtype whose footprint can't be derived from the name alone.
 */
export function bytesForDtype(
  dtype: string | undefined,
  fallback?: number,
): number | undefined {
  if (!dtype) return fallback;
  return DTYPE_BYTES[dtype] ?? fallback;
}
