const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  LESSON_UID,
  USER_UID,
  REVIEW_UID,
  REVIEW_SCORE_UID,
  REVIEW_CRITERION_UID,
  dropletData,
  lessonData,
  userData,
  reviewData,
  reviewCriterionData,
} = require('../helpers/fixtures');

let strapi;
let token;

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });

const upsert = (body) =>
  rest().post('/api/review-scores/upsert').set(auth()).send(body);
const acceptAi = (body) =>
  rest().post('/api/review-scores/accept-ai').set(auth()).send(body);
const unconfirm = (body) =>
  rest().post('/api/review-scores/unconfirm').set(auth()).send(body);

let droplet;
let lesson;
let reviewer;
let other;
let review;
let tone;
let clarity;

const createReview = async (overrides = {}) =>
  strapi.documents(REVIEW_UID).create({
    data: reviewData({
      droplet: droplet.documentId,
      reviewer: reviewer.documentId,
      state: 'open',
      ...overrides,
    }),
  });

const createCriterion = (overrides) =>
  strapi.documents(REVIEW_CRITERION_UID).create({ data: reviewCriterionData(overrides) });

// Reads the stored rows for a key through the Query Engine.
const rowsFor = (key) =>
  strapi.db.query(REVIEW_SCORE_UID).findMany({
    where: { key },
    populate: { review: true, lesson: true, criterion: true },
  });

const body = (overrides = {}) => ({
  reviewId: review.id,
  lessonId: lesson.id,
  criterionId: tone.id,
  value: 4,
  userId: reviewer.id,
  ...overrides,
});

// A score row as Score with AI (ODY-814) leaves it: a suggestion, maybe confirmed.
const seedScore = (criterion, { lessonId, aiValue = null, value = null }) =>
  strapi.documents(REVIEW_SCORE_UID).create({
    data: {
      key: `${review.id}:${lessonId ?? 'overall'}:${criterion.id}`,
      criterionName: criterion.name,
      review: review.documentId,
      criterion: criterion.documentId,
      ...(lessonId ? { lesson: lesson.documentId } : {}),
      aiValue,
      value,
    },
  });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
  lesson = await strapi
    .documents(LESSON_UID)
    .create({ data: lessonData({ droplets: [droplet.documentId] }) });
  reviewer = await strapi.documents(USER_UID).create({ data: userData() });
  other = await strapi.documents(USER_UID).create({ data: userData() });
  review = await createReview();
  tone = await createCriterion();
  clarity = await createCriterion({ order: 2 });
});

