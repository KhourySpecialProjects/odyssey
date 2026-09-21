/**
 * Server-side performance probe for Strapi data fetching.
 *
 * Entirely opt-in: every function here is a no-op unless `PERF_PROBE=1` is set.
 * Nothing in this module should ever change request behaviour when disabled.
 *
 * The probe answers three questions that static reading of the code cannot:
 *   1. How long does each Strapi call take, and how many bytes come back?
 *   2. How many Strapi calls does one page render make, and do they run in
 *      parallel or in a serial waterfall?
 *   3. Is the Next.js data cache actually serving these calls?
 *
 * Usage: see docs/agent/performance-probe.md
 */

import * as React from "react";

export function isProbeEnabled(): boolean {
  return process.env.PERF_PROBE === "1";
}

export type ProbeCall = {
  /** Strapi path, e.g. "/droplets" */
  path: string;
  /** Full query string length — a proxy for how deep the populate is */
  queryLength: number;
  /** ms spent awaiting fetch() + reading the body */
  ms: number;
  /**
   * ms spent awaiting fetch() alone, excluding body read.
   *
   * Tracked separately because reading a large body takes several ms even on a
   * data-cache hit, which made a combined figure misclassify exactly the big
   * responses worth investigating.
   */
  fetchMs: number;
  /** Uncompressed response body size in bytes */
  bytes: number;
  status: number;
  /** ms from probe start to when this call began */
  startOffset: number;
  /** ms from probe start to when this call finished */
  endOffset: number;
  /** Caching strategy the callsite asked for */
  cacheMode: string;
  /** Cache tags the callsite attached, if any */
  tags: string[];
  /**
   * Heuristic based on `fetchMs`. The Next.js data cache does not expose
   * hit/miss on the response, but a served-from-cache read never touches the
   * network, so it resolves in single-digit milliseconds. Treat this as a
   * hint only, and corroborate with `logging.fetches` output in dev.
   */
  likelyCacheHit: boolean;
};

type ProbeStore = {
  t0: number;
  calls: ProbeCall[];
  /** Set by setProbeLabel() so the summary can name the route */
  label?: string;
};

/**
 * One store per server request.
 *
 * React's `cache()` scopes the value to a single request/render pass, which is
 * exactly the granularity we want: "what did *this* page navigation cost?".
 *
 * It is resolved lazily rather than at module scope because `lib/utils.ts`
 * imports this file for `recordCall`, and `utils.ts` is itself imported by
 * Client Components (for `cn`). `cache` only exists on React's server build,
 * so touching it at import time would crash jsdom tests and the browser
 * bundle. Every public function here early-returns when the probe is
 * disabled, so this is only ever reached inside a real Next.js server render.
 */
let storeGetter: (() => ProbeStore) | null = null;

function getStore(): ProbeStore {
  if (!storeGetter) {
    const makeStore = (): ProbeStore => ({
      t0: performance.now(),
      calls: [],
    });
    // Fall back to a plain singleton if `cache` is unavailable. The probe is a
    // local diagnostic tool, so a shared store degrades the output rather than
    // breaking anything.
    storeGetter = React.cache ? React.cache(makeStore) : makeStore;
  }
  return storeGetter();
}

/** Threshold below which a call almost certainly never left the process. */
const CACHE_HIT_MS = 5;

/**
 * Establishes the request's time origin.
 *
 * Must be called *before* the first fetch starts. Without it the store is
 * created lazily inside `recordCall`, i.e. after the first response has already
 * landed, which makes that call's offsets negative and corrupts `serialDepth`.
 */
export function markProbeStart(): void {
  if (!isProbeEnabled()) return;
  getStore();
}

export function recordCall(
  call: Omit<
    ProbeCall,
    "likelyCacheHit" | "startOffset" | "endOffset" | "fetchMs"
  > & {
    startedAt: number;
    fetchedAt: number;
    endedAt: number;
  },
): void {
  if (!isProbeEnabled()) return;

  const store = getStore();
  const { startedAt, fetchedAt, endedAt, ...rest } = call;
  const fetchMs = round(fetchedAt - startedAt);

  store.calls.push({
    ...rest,
    fetchMs,
    startOffset: round(startedAt - store.t0),
    endOffset: round(endedAt - store.t0),
    likelyCacheHit: fetchMs < CACHE_HIT_MS,
  });
}

