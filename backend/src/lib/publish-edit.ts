import { randomUUID } from 'node:crypto';
import {
  planLessonSync,
  type LessonSyncPlan,
  type SyncableLesson,
} from './lesson-sync';

export const DROPLET_UID = 'api::droplet.droplet';
export const LESSON_UID = 'api::lesson.lesson';
export const ENROLLMENT_UID = 'api::enrollment.enrollment';

/** Document Service populate for a lesson's blocks: one `on` fragment per dynamic-zone component. */
export const LESSON_BLOCKS_POPULATE = {
  blocks: {
    on: {
      'droplets.generic': true,
      'droplets.video': true,
      'droplets.callout': true,
      'droplets.expandable': true,
      'droplets.quiz': {
        populate: { questions: { populate: ['answerOptions'] } },
      },
      'droplets.open-ended-quiz': { populate: ['questions'] },
    },
  },
};

/** Per-call unique slug: uid validation runs before beforeCreate swaps in the real one. */
const slugPlaceholder = () => `publish-${randomUUID()}`;

/** Shown for a missing draft, by the guard and by the controller for a bad `:id`. */
export const DRAFT_GONE_MESSAGE =
  'This draft no longer exists. It may already have been published.';

function assertInTransaction(step: string): void {
  if (!strapi.db.inTransaction()) {
    throw new Error(`${step} must run inside strapi.db.transaction()`);
  }
}

/** A guard failure the controller maps to its HTTP status. */
export class PublishEditError extends Error {
  status: 400 | 404 | 409;

  constructor(status: 400 | 404 | 409, message: string) {
    super(message);
    this.name = 'PublishEditError';
    this.status = status;
  }
}

export type DraftRef = { id: number } | { documentId: string };

type Row = Record<string, any>;

export type PublishEditContext = {
  draft: Row;
  original: Row;
  plan: LessonSyncPlan;
  draftLessons: Row[];
  enrollmentDocumentIds: string[];
};

export type PublishEditSummary = {
  slug: string;
  originalDropletId: number;
  lessons: {
    updated: number;
    unchanged: number;
    created: number;
    deleted: number;
  };
  enrollmentsMoved: number;
};

const lessonsPopulate = {
  sort: ['orderIndex:asc'],
  populate: { ...LESSON_BLOCKS_POPULATE, droplets: { fields: ['id'] } },
};

/** Locks a droplet row until the transaction ends (no-op on SQLite). */
async function lockDroplet(id: number): Promise<void> {
  await strapi.db
    .queryBuilder(DROPLET_UID)
    .select(['id'])
    .where({ id })
    .forUpdate()
    .first()
    .execute();
}

/** Adds the lesson name to an error without changing its class, so a ValidationError stays one. */
function annotate(err: unknown, lessonName: string): unknown {
  if (err instanceof Error)
    err.message = `lesson "${lessonName}": ${err.message}`;
  return err;
}

/** Locks, reads and guards, then plans. Must run inside a transaction. */
export async function preparePublishEdit(input: {
  draft: DraftRef;
  originalDropletId: number;
}): Promise<PublishEditContext> {
  assertInTransaction('preparePublishEdit');
  const gone = () => new PublishEditError(404, DRAFT_GONE_MESSAGE);

  const found = await strapi.documents(DROPLET_UID).findFirst({
    filters: input.draft,
    fields: ['id'],
  });
  if (!found) throw gone();

  // Lock order is always draft, then original.
  await lockDroplet(Number(found.id));
  await lockDroplet(input.originalDropletId);

  // Re-read after the lock: a concurrent publish may have deleted the draft meanwhile.
  const draft = (await strapi.documents(DROPLET_UID).findFirst({
    filters: { id: found.id },
    populate: {
      tags: { fields: ['id'] },
      prerequisites: { fields: ['id'] },
      postrequisites: { fields: ['id'] },
      learningObjectives: true,
      nextSteps: true,
      lessons: lessonsPopulate,
    },
  } as any)) as Row | null;
  if (!draft) throw gone();

  if (draft.id === input.originalDropletId) {
    throw new PublishEditError(
      409,
      'A droplet cannot be published over itself.',
    );
  }
  if (draft.originalDropletId == null) {
    throw new PublishEditError(
      409,
      'This droplet is not an edit of a published droplet.',
    );
  }
  if (draft.originalDropletId !== input.originalDropletId) {
    throw new PublishEditError(
      409,
      'This draft was made from a different droplet.',
    );
  }
  if (draft.status === 'published') {
    throw new PublishEditError(409, 'This draft has already been published.');
  }

  const original = (await strapi.documents(DROPLET_UID).findFirst({
    filters: { id: input.originalDropletId },
    populate: { lessons: lessonsPopulate },
  } as any)) as Row | null;
  if (!original)
    throw new PublishEditError(404, 'The original droplet no longer exists.');

  if (draft.difficulty == null) {
    throw new PublishEditError(
      400,
      'Draft droplet is missing a difficulty. Set it in the editor before publishing.',
    );
  }

  const draftLessons: Row[] = draft.lessons ?? [];
  const originalLessons: Row[] = original.lessons ?? [];
  if (draftLessons.length === 0 && originalLessons.length > 0) {
    throw new PublishEditError(
      400,
      'This draft has no lessons. Add at least one lesson before publishing.',
    );
  }

  const plan = planLessonSync(
    draftLessons as SyncableLesson[],
    originalLessons as SyncableLesson[],
  );
  const emptied = plan.updates.find(
    (update) =>
      Array.isArray(update.changes.blocks) &&
      update.changes.blocks.length === 0,
  );
  if (emptied) {
    throw new PublishEditError(
      400,
      `Lesson "${emptied.name}" has no content. Add content or delete the lesson before publishing.`,
    );
  }

  const enrollments = await strapi.documents(ENROLLMENT_UID).findMany({
    filters: { droplet: { id: draft.id } },
    fields: ['id'],
  });

  return {
    draft,
    original,
    plan,
    draftLessons,
    enrollmentDocumentIds: enrollments.map((e) => e.documentId),
  };
}

