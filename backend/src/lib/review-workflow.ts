import {
  applyPublishEdit,
  deleteEditDraft,
  DRAFT_GONE_MESSAGE,
  DROPLET_UID,
  lockDroplet,
  preparePublishEdit,
  PublishEditError,
  type DraftRef,
  type PublishEditSummary,
} from './publish-edit';
import { moveReviewsToLive } from './review-move';

const REVIEW_UID = 'api::review.review';
const REVIEW_COMMENT_UID = 'api::review-comment.review-comment';
const SCORE_UID = 'api::review-score.review-score';
const CRITERION_UID = 'api::review-criterion.review-criterion';
const ANNOUNCEMENT_UID = 'api::announcement.announcement';
const USER_UID = 'api::authorized-user.authorized-user';

type Row = Record<string, any>;

export type SubmitResult = {
  dropletId: number;
  inReview: true;
  round: number;
  changed: boolean;
  reviewsCarried?: number;
  commentsCarried?: number;
};

export type WithdrawResult = {
  dropletId: number;
  inReview: false;
  changed: boolean;
};

/** Resolves the droplet, locks its row, then re-reads it. Must run inside a transaction. */
async function lockAndRead(ref: DraftRef): Promise<Row> {
  const found = await strapi
    .documents(DROPLET_UID)
    .findFirst({ filters: ref, fields: ['id'] });
  if (!found) throw new PublishEditError(404, DRAFT_GONE_MESSAGE);
  await lockDroplet(Number(found.id));
  const droplet = (await strapi.documents(DROPLET_UID).findFirst({
    filters: { id: found.id },
    fields: ['name', 'status', 'inReview', 'reviewRound', 'originalDropletId'],
    populate: { authorized_users: { fields: ['id'] } },
  } as any)) as Row | null;
  if (!droplet) throw new PublishEditError(404, DRAFT_GONE_MESSAGE);
  if (droplet.status === 'published') {
    throw new PublishEditError(409, 'This droplet is already published.');
  }
  return droplet;
}

const reviewerIdOf = (key: string) => Number(key.split(':')[1]);

/**
 * Copies a sent review's unresolved comments (and replies) into a new open
 * review. Each copy points at the comment as first written, however many
 * rounds ago, and keeps the creator's addressed mark (ODY-807).
 */
async function carryComments(
  sent: Row,
  target: Row,
): Promise<number> {
  const comments = (await strapi.documents(REVIEW_COMMENT_UID).findMany({
    filters: { review: { id: sent.id } },
    populate: {
      lesson: { fields: ['id'] },
      author: { fields: ['id'] },
      parent: { fields: ['id'] },
      carriedFrom: { fields: ['id'] },
    },
    sort: ['id:asc'],
  } as any)) as Row[];

  const tops = comments.filter(
    (c) =>
      !c.parent &&
      !c.resolvedAt &&
      !(c.field === 'blocks' && !c.lesson),
  );
  const copyOf = new Map<number, string>();
  const copyData = (c: Row, parent?: string) => ({
    review: target.documentId,
    field: c.field,
    anchor: c.anchor,
    body: c.body,
    addressedAt: c.addressedAt ?? null,
    carriedFrom: c.carriedFrom?.documentId ?? c.documentId,
    ...(c.lesson ? { lesson: c.lesson.documentId } : {}),
    ...(c.author ? { author: c.author.documentId } : {}),
    ...(parent ? { parent } : {}),
  });

  for (const top of tops) {
    const created = await strapi
      .documents(REVIEW_COMMENT_UID)
      .create({ data: copyData(top) as any });
    copyOf.set(top.id, created.documentId);
  }
  let carried = tops.length;
  // id order puts a parent before its replies, so any depth carries.
  for (const reply of comments) {
    const parentCopy = reply.parent && copyOf.get(reply.parent.id);
    if (!parentCopy) continue;
    const created = await strapi
      .documents(REVIEW_COMMENT_UID)
      .create({ data: copyData(reply, parentCopy) as any });
    copyOf.set(reply.id, created.documentId);
    carried++;
  }
  return carried;
}

