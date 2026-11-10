const REVIEW_UID = 'api::review.review';
const SCORE_UID = 'api::review-score.review-score';
const CRITERION_UID = 'api::review-criterion.review-criterion';
const LESSON_UID = 'api::lesson.lesson';

const SCORE_FIELDS = ['key', 'criterionName', 'value', 'aiValue'];

type Row = Record<string, any>;

export class ReviewScoreError extends Error {
  status: 400 | 403 | 404 | 409;

  constructor(status: 400 | 403 | 404 | 409, message: string) {
    super(message);
    this.name = 'ReviewScoreError';
    this.status = status;
  }
}

/** Whose scores, and where: one lesson, or the Overall Score when `lessonId` is null. */
export type ScoreScope = {
  reviewId: number;
  lessonId: number | null;
  userId: number;
};

export type UpsertScoreInput = ScoreScope & {
  criterionId: number;
  value: number;
};

export type UpsertScoreResult = { dropletId: number; score: Row };

export type AcceptAiScoresResult = { dropletId: number; scores: Row[] };

/** `<reviewId>:<lessonId or overall>:<criterionId>`, the score's unique key. */
export const scoreKey = (
  reviewId: number,
  lessonId: number | null,
  criterionId: number,
) => `${reviewId}:${lessonId ?? 'overall'}:${criterionId}`;

const pick = (row: Row): Row => ({
  id: row.id,
  key: row.key,
  criterionName: row.criterionName,
  value: row.value ?? null,
  aiValue: row.aiValue ?? null,
});

/**
 * Locks the review row and reads its state, reviewer and droplet. The lock
 * serializes score writes and AI runs for one review, and holds off a
 * concurrent send. Must run inside a transaction.
 */
export async function lockReview(reviewId: number): Promise<Row> {
  await strapi.db
    .queryBuilder(REVIEW_UID)
    .select(['id'])
    .where({ id: reviewId })
    .forUpdate()
    .first()
    .execute();
  const review = (await strapi.documents(REVIEW_UID).findFirst({
    filters: { id: reviewId },
    fields: ['state'],
    populate: {
      reviewer: { fields: ['id'] },
      droplet: { fields: ['id', 'inReview'] },
    },
  } as any)) as Row | null;
  if (!review?.droplet) throw new ReviewScoreError(404, 'Review not found');
  return review;
}

/** `lockReview`, then checks the caller is its reviewer and it is open. */
export async function lockOpenReview(scope: ScoreScope): Promise<Row> {
  const review = await lockReview(scope.reviewId);
  if (review.reviewer?.id !== scope.userId) {
    throw new ReviewScoreError(403, 'Only the reviewer can score this review');
  }
  if (review.state !== 'open') {
    throw new ReviewScoreError(409, 'This review is no longer open');
  }
  return review;
}

export async function findScore(key: string): Promise<Row | null> {
  return (await strapi
    .documents(SCORE_UID)
    .findFirst({ filters: { key }, fields: SCORE_FIELDS } as any)) as Row | null;
}

/**
 * Runs `fn` once more when it failed because another request created the row
 * with `key` first. The unique index rejects the second insert, and that
 * aborts its transaction (on Postgres no query can follow), so the retry is a
 * whole new transaction, which then finds the row and updates it.
 */
async function retryIfKeyTaken<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ReviewScoreError || !(await findScore(key))) throw err;
    return fn();
  }
}

/** Refuses (400) a lesson that isn't part of the review's droplet; null (Overall) passes. */
async function assertLessonInDroplet(
  lessonId: number | null,
  dropletId: unknown,
): Promise<void> {
  if (lessonId === null) return;
  const lesson = await strapi.documents(LESSON_UID).findFirst({
    filters: { id: lessonId, droplets: { id: dropletId } },
    fields: ['id'],
  } as any);
  if (!lesson) {
    throw new ReviewScoreError(
      400,
      "This lesson is not part of the review's droplet",
    );
  }
}

