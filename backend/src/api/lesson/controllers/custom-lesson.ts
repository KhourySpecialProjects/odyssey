import type { Core } from "@strapi/strapi";

const LOCK_TIMEOUT_MS = 60_000; // 60 seconds — lock expires if no heartbeat

function isLockStale(lockedAt: string | null): boolean {
  if (!lockedAt) return true;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
}

type LessonWithLock = {
  id: number;
  documentId: string;
  lockedAt: string | null;
  lockedBy: { id: number; firstName: string; lastName: string } | null;
};

function getStrapi(): Core.Strapi {
  return (global as unknown as { strapi: Core.Strapi }).strapi;
}

// The route's `:id` is either the numeric row id (what the frontend still
// sends) or a documentId, so the frontend can switch to documentIds later.
type LessonFilter = { id: number } | { documentId: string };

function parseLessonRef(ref: unknown): LessonFilter | null {
  if (typeof ref !== "string") return null;
  if (/^\d+$/.test(ref)) return { id: Number(ref) };
  if (/^[A-Za-z0-9]+$/.test(ref)) return { documentId: ref };
  return null;
}

async function findLessonWithLock(
  ref: unknown
): Promise<LessonWithLock | null> {
  const filters = parseLessonRef(ref);
  if (!filters) return null;

  const lesson = (await getStrapi()
    .documents("api::lesson.lesson")
    .findFirst({
      filters,
      fields: ["lockedAt"],
      populate: { lockedBy: { fields: ["id", "firstName", "lastName"] } },
    })) as unknown as LessonWithLock | null;
  if (!lesson) return null;

  // v5 adds documentId to every populated entry. Keep the REST contract the
  // frontend has always seen: lockedBy is exactly { id, firstName, lastName }.
  return {
    ...lesson,
    lockedBy: lesson.lockedBy
      ? {
          id: lesson.lockedBy.id,
          firstName: lesson.lockedBy.firstName,
          lastName: lesson.lockedBy.lastName,
        }
      : null,
  };
}