describe('POST /review-scores/upsert', () => {
  it('creates the score with its key, relations and criterion name', async () => {
    const res = await upsert(body());

    expect(res.status).toBe(200);
    const key = `${review.id}:${lesson.id}:${tone.id}`;
    expect(res.body.data).toEqual({
      dropletId: droplet.id,
      score: expect.objectContaining({ key, value: 4, aiValue: null, criterionName: tone.name }),
    });
    const rows = await rowsFor(key);
    expect(rows).toHaveLength(1);
    expect(rows[0].review.id).toBe(review.id);
    expect(rows[0].lesson.id).toBe(lesson.id);
    expect(rows[0].criterion.id).toBe(tone.id);
  });

  it('updates the same row on a second save, and leaves the AI fields alone', async () => {
    await seedScore(tone, { lessonId: lesson.id, aiValue: 2 });

    const res = await upsert(body({ value: 5 }));

    expect(res.status).toBe(200);
    const rows = await rowsFor(`${review.id}:${lesson.id}:${tone.id}`);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(5);
    expect(rows[0].aiValue).toBe(2);
  });

  it('saves the Overall Score with lessonId null', async () => {
    const res = await upsert(body({ lessonId: null }));

    expect(res.status).toBe(200);
    const rows = await rowsFor(`${review.id}:overall:${tone.id}`);
    expect(rows).toHaveLength(1);
    expect(rows[0].lesson).toBeNull();
  });

  // On SQLite (one connection, FOR UPDATE ignored) these run one after the
  // other, so this checks the outcome, not the Postgres row lock. The race
  // itself is covered by the next test.
  it('keeps one row when two saves for the same key are sent together', async () => {
    const [a, b] = await Promise.all([upsert(body({ value: 2 })), upsert(body({ value: 3 }))]);

    expect([a.status, b.status]).toEqual([200, 200]);
    const rows = await rowsFor(`${review.id}:${lesson.id}:${tone.id}`);
    expect(rows).toHaveLength(1);
    expect([2, 3]).toContain(rows[0].value);
  });

  it('retries as an update when another request created the row first', async () => {
    // Simulates the losing side of a race: the other request's row is already
    // committed, but this request's first lookup ran before it and missed it.
    // Its insert then fails on the unique key, and the rerun must update.
    const key = `${review.id}:${lesson.id}:${tone.id}`;
    await seedScore(tone, { lessonId: lesson.id, aiValue: 3, value: 1 });
    const realDocuments = strapi.documents.bind(strapi);
    let raced = false;
    const spy = jest.spyOn(strapi, 'documents').mockImplementation((uid) => {
      const service = realDocuments(uid);
      if (uid !== REVIEW_SCORE_UID || raced) return service;
      return {
        ...service,
        findFirst: async (params) => {
          if (params?.filters?.key !== key) return service.findFirst(params);
          raced = true;
          return null;
        },
      };
    });

    let res;
    try {
      res = await upsert(body({ value: 5 }));
    } finally {
      spy.mockRestore();
    }

    expect(raced).toBe(true);
    expect(res.status).toBe(200);
    const rows = await rowsFor(key);
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(5);
    expect(rows[0].aiValue).toBe(3);
  });

  it('does not retry a failure when no row with the key exists, and answers 500', async () => {
    const realDocuments = strapi.documents.bind(strapi);
    let creates = 0;
    const spy = jest.spyOn(strapi, 'documents').mockImplementation((uid) => {
      const service = realDocuments(uid);
      if (uid !== REVIEW_SCORE_UID) return service;
      return {
        ...service,
        create: async () => {
          creates++;
          throw new Error('forced failure');
        },
      };
    });
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});

    let res;
    try {
      res = await upsert(body());
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }

    expect(res.status).toBe(500);
    expect(res.body.error.message).toBe('Failed to save the score.');
    expect(creates).toBe(1);
    expect(await rowsFor(`${review.id}:${lesson.id}:${tone.id}`)).toHaveLength(0);
  });

  it("refuses a user who isn't the review's reviewer", async () => {
    const res = await upsert(body({ userId: other.id }));

    expect(res.status).toBe(403);
    expect(await rowsFor(`${review.id}:${lesson.id}:${tone.id}`)).toHaveLength(0);
  });

  it.each(['sent', 'published'])('refuses a %s review', async (state) => {
    review = await createReview({ state });

    const res = await upsert(body());

    expect(res.status).toBe(409);
    expect(await rowsFor(`${review.id}:${lesson.id}:${tone.id}`)).toHaveLength(0);
  });

  it('refuses an inactive criterion', async () => {
    const retired = await createCriterion({ active: false });

    const res = await upsert(body({ criterionId: retired.id }));

    expect(res.status).toBe(400);
    expect(await rowsFor(`${review.id}:${lesson.id}:${retired.id}`)).toHaveLength(0);
  });

  it("refuses a lesson outside the review's droplet", async () => {
    const stray = await strapi.documents(LESSON_UID).create({ data: lessonData() });

    const res = await upsert(body({ lessonId: stray.id }));

    expect(res.status).toBe(400);
  });

  it('answers 404 for an unknown review and 400 for an unknown criterion', async () => {
    expect((await upsert(body({ reviewId: 999999 }))).status).toBe(404);
    const res = await upsert(body({ criterionId: 999999 }));
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Criterion not found');
  });

  it.each([
    ['0', { value: 0 }],
    ['6', { value: 6 }],
    ['a fraction', { value: 2.5 }],
    ['a string', { value: '3' }],
    ['null', { value: null }],
  ])('refuses a value of %s', async (_label, overrides) => {
    const res = await upsert(body(overrides));

    expect(res.status).toBe(400);
    expect(await rowsFor(`${review.id}:${lesson.id}:${tone.id}`)).toHaveLength(0);
  });

  it.each([
    ['an unknown key', { aiValue: 5 }],
    ['no userId', { userId: undefined }],
    ['no lessonId', { lessonId: undefined }],
    ['a string reviewId', { reviewId: String(1) }],
    ['a zero criterionId', { criterionId: 0 }],
  ])('answers 400 for %s', async (_label, overrides) => {
    const res = await upsert(body(overrides));
    expect(res.status).toBe(400);
  });
});

