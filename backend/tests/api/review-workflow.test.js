const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  LESSON_UID,
  USER_UID,
  REVIEW_UID,
  REVIEW_COMMENT_UID,
  REVIEW_SCORE_UID,
  REVIEW_CRITERION_UID,
  ANNOUNCEMENT_UID,
  dropletData,
  lessonData,
  userData,
  reviewData,
  reviewCommentData,
  reviewScoreData,
} = require('../helpers/fixtures');

let strapi;
let token;

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

const rest = () => request(strapi.server.httpServer);
const post = (ref, action, body = {}) =>
  rest()
    .post(`/api/droplets/${ref}/${action}`)
    .set({ Authorization: `Bearer ${token}` })
    .send(body);

const json = (value) => JSON.parse(JSON.stringify(value));

/** Replaces strapi.db.query(uid)[method]: runs the real one, then throws. */
function failAfter(uid, method) {
  const repo = strapi.db.query(uid);
  const real = repo[method];
  return jest.spyOn(repo, method).mockImplementation(async (...args) => {
    await real.apply(repo, args);
    throw new Error('forced failure');
  });
}

/**
 * A draft with one lesson. `inReview` starts it at round 1; each entry of `reviews`
 * is `{ state, children }` for a distinct reviewer, at the draft's current round.
 */
async function setupReviewDraft({
  inReview = false,
  status = 'draft',
  reviews = [],
  authors = 0,
} = {}) {
  const authorRows = [];
  for (let i = 0; i < authors; i++) {
    authorRows.push(await strapi.documents(USER_UID).create({ data: userData() }));
  }
  const lesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
  const draft = await strapi.documents(DROPLET_UID).create({
    data: dropletData({
      status,
      inReview,
      lessons: [lesson.documentId],
      authorized_users: authorRows.map((a) => a.documentId),
    }),
  });
  const round = draft.reviewRound;
  const made = [];
  for (const spec of reviews) {
    const reviewer = await strapi.documents(USER_UID).create({ data: userData() });
    const review = await strapi.documents(REVIEW_UID).create({
      data: reviewData({
        key: `${draft.id}:${reviewer.id}:${round}`,
        round,
        state: spec.state ?? 'open',
        droplet: draft.documentId,
        reviewer: reviewer.documentId,
      }),
    });
    made.push({ review, reviewer });
  }
  return { draft, lesson, made, authorRows };
}

const readDraft = (id) =>
  strapi.documents(DROPLET_UID).findFirst({ filters: { id } });

const reviewsOf = (dropletId) =>
  strapi.documents(REVIEW_UID).findMany({
    filters: { droplet: { id: dropletId } },
    populate: {
      reviewer: { fields: ['id'] },
      comments: { populate: { parent: { fields: ['id'] }, lesson: { fields: ['id'] } } },
      scores: true,
    },
    sort: ['id:asc'],
  });

const comment = (review, overrides = {}) =>
  strapi.documents(REVIEW_COMMENT_UID).create({
    data: reviewCommentData({ review: review.documentId, ...overrides }),
  });

const withdraw = (draft) =>
  strapi.documents(DROPLET_UID).update({
    documentId: draft.documentId,
    data: { inReview: false },
  });

