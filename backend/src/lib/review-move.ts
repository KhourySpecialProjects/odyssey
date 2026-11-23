// Type-only: keeps review-move free of a runtime cycle with publish-edit.
import type { PublishEditContext } from './publish-edit';

const REVIEW_UID = 'api::review.review';
const REVIEW_COMMENT_UID = 'api::review-comment.review-comment';
const REVIEW_SCORE_UID = 'api::review-score.review-score';
const LESSON_UID = 'api::lesson.lesson';

type Row = Record<string, any>;

/**
 * Moves every review of the draft onto the live droplet, with its comments and scores.
 * Runs inside the publish transaction; errors propagate so the whole publish rolls back.
 */
export async function moveReviewsToLive(
  ctx: PublishEditContext,
  lessonMap: Map<number, number>,
  opts: { publishReviewId?: number } = {},
): Promise<void> {
  if (!strapi.db.inTransaction()) {
    throw new Error('moveReviewsToLive must run inside strapi.db.transaction()');
  }
  const reviews = (await strapi.documents(REVIEW_UID).findMany({
    filters: { droplet: { id: ctx.draft.id } },
    fields: ['id'],
  })) as Row[];
  if (reviews.length === 0) return;

  const liveLessons = (await strapi.documents(LESSON_UID).findMany({
    filters: { id: { $in: [...new Set(lessonMap.values())] } },
    fields: ['id'],
  })) as Row[];
  const liveDocumentId = new Map<number, string>(
    liveLessons.map((l) => [l.id, l.documentId]),
  );
  const live = (draftLessonId: number | undefined) => {
    const liveId =
      draftLessonId === undefined ? undefined : lessonMap.get(draftLessonId);
    return liveId === undefined
      ? undefined
      : { id: liveId, documentId: liveDocumentId.get(liveId)! };
  };

  for (const review of reviews) {
    await strapi.documents(REVIEW_UID).update({
      documentId: review.documentId,
      data: {
        droplet: ctx.original.documentId,
        ...(review.id === opts.publishReviewId ? { state: 'published' } : {}),
      } as any,
    });

    const comments = (await strapi.documents(REVIEW_COMMENT_UID).findMany({
      filters: { review: { id: review.id }, lesson: { id: { $notNull: true } } },
      populate: { lesson: { fields: ['id'] } },
    } as any)) as Row[];
    for (const comment of comments) {
      const target = live(comment.lesson?.id);
      if (!target) continue;
      await strapi.documents(REVIEW_COMMENT_UID).update({
        documentId: comment.documentId,
        data: { lesson: target.documentId } as any,
      });
    }

    const scores = (await strapi.documents(REVIEW_SCORE_UID).findMany({
      filters: { review: { id: review.id }, lesson: { id: { $notNull: true } } },
      populate: { lesson: { fields: ['id'] } },
    } as any)) as Row[];
    for (const score of scores) {
      const target = live(score.lesson?.id);
      if (!target) continue;
      const criterionId = String(score.key).split(':')[2];
      await strapi.documents(REVIEW_SCORE_UID).update({
        documentId: score.documentId,
        data: {
          lesson: target.documentId,
          key: `${review.id}:${target.id}:${criterionId}`,
        } as any,
      });
    }
  }
}