describe('POST /review-scores/accept-ai', () => {
  const acceptBody = (overrides = {}) => ({
    reviewId: review.id,
    lessonId: lesson.id,
    userId: reviewer.id,
    ...overrides,
  });

  it("confirms only the unconfirmed suggestions and leaves the reviewer's own scores alone", async () => {
    const pending = await seedScore(tone, { lessonId: lesson.id, aiValue: 4 });
    const own = await seedScore(clarity, { lessonId: lesson.id, aiValue: 2, value: 5 });
    const overall = await seedScore(tone, { lessonId: null, aiValue: 3 });

    const res = await acceptAi(acceptBody());

    expect(res.status).toBe(200);
    expect(res.body.data.dropletId).toBe(droplet.id);
    expect(res.body.data.scores).toEqual([
      expect.objectContaining({ key: pending.key, value: 4, aiValue: 4 }),
    ]);
    expect((await rowsFor(pending.key))[0].value).toBe(4);
    expect((await rowsFor(own.key))[0].value).toBe(5);
    // Another scope (the Overall Score) is untouched.
    expect((await rowsFor(overall.key))[0].value).toBeNull();
  });

  it('confirms the Overall Score with lessonId null', async () => {
    const overall = await seedScore(tone, { lessonId: null, aiValue: 3 });
    const lessonScore = await seedScore(clarity, { lessonId: lesson.id, aiValue: 1 });

    const res = await acceptAi(acceptBody({ lessonId: null }));

    expect(res.status).toBe(200);
    expect((await rowsFor(overall.key))[0].value).toBe(3);
    expect((await rowsFor(lessonScore.key))[0].value).toBeNull();
  });

  it('skips suggestions on an inactive criterion', async () => {
    const retired = await createCriterion({ active: false });
    const score = await seedScore(retired, { lessonId: lesson.id, aiValue: 4 });

    const res = await acceptAi(acceptBody());

    expect(res.status).toBe(200);
    expect(res.body.data.scores).toEqual([]);
    expect((await rowsFor(score.key))[0].value).toBeNull();
  });

  it("answers 400 for a lesson outside the review's droplet and changes nothing", async () => {
    const stray = await strapi.documents(LESSON_UID).create({ data: lessonData() });
    const score = await seedScore(tone, { lessonId: lesson.id, aiValue: 4 });

    const res = await acceptAi(acceptBody({ lessonId: stray.id }));

    expect(res.status).toBe(400);
    expect((await rowsFor(score.key))[0].value).toBeNull();
  });

  it("doesn't confirm a lesson id sharing the digits, or another review's rows", async () => {
    const target = await seedScore(tone, { lessonId: lesson.id, aiValue: 4 });
    const lookalike = await strapi.documents(LESSON_UID).create({
      data: lessonData({ droplets: [droplet.documentId] }),
    });
    const lookalikeKey = `${review.id}:${lesson.id}1:${tone.id}`;
    await strapi.documents(REVIEW_SCORE_UID).create({
      data: {
        key: lookalikeKey,
        criterionName: tone.name,
        review: review.documentId,
        criterion: tone.documentId,
        lesson: lookalike.documentId,
        aiValue: 4,
      },
    });
    const otherReview = await createReview({ round: 2 });
    // Same key prefix as the target, but on another review: only the review filter excludes it.
    const otherKey = `${review.id}:${lesson.id}:${clarity.id}`;
    await strapi.documents(REVIEW_SCORE_UID).create({
      data: {
        key: otherKey,
        criterionName: clarity.name,
        review: otherReview.documentId,
        criterion: clarity.documentId,
        lesson: lesson.documentId,
        aiValue: 2,
      },
    });

    const res = await acceptAi(acceptBody());

    expect(res.status).toBe(200);
    expect(res.body.data.scores).toEqual([expect.objectContaining({ key: target.key })]);
    expect((await rowsFor(target.key))[0].value).toBe(4);
    expect((await rowsFor(lookalikeKey))[0].value).toBeNull();
    expect((await rowsFor(otherKey))[0].value).toBeNull();
  });

  it("refuses a user who isn't the review's reviewer", async () => {
    const score = await seedScore(tone, { lessonId: lesson.id, aiValue: 4 });

    const res = await acceptAi(acceptBody({ userId: other.id }));

    expect(res.status).toBe(403);
    expect((await rowsFor(score.key))[0].value).toBeNull();
  });

  it('refuses a sent review', async () => {
    review = await createReview({ state: 'sent' });
    const score = await seedScore(tone, { lessonId: lesson.id, aiValue: 4 });

    const res = await acceptAi(acceptBody());

    expect(res.status).toBe(409);
    expect((await rowsFor(score.key))[0].value).toBeNull();
  });

  it('answers 400 for an unknown key', async () => {
    const res = await acceptAi(acceptBody({ value: 3 }));
    expect(res.status).toBe(400);
  });
});

