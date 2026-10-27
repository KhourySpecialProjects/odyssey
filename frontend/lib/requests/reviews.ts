"use server";

import { z } from "zod";
import type { Review, ReviewComment, ReviewScore } from "@/types";
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
  reviewCommentBodySchema,
  reviewCommentInputSchema,
  type ReviewCommentInput,
} from "@/lib/validations/review";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

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
  | "failed";

export type ReviewActionResult<T> =
  | { ok: true; error: null; data: T }
  | { ok: false; error: ReviewActionError; data: null };

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

      const droplets = await fetchAPI<
        | {
            id: number;
            documentId: string;
            inReview?: boolean | null;
            reviewRound?: number | null;
          }[]
        | null
      >("/droplets", {
        urlParams: {
          filters: { id: { $eq: parsedId.data } },
          fields: ["inReview", "reviewRound"],
          pagination: { pageSize: 1 },
        },
        cache: "no-store",
      });
      const droplet = droplets?.[0];
      if (!droplet) return { ok: false, error: "not_found", data: null };

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
  droplet: { id: number } | null;
  reviewer: { id: number } | null;
};

type CommentForWrite = {
  id: number;
  documentId: string;
  author: { id: number } | null;
  review: { state: string; droplet: { id: number } | null } | null;
};

/** Looks a review up by id, never from cache. */
async function findReviewById(id: number): Promise<ReviewForWrite | null> {
  const rows = await fetchAPI<ReviewForWrite[] | null>("/reviews", {
    urlParams: {
      filters: { id: { $eq: id } },
      fields: ["state"],
      populate: { droplet: { fields: ["id"] }, reviewer: { fields: ["id"] } },
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
          populate: { droplet: { fields: ["id"] } },
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

/** Fetches a comment and checks its review is open (and the author, if `ownOnly`). */
async function loadWritableComment(
  id: number,
  user: AuthUser,
  { ownOnly }: { ownOnly: boolean },
): Promise<WritableComment> {
  const comment = await findCommentById(id);
  const dropletId = comment?.review?.droplet?.id;
  if (!comment || !comment.review || dropletId == null) {
    return { ok: false, error: "not_found" };
  }
  if (comment.review.state !== "open") {
    return { ok: false, error: "review_closed" };
  }
  if (
    ownOnly &&
    !assertOwner(comment.author?.id, user, { bypassRoles: [] }).ok
  ) {
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, comment, dropletId };
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
      if (!assertOwner(review.reviewer?.id, user, { bypassRoles: [] }).ok) {
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

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Reads every page of a list, tagged for the droplet's review data. */
async function fetchAllPages<T>(
  path: string,
  urlParams: Record<string, unknown>,
  dropletId: number,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const rows = await fetchAPI<T[] | null>(path, {
      urlParams: { ...urlParams, pagination: { page, pageSize: PAGE_SIZE } },
      next: { tags: [CACHE_TAGS.review(dropletId)], revalidate: 900 },
    });
    if (!rows || rows.length === 0) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return all;
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

      const isReviewer = user.roles.some((r) => REVIEWER_ROLES.includes(r));
      if (!isReviewer) {
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
        if (!owner.ok) return { ok: false, error: owner.error, data: null };
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
        fetchAllPages<ReviewComment>(
          "/review-comments",
          {
            filters: { review: { id: { $eq: review.id } } },
            fields: ["field", "anchor", "body", "resolvedAt", "createdAt"],
            populate: {
              lesson: { fields: ["name"] },
              author: { fields: ["firstName", "lastName"] },
            },
            sort: ["id:asc"],
          },
          id,
        ),
        fetchAllPages<ReviewScore>(
          "/review-scores",
          {
            filters: { review: { id: { $eq: review.id } } },
            fields: ["criterionName", "value", "aiValue", "aiRationale", "key"],
            populate: {
              lesson: { fields: ["name"] },
              criterion: { fields: ["name", "order"] },
            },
            sort: ["id:asc"],
          },
          id,
        ),
      ]);

      return { ok: true, error: null, data: { ...review, comments, scores } };
    } catch (error) {
      console.error("getReviewForDroplet failed", error);
      return { ok: false, error: "failed", data: null };
    }
  });
}