/** Puts a draft in review (next round), carrying each reviewer's work forward. */
export async function submitForReview(ref: DraftRef): Promise<SubmitResult> {
  return strapi.db.transaction(async () => {
    const droplet = await lockAndRead(ref);
    const dropletId = Number(droplet.id);
    if (droplet.inReview === true) {
      return {
        dropletId,
        inReview: true as const,
        round: droplet.reviewRound ?? 0,
        changed: false,
      };
    }

    await strapi.documents(DROPLET_UID).update({
      documentId: droplet.documentId,
      data: { inReview: true },
    });
    const round = Number(
      (
        (await strapi.documents(DROPLET_UID).findFirst({
          filters: { id: droplet.id },
          fields: ['reviewRound'],
        })) as Row
      ).reviewRound ?? 0,
    );

    const reviews = (await strapi.documents(REVIEW_UID).findMany({
      filters: { droplet: { id: droplet.id } },
      fields: ['key', 'round', 'state'],
    })) as Row[];
    const latest = new Map<number, Row>();
    for (const review of reviews) {
      const reviewerId = reviewerIdOf(review.key);
      const seen = latest.get(reviewerId);
      if (!seen || review.round > seen.round) latest.set(reviewerId, review);
    }

    let reviewsCarried = 0;
    let commentsCarried = 0;
    for (const [reviewerId, review] of latest) {
      if (review.round >= round) continue;
      const key = `${droplet.id}:${reviewerId}:${round}`;
      if (review.state === 'open') {
        await strapi.documents(REVIEW_UID).update({
          documentId: review.documentId,
          data: { round, key },
        });
        reviewsCarried++;
      } else if (review.state === 'sent') {
        const reviewer = await strapi
          .documents(USER_UID)
          .findFirst({ filters: { id: reviewerId }, fields: ['id'] });
        const created = await strapi.documents(REVIEW_UID).create({
          data: {
            round,
            key,
            state: 'open',
            droplet: droplet.documentId,
            ...(reviewer ? { reviewer: reviewer.documentId } : {}),
          } as any,
        });
        commentsCarried += await carryComments(review, created);
        reviewsCarried++;
      }
    }

    return {
      dropletId,
      inReview: true as const,
      round,
      changed: true,
      reviewsCarried,
      commentsCarried,
    };
  });
}

/** Takes a draft out of review. Every review stays as it is. */
export async function withdrawFromReview(
  ref: DraftRef,
): Promise<WithdrawResult> {
  return strapi.db.transaction(async () => {
    const droplet = await lockAndRead(ref);
    const dropletId = Number(droplet.id);
    if (droplet.inReview !== true) {
      return { dropletId, inReview: false as const, changed: false };
    }
    await strapi.documents(DROPLET_UID).update({
      documentId: droplet.documentId,
      data: { inReview: false },
    });
    return { dropletId, inReview: false as const, changed: true };
  });
}

export type SendFeedbackResult = {
  dropletId: number;
  reviewId: number;
  inReview: false;
  announced: number;
};

export type PublishReviewResult = {
  slug: string;
  dropletId: number;
  reviewId: number;
} & Partial<
  Pick<PublishEditSummary, 'originalDropletId' | 'lessons' | 'enrollmentsMoved'>
>;

const displayName = (name: unknown) =>
  String(name ?? '').replace(/^\[EDIT\]\s*/i, '');

/** The caller's review for the draft's current round; 404 if none, 409 unless open. */
async function loadOpenReview(draft: Row, reviewerId: number): Promise<Row> {
  const review = (await strapi.documents(REVIEW_UID).findFirst({
    filters: { key: `${draft.id}:${reviewerId}:${draft.reviewRound}` },
    fields: ['state'],
  })) as Row | null;
  if (!review) {
    throw new PublishEditError(404, 'There is no review of yours for this round.');
  }
  if (review.state !== 'open') {
    throw new PublishEditError(409, 'This review has already been sent.');
  }
  return review;
}

function assertInReview(draft: Row): void {
  if (draft.inReview !== true) {
    throw new PublishEditError(409, 'This droplet is not in review.');
  }
}

/** Every active criterion needs a confirmed Overall score. Zero active criteria pass. */
async function assertOverallConfirmed(reviewId: number): Promise<void> {
  const criteria = (await strapi.documents(CRITERION_UID).findMany({
    filters: { active: true },
    sort: ['order:asc'],
    fields: ['name'],
  })) as Row[];
  if (criteria.length === 0) return;
  const scores = (await strapi.documents(SCORE_UID).findMany({
    filters: { key: { $in: criteria.map((c) => `${reviewId}:overall:${c.id}`) } },
    fields: ['key', 'value'],
  })) as Row[];
  const confirmed = new Set(
    scores.filter((s) => s.value != null).map((s) => s.key),
  );
  const missing = criteria
    .filter((c) => !confirmed.has(`${reviewId}:overall:${c.id}`))
    .map((c) => c.name);
  if (missing.length > 0) {
    throw new PublishEditError(
      409,
      `Confirm an Overall score for every criterion before publishing (missing: ${missing.join(', ')}).`,
    );
  }
}