export default {
  async acquireLock(ctx) {
    const { id } = ctx.params;
    // NOTE: userId comes from the request body because Strapi receives
    // a service-role token, not the end-user JWT — `ctx.state.user` is
    // the service account, not the real user. The trust boundary is
    // enforced in the Next.js Server Action layer, which resolves the
    // userId from the authenticated session before calling this route
    // (see frontend/lib/requests/lesson-lock.ts).
    const userId = Number((ctx.request.body ?? {}).userId);

    if (!userId || Number.isNaN(userId)) {
      return ctx.badRequest("userId is required and must be a number");
    }

    // Atomic compare-and-swap via a serialized database transaction.
    // strapi.db.transaction() wraps the callback in a Knex transaction:
    // — queries through strapi.db.query() inside the callback automatically
    //   participate via the async-storage transaction context;
    // — the transaction commits on return and rolls back on throw.
    //
    // This eliminates the TOCTOU race where two concurrent POST /lock calls
    // could both pass the "is it locked?" check before either writes.
    // Reference: @strapi/database/dist/index.js — Database.transaction()
    // and transactionCtx (async-local-storage based transaction propagation).
    //
    // This stays on the Query Engine (strapi.db.query), which is not
    // deprecated: the Document Service has no transaction-aware
    // compare-and-swap. `:id` may be a documentId, which the Query Engine
    // filters on directly.
    const where = parseLessonRef(id);
    if (!where) return ctx.notFound("Lesson not found");

    try {
      const result = await getStrapi().db.transaction(async () => {
        // Re-fetch inside the transaction. Because transactionCtx is active,
        // strapi.db.query() calls here run within the same Knex transaction.
        const lesson = (await getStrapi()
          .db.query("api::lesson.lesson")
          .findOne({
            where,
            populate: { lockedBy: true },
          })) as LessonWithLock | null;

        if (!lesson) return { status: 404 as const };

        const currentHolder = lesson.lockedBy?.id ?? null;
        const lockedAt = lesson.lockedAt ?? null;
        const stale = isLockStale(lockedAt);

        if (currentHolder && currentHolder !== userId && !stale) {
          return {
            status: 409 as const,
            lockedBy: lesson.lockedBy,
            lockedAt,
          };
        }

        await getStrapi().db.query("api::lesson.lesson").update({
          where: { id: lesson.id },
          data: { lockedBy: userId, lockedAt: new Date().toISOString() },
        });

        return { status: 200 as const };
      });

      if (result.status === 404) return ctx.notFound("Lesson not found");
      if (result.status === 409) {
        ctx.status = 409;
        ctx.body = {
          error: "Lesson is locked",
          lockedBy: (result as { lockedBy: unknown }).lockedBy,
          lockedAt: (result as { lockedAt: string | null }).lockedAt,
        };
        return;
      }

      ctx.body = { locked: true, lockedBy: userId };
    } catch (err) {
      getStrapi().log.error("acquireLock transaction failed", err);
      return ctx.internalServerError("Failed to acquire lock");
    }
  },

  async releaseLock(ctx) {
    const { id } = ctx.params;
    // NOTE: userId comes from the request body because Strapi receives
    // a service-role token, not the end-user JWT — `ctx.state.user` is
    // the service account, not the real user. The trust boundary is
    // enforced in the Next.js Server Action layer, which resolves the
    // userId from the authenticated session before calling this route
    // (see frontend/lib/requests/lesson-lock.ts).
    const userId = Number(ctx.query.userId);

    if (!userId) {
      return ctx.badRequest("userId query param is required");
    }

    const lesson = await findLessonWithLock(id);
    if (!lesson) {
      return ctx.notFound("Lesson not found");
    }

    // Only the lock holder can release (or if lock is stale)
    if (
      lesson.lockedBy &&
      lesson.lockedBy.id !== userId &&
      !isLockStale(lesson.lockedAt)
    ) {
      return ctx.forbidden("You do not hold this lock");
    }

    // documents.update runs the entity validator and the lesson beforeUpdate
    // hook. The data has no blocks/blocksV2 and no regenerateSlug, so the hook
    // does nothing here. lockedBy: null clears the relation.
    await getStrapi().documents("api::lesson.lesson").update({
      documentId: lesson.documentId,
      data: { lockedBy: null, lockedAt: null },
    });

    ctx.body = { locked: false };
  },

  async heartbeat(ctx) {
    const { id } = ctx.params;
    // NOTE: userId comes from the request body because Strapi receives
    // a service-role token, not the end-user JWT — `ctx.state.user` is
    // the service account, not the real user. The trust boundary is
    // enforced in the Next.js Server Action layer, which resolves the
    // userId from the authenticated session before calling this route
    // (see frontend/lib/requests/lesson-lock.ts).
    const userId = Number((ctx.request.body ?? {}).userId);

    if (!userId || Number.isNaN(userId)) {
      return ctx.badRequest("userId is required and must be a number");
    }

    const lesson = await findLessonWithLock(id);
    if (!lesson) {
      return ctx.notFound("Lesson not found");
    }

    if (!lesson.lockedBy || lesson.lockedBy.id !== userId) {
      return ctx.forbidden("You do not hold this lock");
    }

    // See releaseLock: the lesson beforeUpdate hook runs and does nothing.
    await getStrapi().documents("api::lesson.lesson").update({
      documentId: lesson.documentId,
      data: { lockedAt: new Date().toISOString() },
    });

    ctx.body = { locked: true };
  },

  async getLockStatus(ctx) {
    const { id } = ctx.params;

    const lesson = await findLessonWithLock(id);
    if (!lesson) {
      return ctx.notFound("Lesson not found");
    }

    const isLocked =
      lesson.lockedBy !== null && !isLockStale(lesson.lockedAt);

    ctx.body = {
      isLocked,
      lockedBy: isLocked ? lesson.lockedBy : null,
      lockedAt: isLocked ? lesson.lockedAt : null,
    };
  },
};
