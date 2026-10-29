"use server";

import { z } from "zod";
import type {
  AiFinding,
  Review,
  ReviewComment,
  ReviewScore,
  ReviewState,
} from "@/types";
import {
  fetchAPI,
  flattenAttributes,
  STRAPI_RESPONSE_FORMAT_HEADER,
} from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { resolveDocumentId, strapiEntryUrl } from "@/lib/strapi-document-id";
import { readJsonOrNull } from "@/lib/strapi-response";
import { withAuth, assertOwner, type AuthUser } from "@/lib/auth/guards";
import {
  aiFindingSchema,
  aiRunProgressSchema,
  reviewCommentBodySchema,
  reviewCommentInputSchema,
  reviewScoreSaveSchema,
  reviewScoreScopeSchema,
  type ReviewCommentInput,
  type ReviewScoreSave,
} from "@/lib/validations/review";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { loadDropletForWrite } from "@/lib/auth/review-freeze";
import { isReviewerFor } from "@/lib/review-roles";
import { revalidatePublishedEdit } from "@/lib/revalidate-publish";
import { blockNoteContent } from "@/lib/anchors/content";
import type { AnchorBlock } from "@/lib/anchors/types";
import {
  computePositions,
  type Position,
  type PositionItem,
} from "@/lib/review-panel/positions";
import type { PanelScore, PanelRun } from "@/lib/review-panel/model";

const NEXT_PUBLIC_STRAPI_API_URL = process.env.NEXT_PUBLIC_STRAPI_API_URL;
const STRAPI_ACCESS_TOKEN = process.env.STRAPI_ACCESS_TOKEN;

const REVIEWER_ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.ContentEditor,
];

const REVIEW_FIELDS = ["round", "key", "state", "summaryNote", "sentAt"];

const idSchema = z.number().int().positive();

export type ReviewActionError =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "not_in_review"
  | "review_closed"
  | "conflict"
  | "unconfirmed"
  | "failed";

export type ReviewActionResult<T> =
  | { ok: true; error: null; data: T }
  | {
      ok: false;
      error: ReviewActionError;
      data: null;
      /** Strapi's own message for a 400, 404, 409 or 5xx. */
      message?: string | null;
    };

/** One raw write to Strapi; DELETE's empty 204 is read with `readJsonOrNull`. */
async function writeStrapi(
  method: "POST" | "PUT" | "DELETE",
  url: string,
  data?: object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ ok: boolean; data: any }> {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      ...STRAPI_RESPONSE_FORMAT_HEADER,
    },
    ...(data !== undefined && { body: JSON.stringify({ data }) }),
  });
  if (!response.ok) {
    console.error(
      `${method} ${url} failed:`,
      response.status,
      await response.text().catch(() => ""),
    );
    return { ok: false, data: null };
  }
  const json = await readJsonOrNull(response);
  return {
    ok: true,
    data: method === "DELETE" ? json : flattenAttributes(json?.data),
  };
}

type DropletAuthors = { authorized_users?: { id: number }[] | null };

const AUTHORS_POPULATE = { authorized_users: { fields: ["id"] } };

/** No author reviews their own droplet, whatever their role (ODY-810). */
const isOwnDroplet = (droplet: DropletAuthors, user: AuthUser) =>
  !isReviewerFor(
    user.roles,
    true,
    (droplet.authorized_users ?? []).some((u) => u.id === user.id),
  );

/** The caller's documentId from the gate, else looked up by their id. */
async function callerDocumentId(user: AuthUser): Promise<string> {
  return user.documentId ?? resolveDocumentId("authorized-users", user.id);
}

/** Looks a review up by its unique key, never from cache. */
async function findReviewByKey(key: string): Promise<Review | null> {
  const rows = await fetchAPI<Review[] | null>("/reviews", {
    urlParams: {
      filters: { key: { $eq: key } },
      fields: REVIEW_FIELDS,
      pagination: { pageSize: 1 },
    },
    cache: "no-store",
  });
  return rows?.[0] ?? null;
}

type DropletForReview = DropletAuthors & {
  id: number;
  documentId: string;
  inReview?: boolean | null;
  reviewRound?: number | null;
};