/** One announcement per author, addressed to that author. */
async function announceAuthors(
  type: 'review_feedback' | 'review_published',
  authors: Row[],
  dropletDocumentId: string,
  content: string,
): Promise<number> {
  for (const author of authors) {
    await strapi.documents(ANNOUNCEMENT_UID).create({
      data: {
        type,
        firstCreated: new Date().toISOString(),
        content,
        droplet: dropletDocumentId,
        authorized_user: author.documentId,
      } as any,
    });
  }
  return authors.length;
}

/** Sends the caller's open review to the authors and takes the draft out of review. */
export async function sendFeedback(
  ref: DraftRef,
  input: { reviewerId: number; summaryNote?: string | null },
): Promise<SendFeedbackResult> {
  return strapi.db.transaction(async () => {
    const draft = await lockAndRead(ref);
    assertInReview(draft);
    const review = await loadOpenReview(draft, input.reviewerId);

    await strapi.documents(REVIEW_UID).update({
      documentId: review.documentId,
      data: {
        state: 'sent',
        sentAt: new Date().toISOString(),
        ...(input.summaryNote != null ? { summaryNote: input.summaryNote } : {}),
      } as any,
    });
    await strapi.documents(DROPLET_UID).update({
      documentId: draft.documentId,
      data: { inReview: false },
    });
    const announced = await announceAuthors(
      'review_feedback',
      draft.authorized_users ?? [],
      draft.documentId,
      `Feedback is ready on "${displayName(draft.name)}".`,
    );
    return {
      dropletId: Number(draft.id),
      reviewId: Number(review.id),
      inReview: false as const,
      announced,
    };
  });
}

/** Publishes a draft in review, with the caller's review, in one transaction. */
export async function publishWithReview(input: {
  draft: DraftRef;
  reviewerId: number;
  originalDropletId: number | null;
}): Promise<PublishReviewResult> {
  return strapi.db.transaction(async () => {
    if (input.originalDropletId !== null) {
      const ctx = await preparePublishEdit({
        draft: input.draft,
        originalDropletId: input.originalDropletId,
      });
      assertInReview(ctx.draft);
      const review = await loadOpenReview(ctx.draft, input.reviewerId);
      await assertOverallConfirmed(Number(review.id));

      const { lessonMap, counts } = await applyPublishEdit(ctx);
      await moveReviewsToLive(ctx, lessonMap, {
        publishReviewId: Number(review.id),
      });
      await announceAuthors(
        'review_published',
        ctx.draft.authorized_users ?? [],
        ctx.original.documentId,
        `"${displayName(ctx.draft.name)}" was reviewed and published.`,
      );
      await deleteEditDraft(ctx);
      const { enrollmentsMoved, ...lessons } = counts;
      return {
        slug: ctx.original.slug,
        dropletId: Number(ctx.original.id),
        reviewId: Number(review.id),
        originalDropletId: Number(ctx.original.id),
        lessons,
        enrollmentsMoved,
      };
    }

    const draft = await lockAndRead(input.draft);
    if (draft.originalDropletId != null) {
      throw new PublishEditError(
        409,
        'This draft is an edit of a published droplet.',
      );
    }
    assertInReview(draft);
    const review = await loadOpenReview(draft, input.reviewerId);
    await assertOverallConfirmed(Number(review.id));

    await strapi.documents(DROPLET_UID).update({
      documentId: draft.documentId,
      data: { status: 'published', inReview: false },
    });
    await strapi.documents(REVIEW_UID).update({
      documentId: review.documentId,
      data: { state: 'published' },
    });
    await announceAuthors(
      'review_published',
      draft.authorized_users ?? [],
      draft.documentId,
      `"${displayName(draft.name)}" was reviewed and published.`,
    );
    const slug = (await strapi.documents(DROPLET_UID).findFirst({
      filters: { id: draft.id },
      fields: ['slug'],
    })) as Row;
    return {
      slug: slug.slug,
      dropletId: Number(draft.id),
      reviewId: Number(review.id),
    };
  });
}
