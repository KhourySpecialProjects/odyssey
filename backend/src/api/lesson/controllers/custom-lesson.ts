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
    const { userId } = ctx.request.body ?? {};

    if (!userId) {
      return ctx.badRequest("userId is required");
    }

    const lesson = await findLessonWithLock(id);
    if (!lesson) {
      return ctx.notFound("Lesson not found");
    }

    // Check if already locked by another user and not stale
    if (
      lesson.lockedBy &&
      lesson.lockedBy.id !== userId &&
      !isLockStale(lesson.lockedAt)
    ) {
      return ctx.conflict({
        error: "Lesson is locked",
        lockedBy: lesson.lockedBy,
        lockedAt: lesson.lockedAt,
      });
    }

    await getStrapi().entityService.update("api::lesson.lesson", id, {
      data: { lockedBy: userId, lockedAt: new Date().toISOString() },
    });

    ctx.body = { locked: true, lockedBy: userId };
  },

  async releaseLock(ctx) {
    const { id } = ctx.params;
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
    const { userId } = ctx.request.body ?? {};

    if (!userId) {
      return ctx.badRequest("userId is required");
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
