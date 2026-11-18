const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  DROPLET_UID,
  REVIEW_CRITERION_UID,
  REVIEW_UID,
  REVIEW_COMMENT_UID,
  REVIEW_SCORE_UID,
  AI_SCORING_RUN_UID,
  dropletData,
  reviewData,
  reviewScoreData,
  reviewCriterionData,
} = require('../helpers/fixtures');
const { expectUniqueViolation } = require('../helpers/unique');

let strapi;
let token;

const ANNOUNCEMENT_UID = 'api::announcement.announcement';
const createScore = (overrides) =>
  strapi
    .documents(REVIEW_SCORE_UID)
    .create({ data: reviewScoreData(overrides) });
const createReview = (overrides) =>
  strapi.documents(REVIEW_UID).create({ data: reviewData(overrides) });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

describe('review-score key', () => {
  it('rejects a duplicate key in the Document Service', async () => {
    const first = await createScore();
    await expect(createScore({ key: first.key })).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('rejects a duplicate key at the database level (unique index)', async () => {
    const key = '9001:overall:1';
    await expectUniqueViolation(
      strapi.db.transaction(async () => {
        const q = strapi.db.query(REVIEW_SCORE_UID);
        const first = await q.create({
          data: { documentId: 'dupa', key, criterionName: 'T' },
        });
        expect(first.id).toBeDefined();
        await q.create({
          data: { documentId: 'dupb', key, criterionName: 'T' },
        });
      }),
      { table: 'review_scores', column: 'key', index: 'review_scores_key_uq' },
    );
  });

  // SQLite serializes creates, so the app check rejects; the DB-level test above proves the index.
  it('leaves one row when two creates share a key', async () => {
    const key = '9002:overall:1';
    const results = await Promise.allSettled([
      createScore({ key }),
      createScore({ key }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected');
    expect(rejected.reason.name).toBe('ValidationError');
    const count = await strapi
      .documents(REVIEW_SCORE_UID)
      .count({ filters: { key } });
    expect(count).toBe(1);
  });

  it('returns 400 for a duplicate key over REST', async () => {
    const first = await createScore();
    const res = await request(strapi.server.httpServer)
      .post('/api/review-scores')
      .set('Authorization', `Bearer ${token}`)
      .send({ data: { key: first.key, criterionName: 'Tone' } });
    expect(res.status).toBe(400);
  });

  it.each(['abc', '1:lesson:2', '1:2'])(
    'rejects malformed key %s',
    async (key) => {
      await expect(createScore({ key })).rejects.toThrow();
    },
  );

  it.each(['12:overall:3', '12:45:3'])('accepts key %s', async (key) => {
    await expect(createScore({ key })).resolves.toBeDefined();
  });

  it('enforces value and aiValue bounds', async () => {
    await expect(createScore({ value: 0 })).rejects.toThrow();
    await expect(createScore({ value: 6 })).rejects.toThrow();
    await expect(createScore({ aiValue: 6 })).rejects.toThrow();
    await expect(
      createScore({ value: null, aiValue: 3 }),
    ).resolves.toBeDefined();
  });
});

describe('review key and enums', () => {
  it('rejects a duplicate review key in the Document Service', async () => {
    const first = await createReview();
    await expect(createReview({ key: first.key })).rejects.toMatchObject({
      name: 'ValidationError',
    });
  });

  it('rejects a duplicate review key at the database level (unique index)', async () => {
    const key = '9003:1:1';
    await expectUniqueViolation(
      strapi.db.transaction(async () => {
        const q = strapi.db.query(REVIEW_UID);
        const first = await q.create({
          data: { documentId: 'rdupa', key, round: 1 },
        });
        expect(first.id).toBeDefined();
        await q.create({ data: { documentId: 'rdupb', key, round: 1 } });
      }),
      { table: 'reviews', column: 'key', index: 'reviews_key_uq' },
    );
  });

  it.each(['1:overall:1', '1:2'])(
    'rejects malformed review key %s',
    async (key) => {
      await expect(createReview({ key })).rejects.toThrow();
    },
  );

  it('accepts a well-formed review key', async () => {
    await expect(createReview({ key: '5:12:1' })).resolves.toBeDefined();
  });

  it('defaults review state to open and rejects unknown states', async () => {
    const review = await createReview();
    expect(review.state).toBe('open');
    await expect(createReview({ state: 'bogus' })).rejects.toThrow();
  });

  it('defaults runState to queued and rejects unknown values', async () => {
    const run = await strapi.documents(AI_SCORING_RUN_UID).create({ data: {} });
    expect(run.runState).toBe('queued');
    await expect(
      strapi
        .documents(AI_SCORING_RUN_UID)
        .create({ data: { runState: 'bogus' } }),
    ).rejects.toThrow();
  });

  it('rejects a comment with an unknown field', async () => {
    await expect(
      strapi.documents(REVIEW_COMMENT_UID).create({
        data: { field: 'title', anchor: { v: 1 }, body: 'x' },
      }),
    ).rejects.toThrow();
  });
});

describe('review-criterion', () => {
  it('does not route DELETE and keeps the criterion', async () => {
    const criterion = await strapi
      .documents(REVIEW_CRITERION_UID)
      .create({ data: reviewCriterionData() });
    const get = await request(strapi.server.httpServer)
      .get(`/api/review-criteria/${criterion.documentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    const res = await request(strapi.server.httpServer)
      .delete(`/api/review-criteria/${criterion.documentId}`)
      .set('Authorization', `Bearer ${token}`);
    expect([404, 405]).toContain(res.status);
    const still = await strapi
      .documents(REVIEW_CRITERION_UID)
      .findOne({ documentId: criterion.documentId });
    expect(still).not.toBeNull();
  });
});

describe('review relations', () => {
  it('links comments, replies and round-trips the anchor', async () => {
    const droplet = await strapi
      .documents(DROPLET_UID)
      .create({ data: dropletData() });
    const review = await createReview({ droplet: droplet.documentId });
    const anchor = {
      v: 1,
      field: 'description',
      quote: 'hello',
      prefix: '',
      suffix: '',
    };
    const comment = await strapi.documents(REVIEW_COMMENT_UID).create({
      data: {
        review: review.documentId,
        field: 'description',
        anchor,
        body: 'Top',
      },
    });
    const reply = await strapi.documents(REVIEW_COMMENT_UID).create({
      data: {
        review: review.documentId,
        field: 'description',
        anchor,
        body: 'Reply',
        parent: comment.documentId,
      },
    });

    const found = await strapi
      .documents(REVIEW_UID)
      .findOne({ documentId: review.documentId, populate: { comments: true } });
    expect(found.comments).toHaveLength(2);
    expect(
      found.comments.find((c) => c.documentId === comment.documentId).anchor,
    ).toEqual(anchor);

    const foundReply = await strapi
      .documents(REVIEW_COMMENT_UID)
      .findOne({ documentId: reply.documentId, populate: { parent: true } });
    expect(foundReply.parent.documentId).toBe(comment.documentId);
  });
});

describe('announcement types', () => {
  it.each(['review_feedback', 'review_published'])(
    'accepts type %s',
    async (type) => {
      await expect(
        strapi.documents(ANNOUNCEMENT_UID).create({
          data: {
            type,
            firstCreated: new Date().toISOString(),
            content: 'Review update',
          },
        }),
      ).resolves.toBeDefined();
    },
  );
});

describe('REST', () => {
  it('serves GET /api/review-scores with a full-access token', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/review-scores')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});
