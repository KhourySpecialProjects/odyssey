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
  { label: "7d", value: 7 },
  { label: "30d", value: 30 },
  { label: "90d", value: 90 },
];

/** Compact timeframe options for smaller chart cards */
export const CHART_TIMEFRAMES_COMPACT: TimeframeOption[] = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
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

/**
 * Format a date string (e.g. "2024-03-15 00:00:00" from PostHog) for display.
 * Parses only the YYYY-MM-DD portion as a local date to avoid UTC-to-local
 * timezone shifts that cause off-by-one day errors.
 */
export function formatChartDate(dateStr: string): string {
  const [year, month, day] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Filter time-series data to a custom start/end date range (inclusive).
 *  Compares YYYY-MM-DD strings directly to avoid UTC/local timezone shifts.
 */
export function filterByDateRange<T extends { date: string }>(
  data: T[],
  start: string,
  end: string,
): T[] {
  if (!start || !end || data.length === 0) return data;
  return data.filter((d) => {
    const day = d.date.slice(0, 10); // normalise to YYYY-MM-DD
    return day >= start && day <= end;
  });
}