describe('POST /droplets/:id/submit-review', () => {
  it('raises the round 0 to 1 and reports nothing carried', async () => {
    const { draft } = await setupReviewDraft();

    const res = await post(draft.id, 'submit-review');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      dropletId: draft.id,
      inReview: true,
      round: 1,
      changed: true,
      reviewsCarried: 0,
      commentsCarried: 0,
    });
    const after = await readDraft(draft.id);
    expect(after.inReview).toBe(true);
    expect(after.reviewRound).toBe(1);
  });

  it('re-keys an open review to the new round and keeps its children', async () => {
    const { draft, lesson, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
    });
    const { review } = made[0];
    const criterion = (await strapi.documents(REVIEW_CRITERION_UID).findMany({}))[0];
    await comment(review, { lesson: lesson.documentId });
    await strapi.documents(REVIEW_SCORE_UID).create({
      data: reviewScoreData({
        key: `${review.id}:overall:${criterion.id}`,
        review: review.documentId,
        criterion: criterion.documentId,
        value: 3,
      }),
    });
    await withdraw(draft);

    const res = await post(draft.id, 'submit-review');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ round: 2, changed: true, reviewsCarried: 1 });
    const reviews = await reviewsOf(draft.id);
    expect(reviews).toHaveLength(1);
    expect(reviews[0].id).toBe(review.id);
    expect(reviews[0].round).toBe(2);
    expect(reviews[0].key).toBe(`${draft.id}:${made[0].reviewer.id}:2`);
    expect(reviews[0].comments).toHaveLength(1);
    expect(reviews[0].scores).toHaveLength(1);
  });

  it('copies unresolved comments into a new open review after Send', async () => {
    const { draft, lesson, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'sent' }],
    });
    const { review, reviewer } = made[0];
    const top = await comment(review, { lesson: lesson.documentId });
    await comment(review, { lesson: lesson.documentId, body: 'Reply', parent: top.documentId });
    const resolved = await comment(review, {
      lesson: lesson.documentId,
      body: 'Resolved',
      resolvedAt: new Date().toISOString(),
    });
    await comment(review, {
      lesson: lesson.documentId,
      body: 'Reply to resolved',
      parent: resolved.documentId,
    });
    await comment(review, { body: 'Orphan' });
    const criterion = (await strapi.documents(REVIEW_CRITERION_UID).findMany({}))[0];
    await strapi.documents(REVIEW_SCORE_UID).create({
      data: reviewScoreData({
        key: `${review.id}:overall:${criterion.id}`,
        review: review.documentId,
        criterion: criterion.documentId,
        value: 3,
      }),
    });
    await withdraw(draft);
    const sentBefore = json((await reviewsOf(draft.id))[0]);

    const res = await post(draft.id, 'submit-review');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      round: 2,
      reviewsCarried: 1,
      commentsCarried: 2,
    });
    const reviews = await reviewsOf(draft.id);
    expect(reviews).toHaveLength(2);
    expect(json(reviews[0])).toEqual(sentBefore);
    const fresh = reviews[1];
    expect(fresh.state).toBe('open');
    expect(fresh.round).toBe(2);
    expect(fresh.key).toBe(`${draft.id}:${reviewer.id}:2`);
    expect(fresh.reviewer.id).toBe(reviewer.id);
    expect(fresh.scores).toHaveLength(0);
    expect(fresh.comments).toHaveLength(2);
    const newTop = fresh.comments.find((c) => !c.parent);
    const newReply = fresh.comments.find((c) => c.parent);
    expect(newTop.body).toBe('Please fix this');
    expect(newReply.parent.id).toBe(newTop.id);
    expect(newTop.id).not.toBe(top.id);
    const bodies = fresh.comments.map((c) => c.body);
    expect(bodies).not.toContain('Resolved');
    expect(bodies).not.toContain('Reply to resolved');
  });

  it('carries a reply to a reply, parented on the copied reply', async () => {
    const { draft, lesson, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'sent' }],
    });
    const { review } = made[0];
    const lessonRef = { lesson: lesson.documentId };
    const top = await comment(review, lessonRef);
    const reply = await comment(review, { ...lessonRef, body: 'R1', parent: top.documentId });
    await comment(review, { ...lessonRef, body: 'R2', parent: reply.documentId });
    await withdraw(draft);

    const res = await post(draft.id, 'submit-review');

    expect(res.body.data.commentsCarried).toBe(3);
    const fresh = (await reviewsOf(draft.id))[1];
    const byBody = Object.fromEntries(fresh.comments.map((c) => [c.body, c]));
    expect(fresh.comments).toHaveLength(3);
    expect(byBody.R2.parent.id).toBe(byBody.R1.id);
    expect(byBody.R1.parent.id).toBe(byBody['Please fix this'].id);
  });

  it('points each copy at the comment as first written, and keeps its addressed mark', async () => {
    const { draft, lesson, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'sent' }],
    });
    const { review, reviewer } = made[0];
    const lessonRef = { lesson: lesson.documentId };
    const addressedAt = '2026-10-28T12:00:00.000Z';
    const top = await comment(review, { ...lessonRef, addressedAt });
    const reply = await comment(review, { ...lessonRef, body: 'R1', parent: top.documentId });
    await withdraw(draft);

    await post(draft.id, 'submit-review');

    const copies = await strapi.documents(REVIEW_COMMENT_UID).findMany({
      filters: { review: { round: 2 } },
      populate: { carriedFrom: { fields: ['id'] } },
    });
    const byBody = Object.fromEntries(copies.map((c) => [c.body, c]));
    expect(byBody['Please fix this'].carriedFrom.id).toBe(top.id);
    expect(byBody['Please fix this'].addressedAt).toBe(addressedAt);
    expect(byBody.R1.carriedFrom.id).toBe(reply.id);
    expect(byBody.R1.addressedAt).toBeNull();

    // Round 2 is sent too, then submitted again: round 3's copy still points
    // at round 1's comment
    const round2 = (await reviewsOf(draft.id))[1];
    await strapi.documents(REVIEW_UID).update({
      documentId: round2.documentId,
      data: { state: 'sent' },
    });
    await withdraw(draft);
    await post(draft.id, 'submit-review');

    const round3 = await strapi.documents(REVIEW_COMMENT_UID).findFirst({
      filters: { review: { key: `${draft.id}:${reviewer.id}:3` }, parent: { $null: true } },
      populate: { carriedFrom: { fields: ['id'] } },
    });
    expect(round3.carriedFrom.id).toBe(top.id);
  });

  it('is idempotent: a second Submit changes nothing', async () => {
    const { draft, lesson, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'sent' }],
    });
    await comment(made[0].review, { lesson: lesson.documentId });
    await withdraw(draft);
    await post(draft.id, 'submit-review');
    const countComments = async () =>
      (await reviewsOf(draft.id)).reduce((n, r) => n + r.comments.length, 0);
    const commentsBefore = await countComments();

    const res = await post(draft.documentId, 'submit-review');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ round: 2, changed: false });
    expect((await readDraft(draft.id)).reviewRound).toBe(2);
    expect(await reviewsOf(draft.id)).toHaveLength(2);
    expect(await countComments()).toBe(commentsBefore);
  });

  it('answers 409 for a published droplet', async () => {
    const { draft } = await setupReviewDraft({ status: 'published' });

    const submit = await post(draft.id, 'submit-review');
    const out = await post(draft.id, 'withdraw-review');

    expect(submit.status).toBe(409);
    expect(out.status).toBe(409);
    expect((await readDraft(draft.id)).reviewRound).toBe(0);
  });

  it('rolls everything back when a comment copy fails', async () => {
    const { draft, lesson, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'sent' }],
    });
    await comment(made[0].review, { lesson: lesson.documentId });
    await withdraw(draft);
    const before = json({
      draft: await readDraft(draft.id),
      reviews: await reviewsOf(draft.id),
    });
    const spy = failAfter(REVIEW_COMMENT_UID, 'create');
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});
    try {
      const res = await post(draft.id, 'submit-review');
      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }

    expect(
      json({
        draft: await readDraft(draft.id),
        reviews: await reviewsOf(draft.id),
      }),
    ).toEqual(before);
  });
});

