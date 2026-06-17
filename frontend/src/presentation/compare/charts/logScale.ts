/**
 * Pure positioning math for the LogScaleBar (the "Model Scale" visual). Maps a
 * value onto a base-10 log axis between `min` and `max`, returning a 0..1
 * fraction, plus a default set of power-of-ten ticks spanning the axis.
 */

/** Fraction (0..1, clamped) of `value` along a log10 axis from `min` to `max`. */
export function logPosition(value: number, min: number, max: number): number {
  if (!(value > 0) || !(min > 0) || !(max > min)) return 0;
  const lo = Math.log10(min);
  const hi = Math.log10(max);
  const frac = (Math.log10(value) - lo) / (hi - lo);
  return Math.min(1, Math.max(0, frac));
}

/** Power-of-ten ticks covering [min, max] inclusive (e.g. 1e6 … 1e12). */
export function defaultLogTicks(min: number, max: number): number[] {
  if (!(min > 0) || !(max >= min)) return [];
  const lo = Math.floor(Math.log10(min));
  const hi = Math.ceil(Math.log10(max));
  const ticks: number[] = [];
  for (let e = lo; e <= hi; e++) ticks.push(10 ** e);
  return ticks;
}
