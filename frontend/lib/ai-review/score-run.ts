import Anthropic from "@anthropic-ai/sdk";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { fetchDropletSnapshot } from "./droplet-snapshot";
import type { AiReviewModel, Effort } from "./models";
import {
  buildLessonRequests,
  buildOverallRequest,
  parseScores,
  type ScoreRequest,
} from "./prompt";
import {
  finishRunRoute,
  heartbeatRunRoute,
  type FinishRunInput,
  type RunScoreInput,
} from "./run-routes";
import type { Criterion, LessonScores, ParsedScores } from "./types";

/** One Score with AI run, as the start route created it. */
export type ScoringRun = {
  runId: number;
  /** The reviewer who started it; the routes check it against the review */
  userId: number;
  dropletId: number;
  criteria: Criterion[];
  model: AiReviewModel;
  effort: Effort;
};

export type RunDeps = {
  client: Anthropic;
  /** Waits between retries; replaced in tests */
  sleep?: (ms: number) => Promise<void>;
};

type Outcome = {
  parsed: ParsedScores | { ok: false; reason: "api_error"; detail: string };
  usage: Anthropic.Usage | null;
};

/** Waits before each retry of a request whose stream broke. */
const RETRY_DELAYS_MS = [2_000, 10_000];
/** Error events that break a stream after it started, with no HTTP status */
const RETRY_TYPES = new Set([
  "overloaded_error",
  "api_error",
  "rate_limit_error",
]);
/**
 * A request with no answer by then fails, so a stalled stream can't hang the
 * run. Under STALE_RUN_MS, since progress is only reported between lessons.
 */
const REQUEST_TIMEOUT_MS = 8 * 60 * 1000;
/** Waits before each retry of a `finish` that didn't reach Strapi. */
const FINISH_RETRY_DELAYS_MS = [5_000, 30_000];
const MAX_ERROR = 2000;
const MAX_RATIONALE = 4000;
const CEILING_MESSAGE = "Stopped at the per-run cost ceiling";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/**
 * Only what the SDK doesn't retry itself. It already retries 429, 5xx and
 * failed connections twice (honouring retry-after) before the stream starts;
 * an overload or rate limit can still arrive as an error event mid-stream.
 */
const brokeMidStream = (err: unknown) =>
  err instanceof Anthropic.APIError &&
  err.status === undefined &&
  RETRY_TYPES.has(err.type ?? "");

/**
 * Sends one request, streamed so a long answer can't time out, and reads its
 * scores. Retries a stream that broke on an overload or rate limit; any other
 * error, a timeout, a refusal or a cut-off answer is that request's failure.
 */