describe('POST /droplets/:id/withdraw-review', () => {
  it('clears inReview, leaves the review as is, and is idempotent', async () => {
    const { draft, lesson, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
    });
    await comment(made[0].review, { lesson: lesson.documentId });
    const before = json(await reviewsOf(draft.id));

    const res = await post(draft.id, 'withdraw-review');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      dropletId: draft.id,
      inReview: false,
      changed: true,
    });
    expect((await readDraft(draft.id)).inReview).toBe(false);
    expect(json(await reviewsOf(draft.id))).toEqual(before);
    const [kept] = await reviewsOf(draft.id);
    expect(kept.state).toBe('open');
    expect(kept.comments).toHaveLength(1);

    const again = await post(draft.id, 'withdraw-review');
    expect(again.status).toBe(200);
    expect(again.body.data.changed).toBe(false);
  });
});

describe('review workflow request validation', () => {
  it('rejects any body key with 400', async () => {
    const { draft } = await setupReviewDraft();

    const res = await post(draft.id, 'submit-review', { x: 1 });
    const res2 = await post(draft.id, 'withdraw-review', { x: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid key x');
    expect(res2.status).toBe(400);
    expect((await readDraft(draft.id)).inReview).toBeFalsy();
  });

  it('answers 404 for a malformed or unknown :id and accepts a documentId', async () => {
    const { draft } = await setupReviewDraft();

    expect((await post('..%2Fx', 'submit-review')).status).toBe(404);
    expect((await post(999999, 'withdraw-review')).status).toBe(404);
    expect((await post(draft.documentId, 'submit-review')).status).toBe(200);
  });
});

const announcementsFor = (dropletIds) =>
  strapi.documents(ANNOUNCEMENT_UID).findMany({
    filters: { droplet: { id: { $in: dropletIds } } },
    populate: { authorized_user: { fields: ['id'] }, droplet: { fields: ['id'] } },
    sort: ['id:asc'],
  });

describe('POST /droplets/:id/send-feedback', () => {
  const send = (ref, body) => post(ref, 'send-feedback', body);

  it('sends the open review, leaves review, and tells each author', async () => {
    const { draft, made, authorRows } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
      authors: 2,
    });
    const { review, reviewer } = made[0];

    const res = await send(draft.id, { reviewerId: reviewer.id, summaryNote: 'Looks close' });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      dropletId: draft.id,
      reviewId: review.id,
      inReview: false,
      announced: 2,
    });
    const [sent] = await reviewsOf(draft.id);
    expect(sent.state).toBe('sent');
    expect(sent.sentAt).toBeTruthy();
    expect(sent.summaryNote).toBe('Looks close');
    expect((await readDraft(draft.id)).inReview).toBe(false);

    const announcements = await announcementsFor([draft.id]);
    expect(announcements).toHaveLength(2);
    expect(announcements.map((a) => a.authorized_user.id).sort()).toEqual(
      authorRows.map((a) => a.id).sort(),
    );
    for (const a of announcements) {
      expect(a.type).toBe('review_feedback');
      expect(a.droplet.id).toBe(draft.id);
      expect(a.content).toBe(`Feedback is ready on "${draft.name}".`);
      expect(a.content).not.toMatch(/AI/);
    }
  });

  it('answers 409 for a review that is already sent, and changes nothing', async () => {
    const { draft, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'sent' }],
      authors: 1,
    });
    const before = json(await reviewsOf(draft.id));

    const res = await send(draft.id, { reviewerId: made[0].reviewer.id });

    expect(res.status).toBe(409);
    expect(json(await reviewsOf(draft.id))).toEqual(before);
    expect((await readDraft(draft.id)).inReview).toBe(true);
    expect(await announcementsFor([draft.id])).toHaveLength(0);
  });

  it('answers 409 after the creator withdrew', async () => {
    const { draft, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
    });
    await withdraw(draft);

    const res = await send(draft.id, { reviewerId: made[0].reviewer.id });

    expect(res.status).toBe(409);
    expect((await reviewsOf(draft.id))[0].state).toBe('open');
  });

  it('answers 404 when the caller has no review this round', async () => {
    const { draft } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
    });
    const other = await strapi.documents(USER_UID).create({ data: userData() });

    const res = await send(draft.id, { reviewerId: other.id });

    expect(res.status).toBe(404);
  });

  it('rejects bad bodies with 400', async () => {
    const { draft, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
    });
    const reviewerId = made[0].reviewer.id;

    expect((await send(draft.id, {})).status).toBe(400);
    expect((await send(draft.id, { reviewerId, x: 1 })).status).toBe(400);
    expect(
      (await send(draft.id, { reviewerId, summaryNote: 'x'.repeat(5001) })).status,
    ).toBe(400);
    expect((await reviewsOf(draft.id))[0].state).toBe('open');
  });

  it('rolls back when an announcement fails', async () => {
    const { draft, made } = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
      authors: 2,
    });
    const spy = failAfter(ANNOUNCEMENT_UID, 'create');
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});
    try {
      const res = await send(draft.id, { reviewerId: made[0].reviewer.id });
      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }

    expect((await reviewsOf(draft.id))[0].state).toBe('open');
    expect((await readDraft(draft.id)).inReview).toBe(true);
    expect(await announcementsFor([draft.id])).toHaveLength(0);
  });
});