/** The droplet's review round and authors, never from cache. */
async function findDropletForReview(
  id: number,
): Promise<DropletForReview | null> {
  const droplets = await fetchAPI<DropletForReview[] | null>("/droplets", {
    urlParams: {
      filters: { id: { $eq: id } },
      fields: ["inReview", "reviewRound"],
      populate: AUTHORS_POPULATE,
      pagination: { pageSize: 1 },
    },
    cache: "no-store",
  });
  return droplets?.[0] ?? null;
}

/** Returns the caller's review for the droplet's current round, opening it if needed. */
export async function getOrOpenReview(
  dropletId: number,
): Promise<ReviewActionResult<Review>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsedId = idSchema.safeParse(dropletId);
      if (!parsedId.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const droplet = await findDropletForReview(parsedId.data);
      if (!droplet) return { ok: false, error: "not_found", data: null };
      if (isOwnDroplet(droplet, user)) {
        return { ok: false, error: "forbidden", data: null };
      }

      const round = droplet.reviewRound ?? 0;
      if (round < 1) return { ok: false, error: "not_in_review", data: null };

      const key = `${droplet.id}:${user.id}:${round}`;
      const existing = await findReviewByKey(key);
      if (existing) return { ok: true, error: null, data: existing };

      if (!droplet.inReview) {
        return { ok: false, error: "not_in_review", data: null };
      }

      const created = await writeStrapi(
        "POST",
        `${NEXT_PUBLIC_STRAPI_API_URL}/api/reviews`,
        {
          droplet: droplet.documentId,
          reviewer: await callerDocumentId(user),
          round,
          key,
          state: "open",
        },
      );
      // A lost reviews_key_uq race returns the winning row.
      const review: Review | null =
        created.ok && created.data ? created.data : await findReviewByKey(key);
      if (!review) return { ok: false, error: "failed", data: null };

      revalidateTag(CACHE_TAGS.review(droplet.id));
      return { ok: true, error: null, data: review };
    } catch (error) {
      console.error("getOrOpenReview failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

type ReviewForWrite = {
  id: number;
  documentId: string;
  state: string;
  droplet: (DropletAuthors & { id: number }) | null;
  reviewer: { id: number } | null;
};

type CommentForWrite = {
  id: number;
  documentId: string;
  author: { id: number } | null;
  review: {
    state: string;
    droplet: (DropletAuthors & { id: number }) | null;
  } | null;
};

/** Looks a review up by id, never from cache. */
async function findReviewById(id: number): Promise<ReviewForWrite | null> {
  const rows = await fetchAPI<ReviewForWrite[] | null>("/reviews", {
    urlParams: {
      filters: { id: { $eq: id } },
      fields: ["state"],
      populate: {
        droplet: { fields: ["id"], populate: AUTHORS_POPULATE },
        reviewer: { fields: ["id"] },
      },
      pagination: { pageSize: 1 },
    },
    cache: "no-store",
  });
  return rows?.[0] ?? null;
}

/** Looks a comment up by id with its review state and droplet, never from cache. */
async function findCommentById(id: number): Promise<CommentForWrite | null> {
  const rows = await fetchAPI<CommentForWrite[] | null>("/review-comments", {
    urlParams: {
      filters: { id: { $eq: id } },
      fields: ["resolvedAt"],
      populate: {
        author: { fields: ["id"] },
        review: {
          fields: ["state"],
          populate: {
            droplet: { fields: ["id"], populate: AUTHORS_POPULATE },
          },
        },
      },
      pagination: { pageSize: 1 },
    },
    cache: "no-store",
  });
  return rows?.[0] ?? null;
}

type WritableComment =
  | { ok: true; comment: CommentForWrite; dropletId: number }
  | { ok: false; error: ReviewActionError };

/**
 * Fetches a comment and checks its review is open, that the caller isn't an
 * author of the droplet, and (with `ownOnly`) that they wrote the comment.
 */
async function loadWritableComment(
  id: number,
  user: AuthUser,
  { ownOnly }: { ownOnly: boolean },
): Promise<WritableComment> {
  const comment = await findCommentById(id);
  const droplet = comment?.review?.droplet;
  if (!comment || !comment.review || !droplet) {
    return { ok: false, error: "not_found" };
  }
  if (comment.review.state !== "open") {
    return { ok: false, error: "review_closed" };
  }
  if (isOwnDroplet(droplet, user)) return { ok: false, error: "forbidden" };
  if (
    ownOnly &&
    !assertOwner(comment.author?.id, user, { bypassRoles: [] }).ok
  ) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, comment, dropletId: droplet.id };
}

/** Adds an anchored comment to the caller's own open review. */
export async function addComment(
  input: ReviewCommentInput,
): Promise<ReviewActionResult<ReviewComment>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsed = reviewCommentInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: "invalid_input", data: null };
      }
      const { reviewId, lessonId, field, anchor, body } = parsed.data;

      const review = await findReviewById(reviewId);
      if (!review?.droplet)
        return { ok: false, error: "not_found", data: null };
      if (review.state !== "open") {
        return { ok: false, error: "review_closed", data: null };
      }
      if (
        !assertOwner(review.reviewer?.id, user, { bypassRoles: [] }).ok ||
        isOwnDroplet(review.droplet, user)
      ) {
        return { ok: false, error: "forbidden", data: null };
      }

      let lesson: { id: number; documentId: string } | null = null;
      if (lessonId !== null) {
        const lessons = await fetchAPI<
          { id: number; documentId: string }[] | null
        >("/lessons", {
          urlParams: {
            filters: {
              id: { $eq: lessonId },
              droplets: { id: { $eq: review.droplet.id } },
            },
            fields: ["id"],
            pagination: { pageSize: 1 },
          },
          cache: "no-store",
        });
        lesson = lessons?.[0] ?? null;
        if (!lesson) return { ok: false, error: "invalid_input", data: null };
      }

      const created = await writeStrapi(
        "POST",
        `${NEXT_PUBLIC_STRAPI_API_URL}/api/review-comments`,
        {
          review: review.documentId,
          field,
          anchor,
          body,
          author: await callerDocumentId(user),
          ...(lesson && { lesson: lesson.documentId }),
        },
      );
      if (!created.ok) return { ok: false, error: "failed", data: null };

      revalidateTag(CACHE_TAGS.review(review.droplet.id));
      return { ok: true, error: null, data: created.data };
    } catch (error) {
      console.error("addComment failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Edits the body of the caller's own comment on an open review. */
export async function editComment(
  commentId: number,
  body: string,
): Promise<ReviewActionResult<ReviewComment>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const id = idSchema.safeParse(commentId);
      const text = reviewCommentBodySchema.safeParse(body);
      if (!id.success || !text.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const loaded = await loadWritableComment(id.data, user, {
        ownOnly: true,
      });
      if (!loaded.ok) return { ok: false, error: loaded.error, data: null };

      const updated = await writeStrapi(
        "PUT",
        await strapiEntryUrl("review-comments", loaded.comment),
        { body: text.data },
      );
      if (!updated.ok) return { ok: false, error: "failed", data: null };

      revalidateTag(CACHE_TAGS.review(loaded.dropletId));
      return { ok: true, error: null, data: updated.data };
    } catch (error) {
      console.error("editComment failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Deletes the caller's own comment on an open review. */
export async function deleteComment(
  commentId: number,
): Promise<ReviewActionResult<{ id: number }>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const id = idSchema.safeParse(commentId);
      if (!id.success) return { ok: false, error: "invalid_input", data: null };

      const loaded = await loadWritableComment(id.data, user, {
        ownOnly: true,
      });
      if (!loaded.ok) return { ok: false, error: loaded.error, data: null };

      const deleted = await writeStrapi(
        "DELETE",
        await strapiEntryUrl("review-comments", loaded.comment),
      );
      if (!deleted.ok) return { ok: false, error: "failed", data: null };

      revalidateTag(CACHE_TAGS.review(loaded.dropletId));
      return { ok: true, error: null, data: { id: loaded.comment.id } };
    } catch (error) {
      console.error("deleteComment failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Resolves (or with `false`, reopens) any comment on an open review. */
export async function resolveComment(
  commentId: number,
  resolved: boolean = true,
): Promise<ReviewActionResult<ReviewComment>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const id = idSchema.safeParse(commentId);
      const flag = z.boolean().safeParse(resolved);
      if (!id.success || !flag.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const loaded = await loadWritableComment(id.data, user, {
        ownOnly: false,
      });
      if (!loaded.ok) return { ok: false, error: loaded.error, data: null };

      const updated = await writeStrapi(
        "PUT",
        await strapiEntryUrl("review-comments", loaded.comment),
        { resolvedAt: flag.data ? new Date().toISOString() : null },
      );
      if (!updated.ok) return { ok: false, error: "failed", data: null };

      revalidateTag(CACHE_TAGS.review(loaded.dropletId));
      return { ok: true, error: null, data: updated.data };
    } catch (error) {
      console.error("resolveComment failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

type SavedScore = Pick<
  ReviewScore,
  "id" | "key" | "criterionName" | "value" | "aiValue"
>;

const SCORE_ROUTE_ERRORS: Record<number, ReviewActionError> = {
  400: "invalid_input",
  403: "forbidden",
  404: "not_found",
  409: "review_closed",
};

/**
 * Calls a custom score route (`backend/src/api/review-score`). The route checks
 * that `userId` is the review's reviewer and the review is open, in one
 * transaction. Its body is `{ data }`, not a v4 entry, so nothing is flattened.
 */
async function postScoreRoute<T extends { dropletId: number }>(
  path: "upsert" | "accept-ai" | "unconfirm",
  body: object,
): Promise<{ ok: true; data: T } | { ok: false; error: ReviewActionError }> {
  const url = `${NEXT_PUBLIC_STRAPI_API_URL}/api/review-scores/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
      ...STRAPI_RESPONSE_FORMAT_HEADER,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error(
      `POST ${url} failed:`,
      response.status,
      await response.text().catch(() => ""),
    );
    return {
      ok: false,
      error: SCORE_ROUTE_ERRORS[response.status] ?? "failed",
    };
  }
  const json = await readJsonOrNull(response);
  if (!json?.data) return { ok: false, error: "failed" };
  return { ok: true, data: json.data };
}

/** Saves the caller's score for one criterion on their own open review, in one request. */
export async function saveReviewScore(
  input: ReviewScoreSave,
): Promise<ReviewActionResult<SavedScore>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsed = reviewScoreSaveSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const saved = await postScoreRoute<{
        dropletId: number;
        score: SavedScore;
      }>("upsert", { ...parsed.data, userId: user.id });
      if (!saved.ok) return { ok: false, error: saved.error, data: null };

      revalidateTag(CACHE_TAGS.review(saved.data.dropletId));
      return { ok: true, error: null, data: saved.data.score };
    } catch (error) {
      console.error("saveReviewScore failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/**
 * Confirms every AI suggestion the caller hasn't scored yet, for one lesson or
 * (with `lessonId` null) the Overall Score. Scores the caller already set are
 * left alone. Returns the scores it confirmed.
 */
export async function acceptAiScores(
  reviewId: number,
  lessonId: number | null,
): Promise<ReviewActionResult<SavedScore[]>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsed = reviewScoreScopeSchema.safeParse({ reviewId, lessonId });
      if (!parsed.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const accepted = await postScoreRoute<{
        dropletId: number;
        scores: SavedScore[];
      }>("accept-ai", { ...parsed.data, userId: user.id });
      if (!accepted.ok) return { ok: false, error: accepted.error, data: null };

      revalidateTag(CACHE_TAGS.review(accepted.data.dropletId));
      return { ok: true, error: null, data: accepted.data.scores };
    } catch (error) {
      console.error("acceptAiScores failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/**
 * Undoes Confirm for one lesson or (null) the Overall Score: clears `value`
 * where it equals `aiValue`. Returns the scores it cleared.
 */
export async function unconfirmScores(
  reviewId: number,
  lessonId: number | null,
): Promise<ReviewActionResult<SavedScore[]>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsed = reviewScoreScopeSchema.safeParse({ reviewId, lessonId });
      if (!parsed.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const cleared = await postScoreRoute<{
        dropletId: number;
        scores: SavedScore[];
      }>("unconfirm", { ...parsed.data, userId: user.id });
      if (!cleared.ok) return { ok: false, error: cleared.error, data: null };

      revalidateTag(CACHE_TAGS.review(cleared.data.dropletId));
      return { ok: true, error: null, data: cleared.data.scores };
    } catch (error) {
      console.error("unconfirmScores failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Reads every page of a list, tagged for the droplet's review data. */
async function fetchAllPages<T>(
  path: string,
  urlParams: Record<string, unknown>,
  dropletId: number,
  fresh = false,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const rows = await fetchAPI<T[] | null>(path, {
      urlParams: { ...urlParams, pagination: { page, pageSize: PAGE_SIZE } },
      ...(fresh
        ? { cache: "no-store" as const }
        : { next: { tags: [CACHE_TAGS.review(dropletId)], revalidate: 900 } }),
    });
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
}

/** Every comment on a review, oldest first. */
function fetchComments(
  reviewId: number,
  dropletId: number,
  fresh = false,
): Promise<ReviewComment[]> {
  return fetchAllPages<ReviewComment>(
    "/review-comments",
    {
      filters: { review: { id: { $eq: reviewId } } },
      fields: ["field", "anchor", "body", "resolvedAt", "createdAt"],
      populate: {
        lesson: { fields: ["name"] },
        author: { fields: ["firstName", "lastName"] },
      },
      sort: ["id:asc"],
    },
    dropletId,
    fresh,
  );
}

/**
 * The caller's own review for the droplet's current round, with its comments
 * (ODY-806), or null when they haven't opened one. Never opens a review.
 */
export async function getMyReview(
  dropletId: number,
): Promise<ReviewActionResult<Review | null>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsedId = idSchema.safeParse(dropletId);
      if (!parsedId.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const droplet = await findDropletForReview(parsedId.data);
      if (!droplet) return { ok: false, error: "not_found", data: null };
      if (isOwnDroplet(droplet, user)) {
        return { ok: false, error: "forbidden", data: null };
      }

      const round = droplet.reviewRound ?? 0;
      if (round < 1) return { ok: true, error: null, data: null };

      const review = await findReviewByKey(`${droplet.id}:${user.id}:${round}`);
      if (!review) return { ok: true, error: null, data: null };

      const comments = await fetchComments(review.id, droplet.id);
      return { ok: true, error: null, data: { ...review, comments } };
    } catch (error) {
      console.error("getMyReview failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

export type PanelCriterion = {
  id: number;
  name: string;
  order: number;
  active: boolean;
  lessonDescription?: string;
  overallDescription?: string;
};

export type PanelRunData = PanelRun & {
  id: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  error?: string | null;
};

/** What the Reviewer Transcript panel reads: no comments (the shared context has them). */
export type ReviewPanelData = {
  review: { id: number; round: number; state: ReviewState } | null;
  criteria: PanelCriterion[];
  scores: (PanelScore & {
    id: number;
    key: string;
    criterionName: string;
  })[];
  latestRun: PanelRunData | null;
  /** Keyed `c<commentId>` and `f<findingId>`; see lib/review-panel/positions */
  positions: Record<string, Position>;
};

type PanelLesson = {
  id: number;
  blocksVersion?: string | null;
  blocksV2?: unknown;
};

/** "<reviewId>:<lessonId|overall>:<criterionId>" */
function parseScoreKey(key: string) {
  const [, section, criterion] = key.split(":");
  return {
    lessonId: section === "overall" ? null : Number(section),
    criterionId: Number(criterion),
  };
}

const failedLessonsSchema = z.array(z.union([idSchema, z.literal("overall")]));

/** Drops malformed AI JSON from a run so one bad value can't fail the panel. */
function cleanRun(run: PanelRunData | null | undefined): PanelRunData | null {
  if (!run) return null;
  return {
    ...run,
    progress: aiRunProgressSchema.safeParse(run.progress).success
      ? run.progress
      : null,
    failedLessons: failedLessonsSchema.safeParse(run.failedLessons).success
      ? run.failedLessons
      : null,
  };
}

/** The caller's own review for the panel (ODY-805); null when not in review. Never opens a review or caches. */
export async function getReviewPanel(
  dropletId: number,
): Promise<ReviewActionResult<ReviewPanelData | null>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const parsedId = idSchema.safeParse(dropletId);
      if (!parsedId.success) {
        return { ok: false, error: "invalid_input", data: null };
      }

      const droplets = await fetchAPI<
        (DropletForReview & { lessons?: PanelLesson[] | null })[] | null
      >("/droplets", {
        urlParams: {
          filters: { id: { $eq: parsedId.data } },
          fields: ["inReview", "reviewRound"],
          populate: {
            ...AUTHORS_POPULATE,
            lessons: {
              fields: ["blocksVersion", "blocksV2"],
              sort: ["orderIndex:asc"],
            },
          },
          pagination: { pageSize: 1 },
        },
        cache: "no-store",
      });
      const droplet = droplets?.[0];
      if (!droplet) return { ok: false, error: "not_found", data: null };
      if (isOwnDroplet(droplet, user)) {
        return { ok: false, error: "forbidden", data: null };
      }
      const round = droplet.reviewRound ?? 0;
      if (round < 1 || !droplet.inReview) {
        return { ok: true, error: null, data: null };
      }

      const [review, criteria] = await Promise.all([
        findReviewByKey(`${droplet.id}:${user.id}:${round}`),
        fetchAPI<PanelCriterion[] | null>("/review-criteria", {
          urlParams: {
            filters: { active: { $eq: true } },
            fields: [
              "name",
              "order",
              "active",
              "lessonDescription",
              "overallDescription",
            ],
            sort: ["order:asc"],
            pagination: { pageSize: 100 },
          },
          cache: "no-store",
        }),
      ]);
      const base = { criteria: criteria ?? [] };
      if (!review) {
        const empty = { ...base, review: null, scores: [], latestRun: null };
        return { ok: true, error: null, data: { ...empty, positions: {} } };
      }

      const [rows, comments, runs] = await Promise.all([
        fetchAllPages<ReviewScore & { aiFindings?: AiFinding[] | null }>(
          "/review-scores",
          {
            filters: { review: { id: { $eq: review.id } } },
            fields: [
              "criterionName",
              "value",
              "aiValue",
              "aiRationale",
              "aiFindings",
              "key",
            ],
            sort: ["id:asc"],
          },
          droplet.id,
          true,
        ),
        fetchComments(review.id, droplet.id, true),
        fetchAPI<PanelRunData[] | null>("/ai-scoring-runs", {
          urlParams: {
            filters: { review: { id: { $eq: review.id } } },
            fields: [
              "runState",
              "progress",
              "failedLessons",
              "startedAt",
              "finishedAt",
              "error",
            ],
            sort: ["id:desc"],
            pagination: { pageSize: 1 },
          },
          cache: "no-store",
        }),
      ]);

      const scores = rows.map((row) => ({
        id: row.id,
        key: row.key,
        criterionName: row.criterionName,
        ...parseScoreKey(row.key),
        value: row.value ?? null,
        aiValue: row.aiValue ?? null,
        aiRationale: row.aiRationale ?? null,
        aiFindings: Array.isArray(row.aiFindings)
          ? row.aiFindings.filter((f) => aiFindingSchema.safeParse(f).success)
          : null,
      }));

      const contents: Record<number, AnchorBlock[]> = {};
      for (const lesson of droplet.lessons ?? []) {
        if (lesson.blocksVersion === "v2" && Array.isArray(lesson.blocksV2)) {
          contents[lesson.id] = blockNoteContent(lesson.blocksV2);
        }
      }
      const items: PositionItem[] = [
        ...comments.map((c) => ({
          key: `c${c.id}`,
          lessonId: c.lesson?.id ?? null,
          anchor: c.anchor,
        })),
        ...scores.flatMap((s) =>
          (s.aiFindings ?? []).map((f) => ({
            key: `f${f.id}`,
            lessonId: f.lessonId ?? s.lessonId,
            anchor: f.anchor,
          })),
        ),
      ];

      return {
        ok: true,
        error: null,
        data: {
          ...base,
          review: { id: review.id, round: review.round, state: review.state },
          scores,
          latestRun: cleanRun(runs?.[0]),
          positions: computePositions(items, contents),
        },
      };
    } catch (error) {
      console.error("getReviewPanel failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Latest review with comments and scores: any state for reviewers, sent/published for authors. */
export async function getReviewForDroplet(
  dropletId: number,
): Promise<ReviewActionResult<Review | null>> {
  return withAuth([], async (user) => {
    try {
      const parsedId = idSchema.safeParse(dropletId);
      if (!parsedId.success) {
        return { ok: false, error: "invalid_input", data: null };
      }
      const id = parsedId.data;

      const droplets = await fetchAPI<
        { id: number; authorized_users?: { id: number }[] | null }[] | null
      >("/droplets", {
        urlParams: {
          filters: { id: { $eq: id } },
          populate: { authorized_users: { fields: ["id"] } },
          pagination: { pageSize: 1 },
        },
        cache: "no-store",
      });
      const owner = assertOwner(
        droplets?.[0]?.authorized_users?.map((u) => u.id),
        user,
        { bypassRoles: [] },
      );
      // No author reviews their own droplet, whatever their role.
      const isReviewer = isReviewerFor(user.roles, true, owner.ok);
      if (!isReviewer && !owner.ok) {
        return { ok: false, error: owner.error, data: null };
      }

      const reviews = await fetchAPI<Review[] | null>("/reviews", {
        urlParams: {
          filters: {
            droplet: { id: { $eq: id } },
            ...(!isReviewer && { state: { $in: ["sent", "published"] } }),
          },
          fields: REVIEW_FIELDS,
          populate: { reviewer: { fields: ["firstName", "lastName"] } },
          sort: ["round:desc", "id:desc"],
          pagination: { pageSize: 1 },
        },
        next: { tags: [CACHE_TAGS.review(id)], revalidate: 900 },
      });
      const review = reviews?.[0];
      if (!review) return { ok: true, error: null, data: null };

      const [comments, scores] = await Promise.all([
        fetchComments(review.id, id),
        fetchAllPages<ReviewScore>(
          "/review-scores",
          {
            filters: {
              review: { id: { $eq: review.id } },
              ...(!isReviewer && { value: { $notNull: true } }),
            },
            // Authors never request AI fields; they are nulled below.
            fields: isReviewer
              ? [
                  "criterionName",
                  "value",
                  "aiValue",
                  "aiRationale",
                  "aiFindings",
                  "key",
                ]
              : ["criterionName", "value", "key"],
            populate: {
              lesson: { fields: ["name"] },
              criterion: { fields: ["name", "order"] },
            },
            sort: ["id:asc"],
          },
          id,
        ),
      ]);

      const safeScores = isReviewer
        ? scores
        : scores.map((s) => ({
            ...s,
            aiValue: null,
            aiRationale: null,
            aiFindings: null,
          }));
      return {
        ok: true,
        error: null,
        data: { ...review, comments, scores: safeScores },
      };
    } catch (error) {
      console.error("getReviewForDroplet failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

const SUMMARY_NOTE_MAX = 5000;
const summaryNoteSchema = z.string().max(SUMMARY_NOTE_MAX).nullish();

type WorkflowAction =
  | "submit-review"
  | "withdraw-review"
  | "send-feedback"
  | "publish-review";

type WorkflowResponse =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { kind: "ok"; data: any }
  | { kind: "error"; error: ReviewActionError; message: string | null };

/** One POST to a review-workflow route, mapped to a result. Flushes caches when the write may have landed. */
async function postDropletWorkflow(
  documentId: string,
  action: WorkflowAction,
  body: object,
  revalidate: () => void,
): Promise<WorkflowResponse> {
  const safeDocumentId = encodeURIComponent(documentId);
  try {
    const response = await fetch(
      `${NEXT_PUBLIC_STRAPI_API_URL}/api/droplets/${safeDocumentId}/${action}`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STRAPI_ACCESS_TOKEN}`,
          ...STRAPI_RESPONSE_FORMAT_HEADER,
        },
        body: JSON.stringify(body),
      },
    );
    const json = await readJsonOrNull(response);
    // A 4xx wrote nothing; success and server errors may have committed.
    if (response.ok || response.status >= 500) revalidate();
    if (response.ok) return { kind: "ok", data: json?.data ?? null };

    const message: string | null = json?.error?.message ?? null;
    const status = response.status;
    const error: ReviewActionError =
      status === 400
        ? "invalid_input"
        : status === 404
          ? "not_found"
          : status === 409
            ? "conflict"
            : status >= 500
              ? message
                ? "failed"
                : "unconfirmed"
              : "failed";
    return { kind: "error", error, message };
  } catch (error) {
    // The request may have committed before the connection failed.
    console.error(`${action} failed`, error);
    revalidate();
    return { kind: "error", error: "unconfirmed", message: null };
  }
}

type WorkflowDroplet = NonNullable<
  Awaited<ReturnType<typeof loadDropletForWrite>>
>;

/** Reads the droplet fresh and checks the caller's part (author, or reviewer) before any POST. */
async function loadForWorkflow(
  dropletId: number,
  user: AuthUser,
  who: "author" | "reviewer",
): Promise<
  | { ok: true; droplet: WorkflowDroplet; documentId: string }
  | { ok: false; error: ReviewActionError }
> {
  const parsed = idSchema.safeParse(dropletId);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const droplet = await loadDropletForWrite(parsed.data);
  if (!droplet?.documentId) return { ok: false, error: "not_found" };
  const isAuthor = assertOwner(droplet.ownerIds, user, {
    bypassRoles: [],
  }).ok;
  const allowed =
    who === "author" ? isAuthor : isReviewerFor(user.roles, true, isAuthor);
  if (!allowed) return { ok: false, error: "forbidden" };
  return { ok: true, droplet, documentId: droplet.documentId };
}

function toResult<T>(
  response: WorkflowResponse,
  map: (data: Record<string, any>) => T, // eslint-disable-line @typescript-eslint/no-explicit-any
): ReviewActionResult<T> {
  return response.kind === "ok"
    ? { ok: true, error: null, data: map(response.data ?? {}) }
    : {
        ok: false,
        error: response.error,
        data: null,
        message: response.message,
      };
}

function revalidateDropletReview(dropletId: number, announce = false) {
  revalidateTag(CACHE_TAGS.droplets);
  revalidateTag(CACHE_TAGS.allUserContent);
  revalidateTag(CACHE_TAGS.review(dropletId));
  if (announce) revalidateTag(CACHE_TAGS.announcements);
}

/** Puts the caller's own droplet in review. A repeat call is a success with `changed: false`. */
export async function submitForReview(
  dropletId: number,
): Promise<ReviewActionResult<{ changed: boolean; round: number }>> {
  return withAuth([], async (user) => {
    try {
      const loaded = await loadForWorkflow(dropletId, user, "author");
      if (!loaded.ok) return { ok: false, error: loaded.error, data: null };
      const id = loaded.droplet.id;
      const response = await postDropletWorkflow(
        loaded.documentId,
        "submit-review",
        {},
        () => revalidateDropletReview(id),
      );
      return toResult(response, (d) => ({
        changed: d.changed !== false,
        round: Number(d.round ?? 0),
      }));
    } catch (error) {
      console.error("submitForReview failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Takes the caller's own droplet out of review. A repeat call is a success with `changed: false`. */
export async function withdrawFromReview(
  dropletId: number,
): Promise<ReviewActionResult<{ changed: boolean }>> {
  return withAuth([], async (user) => {
    try {
      const loaded = await loadForWorkflow(dropletId, user, "author");
      if (!loaded.ok) return { ok: false, error: loaded.error, data: null };
      const id = loaded.droplet.id;
      const response = await postDropletWorkflow(
        loaded.documentId,
        "withdraw-review",
        {},
        () => revalidateDropletReview(id),
      );
      return toResult(response, (d) => ({ changed: d.changed !== false }));
    } catch (error) {
      console.error("withdrawFromReview failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Sends the caller's open review back to the authors, with an optional summary note. */
export async function sendFeedback(
  dropletId: number,
  summaryNote?: string | null,
): Promise<ReviewActionResult<{ reviewId: number }>> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const note = summaryNoteSchema.safeParse(summaryNote);
      if (!note.success) {
        return { ok: false, error: "invalid_input", data: null };
      }
      const loaded = await loadForWorkflow(dropletId, user, "reviewer");
      if (!loaded.ok) return { ok: false, error: loaded.error, data: null };
      const id = loaded.droplet.id;
      const response = await postDropletWorkflow(
        loaded.documentId,
        "send-feedback",
        {
          reviewerId: user.id,
          ...(note.data != null &&
            note.data !== "" && { summaryNote: note.data }),
        },
        () => revalidateDropletReview(id, true),
      );
      return toResult(response, (d) => ({ reviewId: Number(d.reviewId) }));
    } catch (error) {
      console.error("sendFeedback failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}

/** Publishes a droplet in review with the caller's own review, in one Strapi transaction. */
export async function publishWithReview(dropletId: number): Promise<
  ReviewActionResult<{
    slug: string | null;
    reviewId: number;
    dropletId: number;
  }>
> {
  return withAuth(REVIEWER_ROLES, async (user) => {
    try {
      const loaded = await loadForWorkflow(dropletId, user, "reviewer");
      if (!loaded.ok) return { ok: false, error: loaded.error, data: null };
      const draftId = loaded.droplet.id;
      const originalId = loaded.droplet.originalDropletId;
      const response = await postDropletWorkflow(
        loaded.documentId,
        "publish-review",
        { reviewerId: user.id, originalDropletId: originalId },
        () => {
          revalidatePublishedEdit();
          revalidateTag(CACHE_TAGS.review(draftId));
          revalidateTag(CACHE_TAGS.review(originalId ?? draftId));
          revalidateTag(CACHE_TAGS.announcements);
        },
      );
      return toResult(response, (d) => ({
        slug: d.slug ?? null,
        reviewId: Number(d.reviewId),
        dropletId: Number(d.dropletId),
      }));
    } catch (error) {
      console.error("publishWithReview failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}
