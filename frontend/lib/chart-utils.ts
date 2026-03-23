/**
 * Shared utilities for admin chart components.
 */

/** Timeframe option for chart filtering */
export interface TimeframeOption {
  label: string;
  value: number;
}

/** Standard timeframe options used across admin charts */
export const CHART_TIMEFRAMES: TimeframeOption[] = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "All", value: 0 },
];

/** Compact timeframe options for smaller chart cards */
export const CHART_TIMEFRAMES_COMPACT: TimeframeOption[] = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
  { label: "All", value: 0 },
];

/**
 * Filter time-series data by number of days from today.
 * Returns all data if days is 0 or if filtering would leave nothing.
 */
export function filterByDays<T extends { date: string }>(
  data: T[],
  days: number,
): T[] {
  if (days === 0 || data.length === 0) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const filtered = data.filter((d) => new Date(d.date) >= cutoff);
  return filtered.length > 0 ? filtered : data;
}