const v2 = (text) => [
  { id: 'bn-1', type: 'paragraph', content: [{ type: 'text', text, styles: {} }], children: [] },
];
const spec = (name, orderIndex, text) => ({
  name,
  orderIndex,
  blocksVersion: 'v2',
  blocksV2: v2(text),
});

const activeCriteria = () =>
  strapi.documents(REVIEW_CRITERION_UID).findMany({
    filters: { active: true },
    sort: ['order:asc'],
  });

/** Overall scores for every active criterion; `skip`/`aiOnly` are criterion indexes. */
async function confirmOveralls(review, { skip, aiOnly } = {}) {
  const criteria = await activeCriteria();
  for (const [i, c] of criteria.entries()) {
    if (i === skip) continue;
    await strapi.documents(REVIEW_SCORE_UID).create({
      data: reviewScoreData({
        key: `${review.id}:overall:${c.id}`,
        review: review.documentId,
        criterion: c.documentId,
        ...(i === aiOnly ? { aiValue: 4 } : { value: 4 }),
      }),
    });
  }
  return criteria;
}

/**
 * A live droplet (Intro, Wrap) and an in-review [EDIT] draft: Intro edited, Wrap unchanged, Extra new.
 * The reviewer's open review has a comment and a score on every draft lesson.
 */
