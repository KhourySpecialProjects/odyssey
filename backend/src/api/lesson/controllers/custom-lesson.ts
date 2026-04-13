import { Strapi } from "@strapi/strapi";

const LOCK_TIMEOUT_MS = 60_000; // 60 seconds — lock expires if no heartbeat

function isLockStale(lockedAt: string | null): boolean {
  if (!lockedAt) return true;
  return Date.now() - new Date(lockedAt).getTime() > LOCK_TIMEOUT_MS;
}

type LessonWithLock = {
  id: number;
  lockedAt: string | null;
  lockedBy: { id: number; firstName: string; lastName: string } | null;
};

function getStrapi(): Strapi {
  return (global as unknown as { strapi: Strapi }).strapi;
}

async function findLessonWithLock(id: number): Promise<LessonWithLock | null> {
  return (await getStrapi().entityService.findOne(
    "api::lesson.lesson",
    id,
    {
      fields: ["lockedAt"],
      populate: { lockedBy: { fields: ["id", "firstName", "lastName"] } },
    }
  )) as LessonWithLock | null;
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
    try {
      const result = await getStrapi().db.transaction(async () => {
        // Re-fetch inside the transaction. Because transactionCtx is active,
        // strapi.db.query() calls here run within the same Knex transaction.
        const lesson = (await getStrapi()
          .db.query("api::lesson.lesson")
          .findOne({
            where: { id },
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
          where: { id },
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

    await getStrapi().entityService.update("api::lesson.lesson", id, {
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

    await getStrapi().entityService.update("api::lesson.lesson", id, {
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
