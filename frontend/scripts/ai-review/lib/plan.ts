import Anthropic from "@anthropic-ai/sdk";
import {
  parseEffort,
  parseModel,
  type AiReviewModel,
  type Effort,
} from "@/lib/ai-review/models";
import { buildDropletRequests, PROMPT_VERSION } from "@/lib/ai-review/prompt";
import type { Criterion } from "@/lib/ai-review/types";
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

export function planRequests(
  fixtures: Fixture[],
  criteria: Criterion[],
  {
    model,
    effort,
    runs = 1,
  }: { model: AiReviewModel; effort: Effort; runs?: number },
): PlannedRequest[] {
  const planned: PlannedRequest[] = [];
  for (let run = 1; run <= runs; run++) {
    for (const f of fixtures) {
      for (const r of buildDropletRequests(f.snapshot, criteria, {
        model,
        effort,
        idPrefix: `r${run}-`,
      })) {
        planned.push({
          ...r,
          run,
          dropletId: f.snapshot.droplet.id,
          dropletName: f.snapshot.droplet.name,
        });
      }
    }
  }
  return planned;
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