async function setupEditReview({ inReview = true } = {}) {
  const mk = (sp, extra = {}) =>
    strapi.documents(LESSON_UID).create({
      data: lessonData({ blocksV2: undefined, ...sp, ...extra }),
    });
  const liveIntro = await mk(spec('Intro', 0, 'Intro'));
  const liveWrap = await mk(spec('Wrap', 1, 'Done'));
  const original = await strapi.documents(DROPLET_UID).create({
    data: dropletData({
      status: 'published',
      lessons: [liveIntro.documentId, liveWrap.documentId],
    }),
  });
  const dIntro = await mk(spec('Intro', 0, 'Intro edited'), { originalLessonId: liveIntro.id });
  const dWrap = await mk(spec('Wrap', 1, 'Done'), { originalLessonId: liveWrap.id });
  const dExtra = await mk(spec('Extra', 2, 'Extra'));
  const authors = [];
  for (let i = 0; i < 2; i++) {
    authors.push(await strapi.documents(USER_UID).create({ data: userData() }));
  }
  const draft = await strapi.documents(DROPLET_UID).create({
    data: dropletData({
      name: `[EDIT] ${original.name}`,
      status: 'edit',
      inReview,
      difficulty: 'advanced',
      originalDropletId: original.id,
      lessons: [dIntro, dWrap, dExtra].map((l) => l.documentId),
      authorized_users: authors.map((a) => a.documentId),
    }),
  });
  const round = Math.max(1, draft.reviewRound);
  const newReviewer = () => strapi.documents(USER_UID).create({ data: userData() });
  const newReview = (reviewer, state) =>
    strapi.documents(REVIEW_UID).create({
      data: reviewData({
        key: `${draft.id}:${reviewer.id}:${round}`,
        round,
        state,
        droplet: draft.documentId,
        reviewer: reviewer.documentId,
      }),
    });
  const reviewer = await newReviewer();
  const review = await newReview(reviewer, 'open');
  const criteria = await activeCriteria();
  const children = [];
  for (const lesson of [dIntro, dWrap, dExtra]) {
    const c = await comment(review, {
      lesson: lesson.documentId,
      anchor: { blockId: 'bn-1', note: lesson.name },
      author: authors[0].documentId,
    });
    const score = await strapi.documents(REVIEW_SCORE_UID).create({
      data: reviewScoreData({
        key: `${review.id}:${lesson.id}:${criteria[0].id}`,
        review: review.documentId,
        lesson: lesson.documentId,
        criterion: criteria[0].documentId,
        value: 3,
      }),
    });
    children.push({ lesson, comment: c, score });
  }
  const reply = await comment(review, {
    lesson: dIntro.documentId,
    body: 'A reply',
    parent: children[0].comment.documentId,
  });
  return {
    reply,
    original,
    draft,
    authors,
    reviewer,
    review,
    children,
    newReviewer,
    newReview,
    liveIntro,
    liveWrap,
    criteria,
  };
}

const publishReview = (ref, body) => post(ref, 'publish-review', body);

async function worldSnapshot(s) {
  const ids = [s.original?.id, s.draft.id].filter(Boolean);
  const droplets = await strapi.documents(DROPLET_UID).findMany({
    filters: { id: { $in: ids } },
    populate: { lessons: { fields: ['id', 'blocksV2'], sort: ['id:asc'] } },
    sort: ['id:asc'],
  });
  const reviews = await strapi.documents(REVIEW_UID).findMany({
    filters: { droplet: { id: { $in: ids } } },
    populate: {
      droplet: { fields: ['id'] },
      comments: { populate: { lesson: { fields: ['id'] } } },
      scores: { populate: { lesson: { fields: ['id'] } } },
    },
    sort: ['id:asc'],
  });
  return json({ droplets, reviews, announcements: await announcementsFor(ids) });
}

