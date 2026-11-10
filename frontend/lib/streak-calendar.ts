// Month grids for the streak calendar (ODY-919), on the learner's own dates
// (YYYY-MM-DD in their Settings time zone), never the browser's clock.

/** "2026-11" for 2026-11-10 */
export const monthOf = (date: string) => date.slice(0, 7);

/** The month `by` months after `month` (before, when negative) */
export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + by, 1)).toISOString().slice(0, 7);
}

/** "November 2026" */
export function monthLabel(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The month's dates in Sunday-first weeks, padded with nulls */
export function weeksOf(month: string): (string | null)[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array(first).fill(null);
  for (let d = 1; d <= count; d++) {
    cells.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) =>
    cells.slice(i * 7, i * 7 + 7),
  );
}