async function scoreOne(
  client: Anthropic,
  request: ScoreRequest,
  criteria: Criterion[],
  sleep: (ms: number) => Promise<void>,
): Promise<Outcome> {
  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const message = await client.messages
        .stream(request.params, { signal: controller.signal })
        .finalMessage();
      return { parsed: parseScores(message, criteria), usage: message.usage };
    } catch (err) {
      if (attempt < RETRY_DELAYS_MS.length && brokeMidStream(err)) {
        await sleep(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      const detail =
        err instanceof Anthropic.APIError
          ? `${err.status ?? err.type ?? "error"}: ${err.message}`
          : String(err);
      return {
        parsed: { ok: false, reason: "api_error", detail: clip(detail, 300) },
        usage: null,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

const describe = (parsed: Outcome["parsed"]) =>
  parsed.ok
    ? ""
    : `${parsed.reason}${parsed.detail ? ` (${clip(parsed.detail, 200)})` : ""}`;

const toInputs = (
  lessonId: number | null,
  parsed: Outcome["parsed"],
): RunScoreInput[] =>
  parsed.ok
    ? parsed.scores.map((s) => ({
        lessonId,
        criterionId: s.criterionId,
        aiValue: s.score,
        aiRationale: clip(s.rationale, MAX_RATIONALE),
      }))
    : [];

/**
 * Scores every lesson in order, then the Overall Score with the lessons'
 * answers, and saves all of it in one request. Runs after the action has
 * answered (`after()`), so it never throws: a failure ends the run as failed.
 * It stops early if the run ends elsewhere (marked dead, or the review sent).
 * Past the per-run cost ceiling it skips the rest and saves what it has.
 */
export async function runAiScoring(
  run: ScoringRun,
  { client, sleep = wait }: RunDeps,
): Promise<void> {
  const ref = { runId: run.runId, userId: run.userId };
  const tokens = { input: 0, output: 0 };

  const count = (usage: Anthropic.Usage | null) => {
    if (!usage) return;
    tokens.input +=
      usage.input_tokens +
      (usage.cache_creation_input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0);
    tokens.output += usage.output_tokens;
  };

  const finish = async (
    input: Pick<
      FinishRunInput,
      "runState" | "failedLessons" | "scores" | "error"
    >,
  ) => {
    const body = {
      ...ref,
      ...input,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
    };
    // The suggestions exist only here, so a network failure or a Strapi
    // restart gets retries. One that had in fact saved answers 409 and stops.
    const send = async (b: FinishRunInput) => {
      let result = await finishRunRoute(b);
      for (const delay of FINISH_RETRY_DELAYS_MS) {
        if (result.ok || (result.status !== 0 && result.status < 500)) break;
        await sleep(delay);
        result = await finishRunRoute(b);
      }
      return result;
    };
    const saved = await send(body);
    // Strapi refused the suggestions: still end the run, so the reviewer can
    // start another.
    if (!saved.ok && saved.status === 400 && input.scores.length) {
      await send({
        ...body,
        runState: "failed",
        scores: [],
        error: clip(
          `Saving failed: ${saved.message ?? "invalid scores"}`,
          MAX_ERROR,
        ),
      });
    }
    revalidateTag(CACHE_TAGS.review(run.dropletId));
  };

  /**
   * Reports progress and the tokens spent so far. "ended" once the run has
   * ended elsewhere (a network blip keeps it going), "over" once it has spent
   * its per-run ceiling.
   */
  const report = async (): Promise<"go" | "ended" | "over"> => {
    const beat = await heartbeatRunRoute({
      ...ref,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
    });
    if (!beat.ok) return [403, 404, 409].includes(beat.status) ? "ended" : "go";
    if (beat.data.run.runState !== "running") return "ended";
    return beat.data.overCeiling ? "over" : "go";
  };

  try {
    let progress = await report();
    if (progress === "ended") return;

    const snapshot = await fetchDropletSnapshot(
      { id: run.dropletId },
      { previousReview: false },
    );
    if (!snapshot) {
      await finish({
        runState: "failed",
        failedLessons: [],
        scores: [],
        error: "The droplet could not be read.",
      });
      return;
    }

    const options = { model: run.model, effort: run.effort };
    const scores: RunScoreInput[] = [];
    const failures: string[] = [];
    const failedLessons: number[] = [];
    const lessonScores: LessonScores[] = [];

    const requests = buildLessonRequests(snapshot, run.criteria, options);
    for (const [i, request] of requests.entries()) {
      if (progress === "over") {
        // The rest go unscored, listed as failed so the panel names them.
        failedLessons.push(...requests.slice(i).map((r) => r.lessonId!));
        break;
      }
      const lessonId = request.lessonId!;
      const { parsed, usage } = await scoreOne(
        client,
        request,
        run.criteria,
        sleep,
      );
      count(usage);
      scores.push(...toInputs(lessonId, parsed));
      lessonScores.push({ lessonId, scores: parsed.ok ? parsed.scores : null });
      if (!parsed.ok) {
        failedLessons.push(lessonId);
        failures.push(
          `Lesson ${i + 1} ("${request.lessonName}"): ${describe(parsed)}`,
        );
      }
      progress = await report();
      if (progress === "ended") return;
    }

    if (progress === "over") {
      failures.unshift(CEILING_MESSAGE);
    } else {
      const overall = await scoreOne(
        client,
        buildOverallRequest(snapshot, run.criteria, lessonScores, options),
        run.criteria,
        sleep,
      );
      count(overall.usage);
      scores.push(...toInputs(null, overall.parsed));
      if (!overall.parsed.ok) {
        failures.push(`Overall Score: ${describe(overall.parsed)}`);
      }
    }

    await finish({
      runState: !failures.length
        ? "done"
        : scores.length
          ? "partial"
          : "failed",
      failedLessons,
      scores,
      error: failures.length ? clip(failures.join("; "), MAX_ERROR) : null,
    });
  } catch (error) {
    console.error("Score with AI run failed", error);
    try {
      await finish({
        runState: "failed",
        failedLessons: [],
        scores: [],
        error: clip(
          `Scoring stopped: ${error instanceof Error ? error.message : String(error)}`,
          MAX_ERROR,
        ),
      });
    } catch (finishError) {
      console.error("Score with AI could not end its run", finishError);
    }
  }
}