describe('POST /droplets/:id/publish-review ([EDIT])', () => {
  it('publishes over the original and moves reviews, comments and scores to live lessons', async () => {
    const s = await setupEditReview();
    await confirmOveralls(s.review);
    const overallBefore = (
      await strapi.documents(REVIEW_SCORE_UID).findMany({
        filters: { review: { id: s.review.id }, key: { $contains: ':overall:' } },
        populate: { lesson: { fields: ['id'] } },
        sort: ['id:asc'],
      })
    ).map((o) => ({ key: o.key, lesson: o.lesson }));
    const second = await s.newReview(await s.newReviewer(), 'open');
    const older = await s.newReview(await s.newReviewer(), 'sent');

    const res = await publishReview(s.draft.id, {
      reviewerId: s.reviewer.id,
      originalDropletId: s.original.id,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      slug: s.original.slug,
      dropletId: s.original.id,
      reviewId: s.review.id,
      originalDropletId: s.original.id,
      lessons: { updated: 1, unchanged: 1, created: 1, deleted: 0 },
    });

    const moved = await strapi.documents(REVIEW_UID).findOne({
      documentId: s.review.documentId,
      populate: { droplet: { fields: ['id'] } },
    });
    expect(moved.droplet.id).toBe(s.original.id);
    expect(moved.state).toBe('published');
    expect(moved.key).toBe(s.review.key);
    for (const r of [second, older]) {
      const row = await strapi.documents(REVIEW_UID).findOne({
        documentId: r.documentId,
        populate: { droplet: { fields: ['id'] } },
      });
      expect(row.droplet.id).toBe(s.original.id);
      expect(row.state).toBe(r.state);
    }

    const live = await strapi.documents(DROPLET_UID).findOne({
      documentId: s.original.documentId,
      populate: { lessons: { sort: ['orderIndex:asc'] } },
    });
    const liveByName = Object.fromEntries(live.lessons.map((l) => [l.name, l]));
    expect(liveByName.Intro.id).toBe(s.liveIntro.id);
    expect(liveByName.Wrap.id).toBe(s.liveWrap.id);
    expect(liveByName.Extra.id).not.toBe(s.children[2].lesson.id);

    for (const child of s.children) {
      const target = liveByName[child.lesson.name];
      const c = await strapi.documents(REVIEW_COMMENT_UID).findOne({
        documentId: child.comment.documentId,
        populate: { lesson: { fields: ['id', 'blocksV2'] }, author: { fields: ['id'] } },
      });
      expect(c.lesson.id).toBe(target.id);
      expect(c.lesson.blocksV2.map((b) => b.id)).toContain(c.anchor.blockId);
      expect(c.field).toBe('blocks');
      expect(c.anchor).toEqual({ blockId: 'bn-1', note: child.lesson.name });
      expect(c.author.id).toBe(s.authors[0].id);
      const score = await strapi.documents(REVIEW_SCORE_UID).findOne({
        documentId: child.score.documentId,
        populate: { lesson: { fields: ['id'] } },
      });
      expect(score.lesson.id).toBe(target.id);
      expect(score.key).toBe(`${s.review.id}:${target.id}:${s.criteria[0].id}`);
    }

    const movedReply = await strapi.documents(REVIEW_COMMENT_UID).findOne({
      documentId: s.reply.documentId,
      populate: { lesson: { fields: ['id'] }, parent: { fields: ['id'] } },
    });
    expect(movedReply.lesson.id).toBe(s.liveIntro.id);
    expect(movedReply.parent.id).toBe(s.children[0].comment.id);

    const overallAfter = (
      await strapi.documents(REVIEW_SCORE_UID).findMany({
        filters: { review: { id: s.review.id }, key: { $contains: ':overall:' } },
        populate: { lesson: { fields: ['id'] } },
        sort: ['id:asc'],
      })
    ).map((o) => ({ key: o.key, lesson: o.lesson }));
    expect(overallBefore.length).toBeGreaterThan(0);
    expect(overallAfter).toEqual(overallBefore);
    expect(overallAfter.every((o) => o.lesson === null)).toBe(true);

    expect(
      await strapi.documents(DROPLET_UID).findFirst({ filters: { id: s.draft.id } }),
    ).toBeNull();
    const announcements = await announcementsFor([s.original.id]);
    expect(announcements).toHaveLength(2);
    expect(announcements.map((a) => a.authorized_user.id).sort()).toEqual(
      s.authors.map((a) => a.id).sort(),
    );
    for (const a of announcements) {
      expect(a.type).toBe('review_published');
      expect(a.content).toBe(`"${s.original.name}" was reviewed and published.`);
      expect(a.content).not.toMatch(/AI|\[EDIT\]/);
    }
  });

  it('refuses when an Overall score is missing or has only an aiValue, and changes nothing', async () => {
    for (const mode of ['skip', 'aiOnly']) {
      const s = await setupEditReview();
      const criteria = await confirmOveralls(s.review, { [mode]: 1 });
      const before = await worldSnapshot(s);

      const res = await publishReview(s.draft.id, {
        reviewerId: s.reviewer.id,
        originalDropletId: s.original.id,
      });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain(`missing: ${criteria[1].name}`);
      expect(await worldSnapshot(s)).toEqual(before);
    }
  });

  it('passes with zero active criteria', async () => {
    const s = await setupEditReview();
    const criteria = await activeCriteria();
    for (const c of criteria) {
      await strapi.documents(REVIEW_CRITERION_UID).update({
        documentId: c.documentId,
        data: { active: false },
      });
    }
    try {
      const res = await publishReview(s.draft.id, {
        reviewerId: s.reviewer.id,
        originalDropletId: s.original.id,
      });
      expect(res.status).toBe(200);
    } finally {
      for (const c of criteria) {
        await strapi.documents(REVIEW_CRITERION_UID).update({
          documentId: c.documentId,
          data: { active: true },
        });
      }
    }
  });

  it('refuses a sent review, a droplet not in review, and a missing review', async () => {
    const sent = await setupEditReview();
    await confirmOveralls(sent.review);
    await strapi.documents(REVIEW_UID).update({
      documentId: sent.review.documentId,
      data: { state: 'sent' },
    });
    const idle = await setupEditReview({ inReview: false });
    const none = await setupEditReview();
    const stranger = await strapi.documents(USER_UID).create({ data: userData() });

    const body = (s, reviewerId = s.reviewer.id) => ({
      reviewerId,
      originalDropletId: s.original.id,
    });
    expect((await publishReview(sent.draft.id, body(sent))).status).toBe(409);
    expect((await publishReview(idle.draft.id, body(idle))).status).toBe(409);
    expect((await publishReview(none.draft.id, body(none, stranger.id))).status).toBe(404);
  });

  it.each([
    ['an announcement create', ANNOUNCEMENT_UID, 'create'],
    ['the draft delete', DROPLET_UID, 'delete'],
  ])('rolls everything back when %s fails', async (_label, uid, method) => {
    const s = await setupEditReview();
    await confirmOveralls(s.review);
    const before = await worldSnapshot(s);
    const spy = failAfter(uid, method);
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});
    try {
      const res = await publishReview(s.draft.id, {
        reviewerId: s.reviewer.id,
        originalDropletId: s.original.id,
      });
      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }

    expect(await worldSnapshot(s)).toEqual(before);
    expect(await announcementsFor([s.original.id, s.draft.id])).toHaveLength(0);
  });

  it('answers 409 for a null original on an [EDIT] draft, and changes nothing', async () => {
    const s = await setupEditReview();
    await confirmOveralls(s.review);
    const before = await worldSnapshot(s);

    const res = await publishReview(s.draft.id, {
      reviewerId: s.reviewer.id,
      originalDropletId: null,
    });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe(
      'This draft is an edit of a published droplet.',
    );
    expect(await worldSnapshot(s)).toEqual(before);
  });

  it('names the failing field in a 400 from a Strapi validation error', async () => {
    const s = await setupEditReview();
    await confirmOveralls(s.review);
    await strapi.db.query(LESSON_UID).update({
      where: { id: s.children[2].lesson.id },
      data: { name: 'x'.repeat(101) },
    });
    const before = await worldSnapshot(s);

    const res = await publishReview(s.draft.id, {
      reviewerId: s.reviewer.id,
      originalDropletId: s.original.id,
    });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(
      /^Publishing failed \(lesson "x{101}": .+field: name\)\. Nothing was changed\.$/,
    );
    expect(await worldSnapshot(s)).toEqual(before);
  });

  it('answers 409 to a Publish after the review was sent', async () => {
    const s = await setupEditReview();
    await confirmOveralls(s.review);
    const sent = await post(s.draft.id, 'send-feedback', { reviewerId: s.reviewer.id });
    expect(sent.status).toBe(200);

    const res = await publishReview(s.draft.id, {
      reviewerId: s.reviewer.id,
      originalDropletId: s.original.id,
    });

    expect(res.status).toBe(409);
  });

  it('rejects bad bodies with 400', async () => {
    const s = await setupEditReview();
    const base = { reviewerId: s.reviewer.id };

    expect((await publishReview(s.draft.id, base)).status).toBe(400);
    expect((await publishReview(s.draft.id, { ...base, originalDropletId: 'x' })).status).toBe(400);
    expect(
      (await publishReview(s.draft.id, { ...base, originalDropletId: null, x: 1 })).status,
    ).toBe(400);
    expect((await publishReview(s.draft.id, { originalDropletId: s.original.id })).status).toBe(400);
  });
});