describe('POST /review-scores/unconfirm', () => {
  const unconfirmBody = (overrides = {}) => ({
    reviewId: review.id,
    lessonId: lesson.id,
    userId: reviewer.id,
    ...overrides,
  });

  it("clears confirmed suggestions and keeps the reviewer's own scores", async () => {
    const confirmed = await seedScore(tone, { lessonId: lesson.id, aiValue: 4, value: 4 });
    const changed = await seedScore(clarity, { lessonId: lesson.id, aiValue: 2, value: 5 });
    const manual = await seedScore(await createCriterion({ order: 3 }), {
      lessonId: lesson.id,
      value: 3,
    });
    const overall = await seedScore(tone, { lessonId: null, aiValue: 3, value: 3 });

    const res = await unconfirm(unconfirmBody());

    expect(res.status).toBe(200);
    expect(res.body.data.dropletId).toBe(droplet.id);
    expect(res.body.data.scores).toEqual([
      expect.objectContaining({ key: confirmed.key, value: null, aiValue: 4 }),
    ]);
    expect((await rowsFor(confirmed.key))[0].value).toBeNull();
    expect((await rowsFor(changed.key))[0].value).toBe(5);
    expect((await rowsFor(manual.key))[0].value).toBe(3);
    // Another scope (the Overall Score) is untouched.
    expect((await rowsFor(overall.key))[0].value).toBe(3);
  });

  it('clears the Overall Score with lessonId null and leaves lessons alone', async () => {
    const overall = await seedScore(tone, { lessonId: null, aiValue: 3, value: 3 });
    const lessonScore = await seedScore(clarity, { lessonId: lesson.id, aiValue: 1, value: 1 });

    const res = await unconfirm(unconfirmBody({ lessonId: null }));

    expect(res.status).toBe(200);
    expect(res.body.data.scores).toHaveLength(1);
    expect((await rowsFor(overall.key))[0].value).toBeNull();
    expect((await rowsFor(lessonScore.key))[0].value).toBe(1);
  });

  it("doesn't touch a lesson id sharing the digits, or another review's rows", async () => {
    const target = await seedScore(tone, { lessonId: lesson.id, aiValue: 4, value: 4 });
    const lookalike = await strapi.documents(LESSON_UID).create({
      data: lessonData({ droplets: [droplet.documentId] }),
    });
    const lookalikeKey = `${review.id}:${lesson.id}1:${tone.id}`;
    await strapi.documents(REVIEW_SCORE_UID).create({
      data: {
        key: lookalikeKey,
        criterionName: tone.name,
        review: review.documentId,
        criterion: tone.documentId,
        lesson: lookalike.documentId,
        aiValue: 4,
        value: 4,
      },
    });
    const otherReview = await createReview({ round: 2 });
    // Same key prefix as the target, but on another review: only the review filter excludes it.
    const otherKey = `${review.id}:${lesson.id}:${clarity.id}`;
    await strapi.documents(REVIEW_SCORE_UID).create({
      data: {
        key: otherKey,
        criterionName: clarity.name,
        review: otherReview.documentId,
        criterion: clarity.documentId,
        lesson: lesson.documentId,
        aiValue: 2,
        value: 2,
      },
    });

    const res = await unconfirm(unconfirmBody());

    expect(res.status).toBe(200);
    expect(res.body.data.scores).toEqual([expect.objectContaining({ key: target.key })]);
    expect((await rowsFor(target.key))[0].value).toBeNull();
    expect((await rowsFor(lookalikeKey))[0].value).toBe(4);
    expect((await rowsFor(otherKey))[0].value).toBe(2);
  });

  it("refuses a user who isn't the review's reviewer", async () => {
    const score = await seedScore(tone, { lessonId: lesson.id, aiValue: 4, value: 4 });

    const res = await unconfirm(unconfirmBody({ userId: other.id }));

    expect(res.status).toBe(403);
    expect((await rowsFor(score.key))[0].value).toBe(4);
  });

  it('leaves a confirmed row on an inactive criterion untouched', async () => {
    const retired = await createCriterion({ active: false });
    const score = await seedScore(retired, { lessonId: lesson.id, aiValue: 4, value: 4 });

    const res = await unconfirm(unconfirmBody());

    expect(res.status).toBe(200);
    expect(res.body.data.scores).toEqual([]);
    expect((await rowsFor(score.key))[0].value).toBe(4);
  });

  it("answers 400 for a lesson outside the review's droplet", async () => {
    const stray = await strapi.documents(LESSON_UID).create({ data: lessonData() });

    const res = await unconfirm(unconfirmBody({ lessonId: stray.id }));

    expect(res.status).toBe(400);
  });
});
