import type { Criterion } from "@/lib/ai-review/types";
import type { ClientScores } from "./files";
import type { RequestResult } from "./run";

/** One AI score next to the client's score for the same lesson (or Overall) and criterion. */
export type Pair = {
  run: number;
  dropletId: number;
  dropletName: string;
  level: "lesson" | "overall";
  lessonName: string;
  criterion: string;
  ai: number;
  client: number;
  rationale: string;
};

export type Agreement = {
  criterion: string;
  n: number;
  /** Fractions from 0 to 1 */
  exact: number;
  withinOne: number;
  /** AI minus client, averaged: above 0 means the AI scores high */
  meanDiff: number;
};

/** Lines every successful AI score up with the client's; failures and blanks are left out (and counted elsewhere). */
export function pairScores(
  results: RequestResult[],
  clientByDroplet: Map<number, ClientScores>,
  criteria: Criterion[],
): Pair[] {
  const nameOf = new Map(criteria.map((c) => [c.id, c.name]));
  const pairs: Pair[] = [];
  for (const r of results) {
    const client = clientByDroplet.get(r.dropletId);
    if (!client || !r.parsed.ok) continue;
    const theirs =
      r.request.kind === "overall"
        ? client.overall
        : client.lessons.find((l) => l.lessonId === r.request.lessonId)?.scores;
    if (!theirs) continue;
    for (const item of r.parsed.scores) {
      const criterion = nameOf.get(item.criterionId)!;
      const clientScore = theirs[criterion];
      if (typeof clientScore !== "number") continue;
      pairs.push({
        run: r.run,
        dropletId: r.dropletId,
        dropletName: r.dropletName,
        level: r.request.kind,
        lessonName: r.request.lessonName ?? "Overall",
        criterion,
        ai: item.score,
        client: clientScore,
        rationale: item.rationale,
      });
    }
  }
  return pairs;
}

/** Agreement per criterion, in rubric order, plus an "All" row. */
export function agreementTable(
  pairs: { criterion: string; ai: number; client: number }[],
  criteria: Criterion[],
): Agreement[] {
  const rows = criteria.map((c) =>
    summarise(
      c.name,
      pairs.filter((p) => p.criterion === c.name),
    ),
  );
  rows.push(summarise("All", pairs));
  return rows;
}

function summarise(
  criterion: string,
  pairs: { ai: number; client: number }[],
): Agreement {
  const n = pairs.length;
  if (!n) return { criterion, n, exact: NaN, withinOne: NaN, meanDiff: NaN };
  const diffs = pairs.map((p) => p.ai - p.client);
  return {
    criterion,
    n,
    exact: diffs.filter((d) => d === 0).length / n,
    withinOne: diffs.filter((d) => Math.abs(d) <= 1).length / n,
    meanDiff: diffs.reduce((a, b) => a + b, 0) / n,
  };
}

/** The largest disagreements first. */
export function biggestGaps(pairs: Pair[], limit = 10): Pair[] {
  return [...pairs]
    .sort((a, b) => Math.abs(b.ai - b.client) - Math.abs(a.ai - a.client))
    .filter((p) => p.ai !== p.client)
    .slice(0, limit);
}

/**
 * How often two runs of the same prompt agree with each other: the noise
 * floor. A prompt change that moves agreement with the client by less than
 * this hasn't been shown to help.
 */
export function runToRunPairs(
  results: RequestResult[],
  criteria: Criterion[],
  runA = 1,
  runB = 2,
): { criterion: string; ai: number; client: number }[] {
  const key = (r: RequestResult, id: number) =>
    `${r.request.customId.replace(/^r\d+-/, "")}:${id}`;
  const a = new Map<string, number>();
  for (const r of results) {
    if (r.run !== runA || !r.parsed.ok) continue;
    for (const s of r.parsed.scores) a.set(key(r, s.criterionId), s.score);
  }
  const nameOf = new Map(criteria.map((c) => [c.id, c.name]));
  const pairs: { criterion: string; ai: number; client: number }[] = [];
  for (const r of results) {
    if (r.run !== runB || !r.parsed.ok) continue;
    for (const s of r.parsed.scores) {
      const other = a.get(key(r, s.criterionId));
      // "client" here is simply the other run, so agreementTable can be reused.
      if (other !== undefined)
        pairs.push({
          criterion: nameOf.get(s.criterionId)!,
          ai: s.score,
          client: other,
        });
    }
  }
  return pairs;
}

export type RunTotals = {
  requests: number;
  failed: { customId: string; reason: string; detail?: string }[];
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  costUsd: number;
};

export function totals(results: RequestResult[]): RunTotals {
  const t: RunTotals = {
    requests: results.length,
    failed: [],
    inputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  };
  for (const r of results) {
    if (!r.parsed.ok)
      t.failed.push({
        customId: r.request.customId,
        reason: r.parsed.reason,
        detail: r.parsed.detail,
      });
    t.costUsd += r.costUsd;
    if (!r.usage) continue;
    t.inputTokens += r.usage.input_tokens;
    t.cacheWriteTokens += r.usage.cache_creation_input_tokens ?? 0;
    t.cacheReadTokens += r.usage.cache_read_input_tokens ?? 0;
    t.outputTokens += r.usage.output_tokens;
  }
  return t;
}

const pct = (x: number) => (Number.isNaN(x) ? "–" : `${Math.round(x * 100)}%`);
const signed = (x: number) =>
  Number.isNaN(x) ? "–" : `${x >= 0 ? "+" : ""}${x.toFixed(2)}`;

export function agreementMarkdown(
  rows: Agreement[],
  headers = ["Exact", "Within 1", "AI − client"],
): string {
  return [
    `| Criterion | n | ${headers.join(" | ")} |`,
    `|---|---:|${headers.map(() => "---:").join("|")}|`,
    ...rows.map(
      (r) =>
        `| ${r.criterion} | ${r.n} | ${pct(r.exact)} | ${pct(r.withinOne)} | ${signed(r.meanDiff)} |`,
    ),
  ].join("\n");
}