describe('POST /droplets/:id/publish-review (new droplet)', () => {
  const setupNew = async () => {
    const s = await setupReviewDraft({
      inReview: true,
      reviews: [{ state: 'open' }],
      authors: 2,
    });
    const review = s.made[0].review;
    await confirmOveralls(review);
    return { ...s, review, reviewerId: s.made[0].reviewer.id };
  };

  it('publishes the droplet itself and the review', async () => {
    const s = await setupNew();

    const res = await publishReview(s.draft.id, {
      reviewerId: s.reviewerId,
      originalDropletId: null,
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      slug: s.draft.slug,
      dropletId: s.draft.id,
      reviewId: s.review.id,
    });
    const row = await readDraft(s.draft.id);
    expect(row.status).toBe('published');
    expect(row.inReview).toBe(false);
    expect((await reviewsOf(s.draft.id))[0].state).toBe('published');
    const announcements = await announcementsFor([s.draft.id]);
    expect(announcements).toHaveLength(2);
    expect(announcements.map((a) => a.authorized_user.id).sort()).toEqual(
      s.authorRows.map((a) => a.id).sort(),
    );
    expect(announcements[0].content).toBe(`"${s.draft.name}" was reviewed and published.`);
  });

  it('answers 409 to a second publish, and leaves the review published', async () => {
    const s = await setupNew();
    const body = { reviewerId: s.reviewerId, originalDropletId: null };
    expect((await publishReview(s.draft.id, body)).status).toBe(200);
    const announced = (await announcementsFor([s.draft.id])).length;

    const again = await publishReview(s.draft.id, body);

    expect(again.status).toBe(409);
    expect(await announcementsFor([s.draft.id])).toHaveLength(announced);
    expect((await reviewsOf(s.draft.id))[0].state).toBe('published');
  });

  it('answers 409 when the body names an original for a new droplet', async () => {
    const s = await setupNew();
    const other = await strapi
      .documents(DROPLET_UID)
      .create({ data: dropletData({ status: 'published' }) });

    const res = await publishReview(s.draft.id, {
      reviewerId: s.reviewerId,
      originalDropletId: other.id,
    });

    expect(res.status).toBe(409);
    expect((await readDraft(s.draft.id)).status).toBe('draft');
  });

  it('rolls back when an announcement fails', async () => {
    const s = await setupNew();
    const spy = failAfter(ANNOUNCEMENT_UID, 'create');
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});
    try {
      const res = await publishReview(s.draft.id, {
        reviewerId: s.reviewerId,
        originalDropletId: null,
      });
      expect(spy).toHaveBeenCalled();
      expect(res.status).toBe(500);
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }

    const row = await readDraft(s.draft.id);
    expect(row.status).toBe('draft');
    expect(row.inReview).toBe(true);
    expect((await reviewsOf(s.draft.id))[0].state).toBe('open');
    expect(await announcementsFor([s.draft.id])).toHaveLength(0);
  });
});
