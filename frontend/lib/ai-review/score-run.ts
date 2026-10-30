import Anthropic from "@anthropic-ai/sdk";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { CEILING_ERROR } from "@/lib/review-panel/ai-messages";
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
import { findingTexts, toFindings, type FindingTexts } from "./findings";
import type { AiRunSection } from "@/types";
import type {
  Criterion,
  LessonScores,
  ParsedScores,
  Transgression,
} from "./types";

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
 * run. Under STALE_RUN_MS, since progress is reported between lessons.
 */
const REQUEST_TIMEOUT_MS = 8 * 60 * 1000;
/** Waits before each retry of a `finish` that didn't reach Strapi. */
const FINISH_RETRY_DELAYS_MS = [5_000, 30_000];
const MAX_ERROR = 2000;
const MAX_RATIONALE = 4000;

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

/**
 * Scores each lesson (saved by the heartbeat after it), then the Overall with `finish`.
 * Runs in `after()` and never throws; it stops if the run ends elsewhere or hits the ceiling.
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

  const done: AiRunSection[] = [];
  const failedSections: AiRunSection[] = [];
  const failures: string[] = [];
  let pending: { section: number; scores: RunScoreInput[] }[] = [];
  let savedAny = false;
  let lessonIds: number[] | null = null;
  const labels = new Map<number, string>();
  let droppedQuotes = 0;
  let findingCount = 0;
  const nextId = () => `${run.runId}-${++findingCount}`;

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
        runState: savedAny ? "partial" : "failed",
        failedLessons: [
          ...new Set<AiRunSection>([
            ...input.failedLessons,
            ...input.scores.map((s) => s.lessonId ?? "overall"),
          ]),
        ],
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
   * Sends progress, tokens and unsaved scores. A 400 marks those sections failed and resends
   * without them; other failures keep them for the next beat.
   */
  const report = async (
    current: AiRunSection,
  ): Promise<"go" | "ended" | "over"> => {
    const send = (withScores: boolean) =>
      heartbeatRunRoute({
        ...ref,
        inputTokens: tokens.input,
        outputTokens: tokens.output,
        progress: { done: [...done], current },
        failedLessons: [...failedSections],
        ...(withScores && pending.length
          ? { scores: pending.flatMap((p) => p.scores) }
          : {}),
      });
    const hadScores = pending.length > 0;
    let beat = await send(true);
    if (beat.ok) {
      if (hadScores) savedAny = true;
      pending = [];
    } else if (beat.status === 400 && hadScores) {
      const sections = pending.map((p) => p.section);
      failedSections.push(...sections);
      failures.push(
        clip(
          `Saving ${sections.map((id) => labels.get(id) ?? `lesson ${id}`).join(", ")} failed: ${beat.message ?? "invalid scores"}`,
          300,
        ),
      );
      pending = [];
      beat = await send(false);
    }
    if (!beat.ok) return [403, 404, 409].includes(beat.status) ? "ended" : "go";
    if (beat.data.run.runState !== "running") return "ended";
    return beat.data.overCeiling ? "over" : "go";
  };

  try {
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

    // Findings are an add-on: a failure here costs the findings, never the scores.
    let texts: FindingTexts | null = null;
    try {
      texts = findingTexts(snapshot);
    } catch {
      console.error("Score with AI could not read the text for findings", {
        runId: run.runId,
      });
    }
    const findingsFor = (
      transgressions: Transgression[],
      lessonId: number | null,
    ) => {
      const none = { findings: [], dropped: transgressions.length };
      if (!texts) return none;
      try {
        return toFindings(
          transgressions,
          lessonId === null ? "overall" : { lessonId },
          texts,
          nextId,
        );
      } catch {
        texts = null;
        console.error("Score with AI could not build findings", {
          runId: run.runId,
        });
        return none;
      }
    };
    const toInputs = (
      lessonId: number | null,
      parsed: Outcome["parsed"],
    ): RunScoreInput[] =>
      parsed.ok
        ? parsed.scores.map((s) => {
            const { findings, dropped } = findingsFor(
              s.transgressions,
              lessonId,
            );
            droppedQuotes += dropped;
            return {
              lessonId,
              criterionId: s.criterionId,
              aiValue: s.score,
              aiRationale: clip(s.rationale, MAX_RATIONALE),
              aiFindings: findings,
            };
          })
        : [];

    const options = { model: run.model, effort: run.effort };
    const lessonScores: LessonScores[] = [];
    const requests = buildLessonRequests(snapshot, run.criteria, options);
    const ids = requests.map((r) => r.lessonId!);
    lessonIds = ids;
    for (const [i, r] of requests.entries()) {
      labels.set(r.lessonId!, `Lesson ${i + 1} ("${r.lessonName}")`);
    }

    let progress = await report(ids[0] ?? "overall");
    if (progress === "ended") return;

    for (const [i, request] of requests.entries()) {
      if (progress === "over") {
        // The rest go unscored, listed as failed so the panel names them.
        failedSections.push(...ids.slice(i));
        break;
      }
      const lessonId = ids[i];
      const { parsed, usage } = await scoreOne(
        client,
        request,
        run.criteria,
        sleep,
      );
      count(usage);
      const inputs = toInputs(lessonId, parsed);
      if (inputs.length) pending.push({ section: lessonId, scores: inputs });
      lessonScores.push({ lessonId, scores: parsed.ok ? parsed.scores : null });
      if (!parsed.ok) {
        failedSections.push(lessonId);
        failures.push(`${labels.get(lessonId)}: ${describe(parsed)}`);
      }
      done.push(lessonId);
      progress = await report(ids[i + 1] ?? "overall");
      if (progress === "ended") return;
    }

    const overallInputs: RunScoreInput[] = [];
    if (progress === "over") {
      failedSections.push("overall");
      failures.unshift(CEILING_ERROR);
    } else {
      const overall = await scoreOne(
        client,
        buildOverallRequest(snapshot, run.criteria, lessonScores, options),
        run.criteria,
        sleep,
      );
      count(overall.usage);
      overallInputs.push(...toInputs(null, overall.parsed));
      if (!overall.parsed.ok) {
        failedSections.push("overall");
        failures.push(`Overall Score: ${describe(overall.parsed)}`);
      }
    }

    const scores = [...pending.flatMap((p) => p.scores), ...overallInputs];
    await finish({
      runState: !failures.length
        ? "done"
        : savedAny || scores.length
          ? "partial"
          : "failed",
      failedLessons: failedSections,
      scores,
      error: failures.length ? clip(failures.join("; "), MAX_ERROR) : null,
    });
  } catch (error) {
    console.error("Score with AI run failed", error);
    try {
      // Nothing was scored before the snapshot was read.
      const failedLessons: AiRunSection[] = lessonIds
        ? [
            ...new Set<AiRunSection>([
              ...failedSections,
              ...pending.map((p) => p.section),
              ...lessonIds.filter((id) => !done.includes(id)),
              "overall",
            ]),
          ]
        : [];
      await finish({
        runState: savedAny ? "partial" : "failed",
        failedLessons,
        scores: [],
        error: clip(
          `Scoring stopped: ${error instanceof Error ? error.message : String(error)}`,
          MAX_ERROR,
        ),
      });
    } catch (finishError) {
      console.error("Score with AI could not end its run", finishError);
    }
  } finally {
    console.info(`Score with AI dropped ${droppedQuotes} quotes`, {
      runId: run.runId,
    });
  }
}
