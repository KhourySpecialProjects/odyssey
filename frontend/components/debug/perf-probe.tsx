import { after } from "next/server";
import { isProbeEnabled, logSummary, setProbeLabel } from "@/lib/perf/probe";

/**
 * Emits the per-request Strapi summary once the response has finished
 * streaming.
 *
 * `after()` is the only hook that reliably runs *after* every Server Component
 * in the tree has resolved — server components render concurrently, so simply
 * placing a logger last in the JSX would fire before the sibling data fetches
 * complete.
 *
 * Renders nothing, and does nothing at all unless PERF_PROBE=1.
 */
export function PerfProbe({ label }: { label?: string }) {
  if (!isProbeEnabled()) return null;

  if (label) setProbeLabel(label);
  after(() => logSummary());

  return null;
}