/** The original droplet's update body. An empty draft list leaves the live list as is (Q3). */
function dropletUpdateData(draft: Row): Row {
  const ids = (list?: Row[]) => (list ?? []).map((item) => item.documentId);
  const data: Row = {
    name: String(draft.name).replace(/^\[EDIT\]\s*/i, ''),
    status: 'published',
    difficulty: draft.difficulty || null,
  };
  if (draft.focusArea) data.focusArea = draft.focusArea;
  if (draft.type) data.type = draft.type;
  if (draft.description !== undefined) data.description = draft.description;
  if (draft.overview !== undefined) data.overview = draft.overview;
  for (const key of ['tags', 'prerequisites', 'postrequisites']) {
    if (draft[key]?.length > 0) data[key] = { set: ids(draft[key]) };
  }
  if (draft.learningObjectives?.length > 0) {
    data.learningObjectives = draft.learningObjectives.map((o: Row) => ({
      objective: o.objective,
    }));
  }
  if (draft.nextSteps?.length > 0) {
    data.nextSteps = draft.nextSteps.map(({ id, ...step }: Row) => step);
  }
  return data;
}

/** Writes the original droplet, its lessons and the enrollment moves, sequentially. */
export async function applyPublishEdit(ctx: PublishEditContext): Promise<{
  lessonMap: Map<number, number>;
  counts: PublishEditSummary['lessons'] & { enrollmentsMoved: number };
}> {
  assertInTransaction('applyPublishEdit');
  const { draft, original, plan, enrollmentDocumentIds } = ctx;
  const liveDocumentId = new Map<number, string>(
    (original.lessons ?? []).map((l: Row) => [l.id, l.documentId]),
  );
  const lessonMap = new Map<number, number>();

  await strapi.documents(DROPLET_UID).update({
    documentId: original.documentId,
    data: dropletUpdateData(draft),
  });

  for (const update of plan.updates) {
    try {
      await strapi.documents(LESSON_UID).update({
        documentId: liveDocumentId.get(update.liveLessonId)!,
        data: update.changes as any,
      });
    } catch (err) {
      throw annotate(err, update.name);
    }
    lessonMap.set(update.draftLessonId, update.liveLessonId);
  }
  for (const kept of plan.unchanged)
    lessonMap.set(kept.draftLessonId, kept.liveLessonId);

  for (const create of plan.creates) {
    try {
      const created = await strapi.documents(LESSON_UID).create({
        data: {
          ...create.data,
          slug: slugPlaceholder(),
          droplets: [original.documentId],
        } as any,
      });
      lessonMap.set(create.draftLessonId, Number(created.id));
    } catch (err) {
      throw annotate(err, create.name);
    }
  }

  for (const del of plan.deletes) {
    try {
      await strapi.documents(LESSON_UID).delete({
        documentId: liveDocumentId.get(del.liveLessonId)!,
      });
    } catch (err) {
      throw annotate(err, del.name);
    }
  }

  for (const documentId of enrollmentDocumentIds) {
    await strapi.documents(ENROLLMENT_UID).update({
      documentId,
      data: { droplet: original.documentId } as any,
    });
  }

  return {
    lessonMap,
    counts: {
      updated: plan.updates.length,
      unchanged: plan.unchanged.length,
      created: plan.creates.length,
      deleted: plan.deletes.length,
      enrollmentsMoved: enrollmentDocumentIds.length,
    },
  };
}

/** Deletes the draft's own lessons (never one shared with another droplet), then the draft. */
export async function deleteEditDraft(ctx: PublishEditContext): Promise<void> {
  assertInTransaction('deleteEditDraft');
  const { draft, draftLessons } = ctx;
  for (const lesson of draftLessons) {
    const sharedElsewhere = (lesson.droplets ?? []).some(
      (d: Row) => d.id !== draft.id,
    );
    if (!sharedElsewhere) {
      await strapi
        .documents(LESSON_UID)
        .delete({ documentId: lesson.documentId });
    }
  }
  await strapi.documents(DROPLET_UID).delete({ documentId: draft.documentId });
}

/** Publishes an [EDIT] draft over its original in one transaction. */
export async function publishEdit(input: {
  draft: DraftRef;
  originalDropletId: number;
}): Promise<PublishEditSummary> {
  return strapi.db.transaction(async () => {
    const ctx = await preparePublishEdit(input);
    const { counts } = await applyPublishEdit(ctx);
    await deleteEditDraft(ctx);
    const { enrollmentsMoved, ...lessons } = counts;
    return {
      slug: ctx.original.slug,
      originalDropletId: ctx.original.id,
      lessons,
      enrollmentsMoved,
    };
  });
}