export function setProbeLabel(label: string): void {
  if (!isProbeEnabled()) return;
  getStore().label = label;
}

/**
 * Counts calls that could not have overlapped with any earlier call — i.e. the
 * length of the serial chain. A page that issues 6 calls with a serial depth of
 * 6 is a pure waterfall; a serial depth of 1 means everything ran in parallel.
 */
function serialDepth(calls: ProbeCall[]): number {
  const sorted = [...calls].sort((a, b) => a.startOffset - b.startOffset);
  let depth = 0;
  // -Infinity rather than -1 so a call with a negative offset (possible if
  // markProbeStart() was somehow missed) still counts toward the chain.
  let chainEnd = -Infinity;

  for (const call of sorted) {
    if (call.startOffset >= chainEnd) {
      depth += 1;
      chainEnd = call.endOffset;
    }
  }

  return depth;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

export type ProbeSummary = {
  label: string;
  callCount: number;
  /** Sum of every call's duration — the cost if they ran back to back */
  totalMs: number;
  /** Time from first call starting to last call finishing */
  wallMs: number;
  serialDepth: number;
  totalBytes: number;
  likelyCacheHits: number;
  calls: ProbeCall[];
};

export function summarize(): ProbeSummary | null {
  if (!isProbeEnabled()) return null;

  const store = getStore();
  const { calls } = store;
  if (calls.length === 0) return null;

  const wallStart = Math.min(...calls.map((c) => c.startOffset));
  const wallEnd = Math.max(...calls.map((c) => c.endOffset));

  return {
    label: store.label ?? "(unlabelled)",
    callCount: calls.length,
    totalMs: round(calls.reduce((sum, c) => sum + c.ms, 0)),
    wallMs: round(wallEnd - wallStart),
    serialDepth: serialDepth(calls),
    totalBytes: calls.reduce((sum, c) => sum + c.bytes, 0),
    likelyCacheHits: calls.filter((c) => c.likelyCacheHit).length,
    calls: [...calls].sort((a, b) => a.startOffset - b.startOffset),
  };
}

/**
 * Prints the per-request summary. Called from `<PerfProbe />` via `after()`,
 * so it runs once the whole response has finished streaming.
 */
export function logSummary(): void {
  const summary = summarize();
  if (!summary) return;

  const lines: string[] = [
    "",
    `┌─ PERF PROBE  ${summary.label}`,
    `│  ${summary.callCount} Strapi calls · serial depth ${summary.serialDepth} · ` +
      `${summary.likelyCacheHits}/${summary.callCount} likely cache hits`,
    `│  wall ${summary.wallMs}ms · summed ${summary.totalMs}ms · ` +
      `payload ${formatBytes(summary.totalBytes)}`,
    "│  fetch/total ms      bytes    offset          path",
  ];

  for (const call of summary.calls) {
    const flags = [
      call.likelyCacheHit ? "CACHED?" : "NETWORK",
      call.cacheMode,
      call.tags.length ? `tags=${call.tags.join(",")}` : "no-tags",
    ].join(" ");

    // fetch/total: time awaiting fetch() vs. that plus reading the body. A
    // small fetch time with a large total means the payload itself is the cost.
    lines.push(
      `│  ${pad(`${call.fetchMs}/${call.ms}ms`, 13)}${pad(formatBytes(call.bytes), 10)}` +
        `${pad(`@${call.startOffset}→${call.endOffset}`, 16)}` +
        `${pad(call.path, 26)}q=${call.queryLength}  ${flags}`,
    );
  }

  lines.push("└─");
  console.log(lines.join("\n"));
}

function pad(s: string, width: number): string {
  return s.length >= width ? `${s} ` : s.padEnd(width);
}
