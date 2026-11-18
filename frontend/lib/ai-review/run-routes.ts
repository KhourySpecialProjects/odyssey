import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { readJsonOrNull } from "@/lib/strapi-response";
import type {
  AiFinding,
  AiRunProgress,
  AiRunSection,
  AiScoringRunState,
  ReviewCriterionSnapshot,
} from "@/types";

/**
 * A queued or running run with no progress for this long is dead; the start
 * route then marks it failed. Matches `backend/src/lib/ai-scoring-runs.ts`.
 */
export const STALE_RUN_MS = 10 * 60 * 1000;

/** What the run routes return about a run. */
export type RunSummary = {
  id: number;
  documentId: string;
  runState: AiScoringRunState;
  startedAt: string | null;
  finishedAt: string | null;
};

export type StartedRun = {
  dropletId: number;
  run: RunSummary;
  criteria: ReviewCriterionSnapshot[];
};

export type RunProgress = { dropletId: number; run: RunSummary };

export type RunHeartbeat = RunProgress & {
  /** The run has spent its per-run ceiling and should stop (ODY-815) */
  overCeiling: boolean;
};

export type FinishedRun = RunProgress & {
  saved: number;
  kept: number;
  dropped: number;
};

export type RunScoreInput = {
  lessonId: number | null;
  criterionId: number;
  aiValue: number;
  aiRationale: string;
  aiFindings: AiFinding[];
};

export type FinishRunInput = {
  runId: number;
  userId: number;
  runState: "done" | "partial" | "failed";
  failedLessons: AiRunSection[];
  inputTokens: number;
  outputTokens: number;
  error: string | null;
  scores: RunScoreInput[];
};

export type RouteResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string | null };

/**
 * Calls a Score with AI route (`backend/src/api/ai-scoring-run`). Each one
 * checks that `userId` is the review's reviewer, under the review's row lock.
 * Bodies are `{ data }`, not v4 entries, so nothing is flattened. A network
 * failure is status 0.
 */
async function postRunRoute<T>(
  path: "start" | "heartbeat" | "finish",
  body: object,
): Promise<RouteResult<T>> {
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/ai-scoring-runs/${path}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
        ...STRAPI_RESPONSE_FORMAT_HEADER,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await readJsonOrNull(response).catch(() => null);
    if (!response.ok || !json?.data) {
      const message: string | null = json?.error?.message ?? null;
      console.error(`POST ${url} failed:`, response.status, message);
      return { ok: false, status: response.status, message };
    }
    return { ok: true, data: json.data as T };
  } catch (error) {
    console.error(`POST ${url} failed:`, error);
    return { ok: false, status: 0, message: null };
  }
}

export const startRunRoute = (body: {
  reviewId: number;
  userId: number;
  model: string;
  promptVersion: string;
}) => postRunRoute<StartedRun>("start", body);

/**
 * Tokens are the run's totals so far, so a run cut short keeps its cost.
 * `scores` are one section's suggestions, saved with the heartbeat.
 */
export const heartbeatRunRoute = (body: {
  runId: number;
  userId: number;
  inputTokens: number;
  outputTokens: number;
  progress?: AiRunProgress;
  failedLessons?: AiRunSection[];
  scores?: RunScoreInput[];
}) => postRunRoute<RunHeartbeat>("heartbeat", body);

export const finishRunRoute = (body: FinishRunInput) =>
  postRunRoute<FinishedRun>("finish", body);
