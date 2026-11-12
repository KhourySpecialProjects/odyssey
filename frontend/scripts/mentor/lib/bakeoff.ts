import { dollars } from "@/scripts/ai-review/lib/run";
import { table } from "./cases";
import type { JudgeAnswers, JudgeSetup, Question } from "./grade";
import { keyOf, pct, type PilotLabel, type ResultRow } from "./metrics";

// The judge bake-off (ODY-941): replies Brady already labelled, judged again
// by other models and efforts, to see which judge agrees with him best before
// new questions are written for it.

export const CANDIDATES = {
  "sonnet-medium": { model: "claude-sonnet-5-5", effort: "medium" },
  "sonnet-high": { model: "claude-sonnet-5-5", effort: "high" },
  "opus-medium": { model: "claude-opus-5-5", effort: "medium" },
} as const satisfies Record<string, JudgeSetup>;
export type CandidateName = keyof typeof CANDIDATES;

/** One judge's answers on one labelled reply, or why there are none */
export type BakeoffRow = {
  candidate: string;
  setup: string;
  caseId: string;
  rep: number;
  answers?: JudgeAnswers;
  badQuotes?: Question[];
  costUsd?: number;
  error?: string;
};

/** The result rows Brady labelled at least once, with a reply to judge */
export function labelled(rows: ResultRow[], labels: PilotLabel[]): ResultRow[] {
  const marked = new Set(
    labels
      .filter((l) => Object.values(l.labels).some((label) => label))
      .map(keyOf),
  );
  return rows.filter((r) => marked.has(keyOf(r)) && r.reply.trim());
}

/**
 * Each judge's agreement with Brady, overall, by question and by the model
 * that wrote the reply, then every disagreement. A pair counts only where both
 * Brady and the judge answered.
 */
export function bakeoffMarkdown(
  results: BakeoffRow[],
  labels: PilotLabel[],
): string {
  const byKey = new Map(labels.map((l) => [keyOf(l), l]));
  const pairs = results.flatMap((row) => {
    const label = byKey.get(keyOf(row));
    if (!label || !row.answers) return [];
    return Object.entries(label.labels).flatMap(([question, brady]) => {
      const judge = row.answers?.[question as Question];
      return brady && judge
        ? [{ row, question, writer: label.writer ?? "canned", brady, judge }]
        : [];
    });
  });
  const unique = (values: string[]) => [...new Set(values)].sort();
  const questions = unique(pairs.map((p) => p.question));
  const writers = unique(pairs.map((p) => p.writer));
  const cell = (some: typeof pairs) => {
    const agree = some.filter((p) => p.brady === p.judge.answer).length;
    return some.length
      ? `${pct(agree / some.length)} (${agree}/${some.length})`
      : "–";
  };

  const rows = [...new Set(results.map((r) => r.candidate))].map((name) => {
    const own = results.filter((r) => r.candidate === name);
    const mine = pairs.filter((p) => p.row.candidate === name);
    return [
      name,
      cell(mine),
      ...questions.map((q) => cell(mine.filter((p) => p.question === q))),
      ...writers.map((w) => cell(mine.filter((p) => p.writer === w))),
      own.reduce((n, r) => n + (r.badQuotes?.length ?? 0), 0),
      own.filter((r) => r.error).length,
      dollars(own.reduce((sum, r) => sum + (r.costUsd ?? 0), 0)),
    ];
  });
  const head = [
    "Judge",
    "All",
    ...questions,
    ...writers.map((w) => w.replace(/^claude-/, "")),
    "Bad quotes",
    "Errors",
    "Cost",
  ];
  const disagreements = pairs
    .filter((p) => p.brady !== p.judge.answer)
    .map(
      ({ row, question, brady, judge }) =>
        `- ${row.candidate}, ${row.setup} ${row.caseId} rep ${row.rep}, ${question}: Brady ${brady}, judge ${judge.answer}, "${judge.quote}"`,
    );
  return [
    "## Judges against Brady",
    table(head, rows),
    "## Disagreements",
    disagreements.join("\n") || "_None._",
  ].join("\n\n");
}
