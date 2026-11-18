import Anthropic from "@anthropic-ai/sdk";
import readline from "node:readline/promises";
import {
  costOf,
  estimateCost,
  type AiReviewModel,
} from "@/lib/ai-review/models";
import { parseScores, type ScoreRequest } from "@/lib/ai-review/prompt";
import type { Criterion, ParsedScores } from "@/lib/ai-review/types";

export type RequestResult = {
  run: number;
  dropletId: number;
  dropletName: string;
  request: Omit<ScoreRequest, "params">;
  parsed: ParsedScores | { ok: false; reason: "api_error"; detail: string };
  usage: Anthropic.Usage | null;
  costUsd: number;
};

export type PlannedRequest = ScoreRequest & {
  run: number;
  dropletId: number;
  dropletName: string;
};

/** Dollars to 2 places, or 4 for amounts under a cent */
export const dollars = (x: number) =>
  `$${x < 0.01 ? x.toFixed(4) : x.toFixed(2)}`;

const promptChars = (r: ScoreRequest) =>
  String(r.params.system ?? "").length +
  JSON.stringify(r.params.messages).length;

/**
 * Prints what a run will send and roughly what it costs, then asks before
 * spending anything. `--yes` skips the question.
 */
export async function confirmSpend(
  requests: PlannedRequest[],
  model: AiReviewModel,
  { batch, yes }: { batch: boolean; yes: boolean },
): Promise<boolean> {
  const estimate = estimateCost(requests.map(promptChars), model, { batch });
  console.log(
    `${requests.length} requests to ${model}${batch ? " (batch, half price)" : ""}. ` +
      `Rough cost before caching: ${dollars(estimate)}.`,
  );
  if (yes) return true;
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question("Send them? Type yes to continue: ");
  rl.close();
  return answer.trim().toLowerCase() === "yes";
}

const strip = ({
  params: _params,
  run: _run,
  dropletId: _d,
  dropletName: _n,
  ...request
}: PlannedRequest) => request;

function toResult(
  planned: PlannedRequest,
  criteria: Criterion[],
  model: AiReviewModel,
  batch: boolean,
  outcome: { message: Anthropic.Message } | { error: string },
): RequestResult {
  const base = {
    run: planned.run,
    dropletId: planned.dropletId,
    dropletName: planned.dropletName,
    request: strip(planned),
  };
  if ("error" in outcome) {
    return {
      ...base,
      parsed: { ok: false, reason: "api_error", detail: outcome.error },
      usage: null,
      costUsd: 0,
    };
  }
  const { message } = outcome;
  return {
    ...base,
    parsed: parseScores(message, criteria),
    usage: message.usage,
    costUsd: costOf(message.usage, model, { batch }),
  };
}

/** Sends requests one at a time, in order, so each lesson reuses the cache the one before it wrote. */
export async function runInOrder(
  client: Anthropic,
  requests: PlannedRequest[],
  criteria: Criterion[],
  model: AiReviewModel,
): Promise<RequestResult[]> {
  const results: RequestResult[] = [];
  for (const [i, planned] of requests.entries()) {
    process.stdout.write(
      `  [${i + 1}/${requests.length}] ${planned.customId} ... `,
    );
    try {
      const message = await client.messages.create(planned.params);
      const result = toResult(planned, criteria, model, false, { message });
      console.log(
        result.parsed.ok
          ? `ok ($${result.costUsd.toFixed(3)})`
          : `failed: ${result.parsed.reason}`,
      );
      results.push(result);
    } catch (err) {
      const detail =
        err instanceof Anthropic.APIError
          ? `${err.status} ${err.message}`
          : String(err);
      console.log(`error: ${detail}`);
      results.push(
        toResult(planned, criteria, model, false, { error: detail }),
      );
    }
  }
  return results;
}

/** Sends every request as one Message Batch at half price, waits for it, and reads the results. */
export async function runAsBatch(
  client: Anthropic,
  requests: PlannedRequest[],
  criteria: Criterion[],
  model: AiReviewModel,
  { pollMs = 30_000 }: { pollMs?: number } = {},
): Promise<RequestResult[]> {
  const batch = await client.messages.batches.create({
    requests: requests.map((r) => ({
      custom_id: r.customId,
      params: r.params,
    })),
  });
  console.log(
    `Batch ${batch.id} created. Waiting for it to finish (usually under an hour)...`,
  );

  let status = batch;
  while (status.processing_status !== "ended") {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    status = await client.messages.batches.retrieve(batch.id);
    const c = status.request_counts;
    console.log(
      `  ${status.processing_status}: ${c.succeeded} done, ${c.processing} running, ${c.errored} errored`,
    );
  }

  // Results come back in any order: match them by custom_id.
  const byId = new Map(requests.map((r) => [r.customId, r]));
  const results: RequestResult[] = [];
  for await (const entry of await client.messages.batches.results(batch.id)) {
    const planned = byId.get(entry.custom_id);
    if (!planned) continue;
    byId.delete(entry.custom_id);
    if (entry.result.type === "succeeded") {
      results.push(
        toResult(planned, criteria, model, true, {
          message: entry.result.message,
        }),
      );
    } else {
      const detail =
        entry.result.type === "errored"
          ? JSON.stringify(entry.result.error)
          : entry.result.type;
      results.push(toResult(planned, criteria, model, true, { error: detail }));
    }
  }
  for (const missing of byId.values()) {
    results.push(
      toResult(missing, criteria, model, true, { error: "no result returned" }),
    );
  }
  return results;
}
