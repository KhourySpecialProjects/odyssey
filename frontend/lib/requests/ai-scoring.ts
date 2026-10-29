"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import type {
  AiRunSection,
  AiScoringRun,
  AiScoringRunState,
  Review,
} from "@/types";
import { fetchAPI } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { withAuth } from "@/lib/auth/guards";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { isReviewerFor } from "@/lib/review-roles";
import {
  checkRateLimit,
  formatRateLimitError,
} from "@/lib/import/rate-limiter";
import { DEFAULT_EFFORT, DEFAULT_MODEL } from "@/lib/ai-review/models";
import { PROMPT_VERSION } from "@/lib/ai-review/prompt";
import { STALE_RUN_MS, startRunRoute } from "@/lib/ai-review/run-routes";
import { runAiScoring } from "@/lib/ai-review/score-run";
import {
  getOrOpenReview,
  type ReviewActionError,
  type ReviewActionResult,
} from "@/lib/requests/reviews";

const REVIEWER_ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.ContentEditor,
];

const idSchema = z.number().int().positive();

/** Where a reviewer's latest Score with AI run stands. */
export type AiRunStatus = {
  id: number;
  runState: AiScoringRunState;
  startedAt: string | null;
  finishedAt: string | null;
  /** Lessons (and "overall") whose request failed */
  failedLessons: AiRunSection[];
  error: string | null;
};

const RUN_ROUTE_ERRORS: Record<number, ReviewActionError> = {
  400: "invalid_input",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
};

const STALE_MESSAGE = "Stopped: no progress for 10 minutes.";

/**
 * Starts Score with AI on the caller's review of a droplet, opening the
 * review if needed. Answers as soon as the run is created; the scoring runs
 * after the response (`after()`), and its suggestions land on the review's
 * scores as `aiValue` and `aiRationale`. Poll `getAiScoringRun` for progress.
 */
export async function startAiScoring(
  dropletId: number,
): Promise<ReviewActionResult<AiRunStatus>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsedId = idSchema.safeParse(dropletId);
      if (!parsedId.success) {
        return { ok: false, error: "invalid_input", data: null };
      }
      if (!process.env.ANTHROPIC_API_KEY) {
        console.error("startAiScoring: ANTHROPIC_API_KEY is not set");
        return {
          ok: false,
          error: "failed",
          data: null,
          message: "Score with AI isn't set up on this server.",
        };
      }

      const review = await getOrOpenReview(parsedId.data);
      if (!review.ok) return review;
      if (review.data.state !== "open") {
        return { ok: false, error: "review_closed", data: null };
      }

      const limit = checkRateLimit(user.email, user.roles, "ai-scoring");
      if (!limit.allowed) {
        return {
          ok: false,
          error: "rate_limited",
          data: null,
          message: formatRateLimitError(limit.retryAfterMs ?? 0),
        };
      }

      const started = await startRunRoute({
        reviewId: review.data.id,
        userId: user.id,
        model: DEFAULT_MODEL,
        promptVersion: PROMPT_VERSION,
      });
      if (!started.ok) {
        return {
          ok: false,
          error: RUN_ROUTE_ERRORS[started.status] ?? "failed",
          data: null,
          message: started.message,
        };
      }

      const { run, criteria } = started.data;
      revalidateTag(CACHE_TAGS.review(started.data.dropletId));
      const client = new Anthropic();
      // Loaded here, not at the top: next/server needs the Fetch API globals,
      // which jsdom tests that import this file (the sidebar's) don't have.
      const { after } = await import("next/server");
      after(() =>
        runAiScoring(
          {
            runId: run.id,
            userId: user.id,
            dropletId: started.data.dropletId,
            criteria,
            model: DEFAULT_MODEL,
            effort: DEFAULT_EFFORT,
          },
          { client },
        ),
      );

      return {
        ok: true,
        error: null,
        data: {
          id: run.id,
          runState: run.runState,
          startedAt: run.startedAt,
          finishedAt: run.finishedAt,
          failedLessons: [],
          error: null,
        },
      };
    } catch (error) {
      console.error("startAiScoring failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

type DropletForRun = {
  id: number;
  reviewRound?: number | null;
  authorized_users?: { id: number }[] | null;
};

type RunRow = AiScoringRun & { updatedAt?: string | null };

/**
 * The caller's latest Score with AI run on their review of the droplet's
 * current round, or null when there is none. A run with no progress for 10
 * minutes reads as failed. Never cached, so it can be polled.
 */
export async function getAiScoringRun(
  dropletId: number,
): Promise<ReviewActionResult<AiRunStatus | null>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsedId = idSchema.safeParse(dropletId);
      if (!parsedId.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const droplets = await fetchAPI<DropletForRun[] | null>("/droplets", {
        urlParams: {
          filters: { id: { $eq: parsedId.data } },
          fields: ["reviewRound"],
          populate: { authorized_users: { fields: ["id"] } },
          pagination: { pageSize: 1 },
        },
        cache: "no-store",
      });
      const droplet = droplets?.[0];
      if (!droplet) return { ok: false, error: "not_found", data: null };
      const isAuthor = (droplet.authorized_users ?? []).some(
        (u) => u.id === user.id,
      );
      // No author reviews their own droplet, whatever their role.
      if (!isReviewerFor(user.roles, true, isAuthor)) {
        return { ok: false, error: "forbidden", data: null };
      }
      const round = droplet.reviewRound ?? 0;
      if (round < 1) return { ok: true, error: null, data: null };

      const reviews = await fetchAPI<Pick<Review, "id">[] | null>("/reviews", {
        urlParams: {
          filters: { key: { $eq: `${droplet.id}:${user.id}:${round}` } },
          fields: ["key"],
          pagination: { pageSize: 1 },
        },
        cache: "no-store",
      });
      const review = reviews?.[0];
      if (!review) return { ok: true, error: null, data: null };

      const runs = await fetchAPI<RunRow[] | null>("/ai-scoring-runs", {
        urlParams: {
          filters: { review: { id: { $eq: review.id } } },
          fields: [
            "runState",
            "failedLessons",
            "error",
            "startedAt",
            "finishedAt",
            "updatedAt",
          ],
          sort: ["id:desc"],
          pagination: { pageSize: 1 },
        },
        cache: "no-store",
      });
      const run = runs?.[0];
      if (!run) return { ok: true, error: null, data: null };

      const active = run.runState === "queued" || run.runState === "running";
      const stale =
        active &&
        !!run.updatedAt &&
        Date.now() - new Date(run.updatedAt).getTime() > STALE_RUN_MS;
      return {
        ok: true,
        error: null,
        data: {
          id: run.id,
          runState: stale ? "failed" : run.runState,
          startedAt: run.startedAt ?? null,
          finishedAt: run.finishedAt ?? null,
          failedLessons: run.failedLessons ?? [],
          error: stale ? STALE_MESSAGE : run.error ?? null,
        },
      };
    } catch (error) {
      console.error("getAiScoringRun failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}