/** Sets the reviewer's `value` for one criterion, creating the score row if needed. Never touches `aiValue`. */
export async function upsertReviewScore(
  input: UpsertScoreInput,
): Promise<UpsertScoreResult> {
  const key = scoreKey(input.reviewId, input.lessonId, input.criterionId);

  return retryIfKeyTaken(key, () =>
    strapi.db.transaction(async () => {
      const review = await lockOpenReview(input);

      const criterion = (await strapi.documents(CRITERION_UID).findFirst({
        filters: { id: input.criterionId },
        fields: ['name', 'active'],
      })) as Row | null;
      if (!criterion) throw new ReviewScoreError(400, 'Criterion not found');
      if (!criterion.active) {
        throw new ReviewScoreError(400, 'This criterion is not active');
      }

      let lesson: Row | null = null;
      if (input.lessonId !== null) {
        lesson = (await strapi.documents(LESSON_UID).findFirst({
          filters: {
            id: input.lessonId,
            droplets: { id: review.droplet.id },
          },
          fields: ['id'],
        } as any)) as Row | null;
        if (!lesson) {
          throw new ReviewScoreError(
            400,
            "This lesson is not part of the review's droplet",
          );
        }
      }

      const existing = await findScore(key);
      const score = existing
        ? await strapi.documents(SCORE_UID).update({
            documentId: existing.documentId,
            data: { value: input.value },
            fields: SCORE_FIELDS,
          } as any)
        : await strapi.documents(SCORE_UID).create({
            data: {
              key,
              value: input.value,
              criterionName: criterion.name,
              review: review.documentId,
              criterion: criterion.documentId,
              ...(lesson ? { lesson: lesson.documentId } : {}),
            },
            fields: SCORE_FIELDS,
          } as any);

      return { dropletId: Number(review.droplet.id), score: pick(score as Row) };
    }),
  );
}

/**
 * Confirms every AI suggestion the reviewer hasn't scored yet, for one lesson
 * or the Overall Score: copies `aiValue` into `value`. A score the reviewer
 * already set is left alone, and so is a score on an inactive criterion.
 * A lesson outside the droplet is a 400, as in unconfirm.
 */
export async function acceptAiScores(
  scope: ScoreScope,
): Promise<AcceptAiScoresResult> {
  return strapi.db.transaction(async () => {
    const review = await lockOpenReview(scope);
    await assertLessonInDroplet(scope.lessonId, review.droplet.id);

    const pending = (await strapi.documents(SCORE_UID).findMany({
      filters: {
        key: { $startsWith: `${scope.reviewId}:${scope.lessonId ?? 'overall'}:` },
        review: { id: scope.reviewId },
        aiValue: { $notNull: true },
        value: { $null: true },
        criterion: { active: true },
      },
      fields: SCORE_FIELDS,
      sort: ['id:asc'],
    } as any)) as Row[];

    const scores: Row[] = [];
    for (const row of pending) {
      const updated = await strapi.documents(SCORE_UID).update({
        documentId: row.documentId,
        data: { value: row.aiValue },
        fields: SCORE_FIELDS,
      } as any);
      scores.push(pick(updated as Row));
    }

    return { dropletId: Number(review.droplet.id), scores };
  });
}

/**
 * Undoes a confirm for one lesson or the Overall Score: clears `value` where it
 * still equals `aiValue`, on active criteria only (as accept-ai). Scores the
 * reviewer changed or set themselves stay.
 */
export async function unconfirmScores(
  scope: ScoreScope,
): Promise<AcceptAiScoresResult> {
  return strapi.db.transaction(async () => {
    const review = await lockOpenReview(scope);

    await assertLessonInDroplet(scope.lessonId, review.droplet.id);

    const confirmed = (await strapi.documents(SCORE_UID).findMany({
      filters: {
        key: { $startsWith: `${scope.reviewId}:${scope.lessonId ?? 'overall'}:` },
        review: { id: scope.reviewId },
        aiValue: { $notNull: true },
        value: { $notNull: true },
        criterion: { active: true },
      },
      fields: SCORE_FIELDS,
      sort: ['id:asc'],
    } as any)) as Row[];

    const scores: Row[] = [];
    for (const row of confirmed) {
      if (row.value !== row.aiValue) continue;
      const updated = await strapi.documents(SCORE_UID).update({
        documentId: row.documentId,
        data: { value: null },
        fields: SCORE_FIELDS,
      } as any);
      scores.push(pick(updated as Row));
    }

    return { dropletId: Number(review.droplet.id), scores };
  });
}
