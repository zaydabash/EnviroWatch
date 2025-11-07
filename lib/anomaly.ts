import type { SeriesPoint } from "@/types";

export function computeAnomaly(series: SeriesPoint[]): number {
  if (series.length === 0) return 0;

  const values = series.map((p) => p.value).filter((v) => !isNaN(v) && isFinite(v));
  if (values.length === 0) return 0;

  // Compute median
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 
    ? (sorted[mid - 1] + sorted[mid]) / 2 
    : sorted[mid];

  // Compute MAD (median absolute deviation)
  const deviations = values.map((v) => Math.abs(v - median));
  const sortedDeviations = [...deviations].sort((a, b) => a - b);
  const madMid = Math.floor(sortedDeviations.length / 2);
  const mad = sortedDeviations.length % 2 === 0
    ? (sortedDeviations[madMid - 1] + sortedDeviations[madMid]) / 2
    : sortedDeviations[madMid];

  // Get last value
  const xLast = values[values.length - 1];

  // Compute z-score
  const eps = 1e-6;
  const z = Math.abs(xLast - median) / (1.4826 * mad + eps);

  // Cap z at 5, then scale to 0–100
  const clamped = Math.min(z, 5);
  const score = Math.round((clamped / 5) * 100);

  return score;
}

