import Anthropic from "@anthropic-ai/sdk";
import {
  parseEffort,
  parseModel,
  type AiReviewModel,
  type Effort,
} from "@/lib/ai-review/models";
import {
  buildLessonRequests,
  buildOverallRequest,
  PROMPT_VERSION,
} from "@/lib/ai-review/prompt";
import type { Criterion, LessonScores } from "@/lib/ai-review/types";
import type { Fixture, Rubric } from "./files";
import { totals, type RunTotals } from "./metrics";
import type { PlannedRequest, RequestResult } from "./run";

/** Options shared by spike.ts and eval.ts */
export const COMMON_OPTIONS = {
  model: { type: "string" },
  effort: { type: "string" },
  yes: { type: "boolean", default: false },
} as const;

export function settings(values: { model?: string; effort?: string }): {
  model: AiReviewModel;
  effort: Effort;
} {
  return {
    model: parseModel(values.model),
    effort: parseEffort(values.effort),
  };
}

type PlanOptions = { model: AiReviewModel; effort: Effort; runs?: number };

const tag = (f: Fixture, run: number) => ({
  run,
  dropletId: f.snapshot.droplet.id,
  dropletName: f.snapshot.droplet.name,
});

/** Every lesson request, for each run. */
export function planLessonRequests(
  fixtures: Fixture[],
  criteria: Criterion[],
  { model, effort, runs = 1 }: PlanOptions,
): PlannedRequest[] {
  const planned: PlannedRequest[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const f of fixtures) {
      for (const r of buildLessonRequests(f.snapshot, criteria, {
        model,
        effort,
        idPrefix: `r${run}-`,
      })) {
        planned.push({ ...r, ...tag(f, run) });
      }
    }
  }
  return planned;
}

/** Each fixture's Overall request, built from `lessonScores(fixture, run)`. */
function planOverall(
  fixtures: Fixture[],
  criteria: Criterion[],
  { model, effort, runs = 1 }: PlanOptions,
  lessonScores: (f: Fixture, run: number) => LessonScores[],
): PlannedRequest[] {
  const planned: PlannedRequest[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const f of fixtures) {
      planned.push({
        ...buildOverallRequest(f.snapshot, criteria, lessonScores(f, run), {
          model,
          effort,
          idPrefix: `r${run}-`,
        }),
        ...tag(f, run),
      });
    }
  }
  return planned;
}

/**
 * Everything a run will send, for the cost estimate. Placeholder lesson
 * scores stand in for the answers the Overall requests will carry.
 */
export function planForEstimate(
  fixtures: Fixture[],
  criteria: Criterion[],
  options: PlanOptions,
): PlannedRequest[] {
  const placeholder = criteria.map((c) => ({
    criterionId: c.id,
    score: 3,
    rationale: "x".repeat(250),
  }));
  return [
    ...planLessonRequests(fixtures, criteria, options),
    ...planOverall(fixtures, criteria, options, (f) =>
      f.snapshot.lessons.map((l) => ({ lessonId: l.id, scores: placeholder })),
    ),
  ];
}

/**
 * Scores the fixtures as Score with AI (ODY-814) does: every lesson, then the
 * Overall Score with those lessons' answers. `send` runs one set of requests.
 */
export async function scoreFixtures(
  fixtures: Fixture[],
  criteria: Criterion[],
  options: PlanOptions,
  send: (requests: PlannedRequest[]) => Promise<RequestResult[]>,
): Promise<RequestResult[]> {
  const lessons = await send(planLessonRequests(fixtures, criteria, options));
  const overall = await send(
    planOverall(fixtures, criteria, options, (f, run) =>
      lessons
        .filter(
          (r) =>
            r.run === run &&
            r.dropletId === f.snapshot.droplet.id &&
            r.request.kind === "lesson",
        )
        .map((r) => ({
          lessonId: r.request.lessonId!,
          scores: r.parsed.ok ? r.parsed.scores : null,
        })),
    ),
  );
  return [...lessons, ...overall];
}

/** Fails early, before anything is sent, if there is no API key to send with. */
export function makeClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set (add it to .env.local, or export it)",
    );
  }
  return new Anthropic();
}

export type RunMeta = {
  promptVersion: string;
  model: AiReviewModel;
  effort: Effort;
  rubricVersion: string;
  batch: boolean;
  runs: number;
  fixtures: string[];
  startedAt: string;
  finishedAt: string;
  totals: RunTotals;
};

export function runMeta(
  base: {
    model: AiReviewModel;
    effort: Effort;
    batch: boolean;
    runs: number;
    startedAt: string;
  },
  rubric: Rubric,
  fixtures: Fixture[],
  results: RequestResult[],
): RunMeta {
  return {
    promptVersion: PROMPT_VERSION,
    rubricVersion: rubric.version,
    fixtures: fixtures.map((f) => f.slug),
    finishedAt: new Date().toISOString(),
    totals: totals(results),
    ...base,
  };
}

export function metaMarkdown(meta: RunMeta): string {
  const t = meta.totals;
  return [
    `- Prompt version: \`${meta.promptVersion}\`; rubric version: \`${meta.rubricVersion}\``,
    `- Model: \`${meta.model}\` at effort \`${meta.effort}\`${meta.batch ? ", batch" : ""}; runs: ${meta.runs}`,
    `- Droplets: ${meta.fixtures.join(", ")}`,
    `- Requests: ${t.requests}, failed: ${t.failed.length}`,
    `- Tokens: ${t.inputTokens} input, ${t.cacheWriteTokens} cache write, ${t.cacheReadTokens} cache read, ${t.outputTokens} output`,
    `- Cost: **$${t.costUsd.toFixed(2)}**`,
    ...t.failed.map(
      (f) =>
        `  - failed \`${f.customId}\`: ${f.reason}${f.detail ? ` (${f.detail})` : ""}`,
    ),
  ].join("\n");
}
