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
  AI_SCORING_RUN_UID,
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
const post = (path, body) =>
  rest().post(`/api/ai-scoring-runs/${path}`).set(auth()).send(body);

let droplet;
let lesson;
let otherLesson;
let reviewer;
let other;
let review;
let tone;
let clarity;

const createCriterion = (overrides) =>
  strapi.documents(REVIEW_CRITERION_UID).create({ data: reviewCriterionData(overrides) });

const runRow = (id) => strapi.db.query(AI_SCORING_RUN_UID).findOne({ where: { id } });
const runsOf = (reviewId) =>
  strapi.db.query(AI_SCORING_RUN_UID).findMany({ where: { review: { id: reviewId } } });
const scoreRow = (key) =>
  strapi.db.query(REVIEW_SCORE_UID).findOne({
    where: { key },
    populate: { review: true, lesson: true, criterion: true },
  });

// No progress for 11 minutes, as after an ECS restart mid-run. Raw SQL,
// because the Query Engine sets updatedAt itself.
const makeStale = (id) =>
  strapi.db
    .connection('ai_scoring_runs')
    .where({ id })
    .update({ updated_at: new Date(Date.now() - 11 * 60 * 1000) });

const startBody = (overrides = {}) => ({
  reviewId: review.id,
  userId: reviewer.id,
  model: 'claude-sonnet-5-5',
  promptVersion: '2026-10-29.1',
  ...overrides,
});

const start = (overrides) => post('start', startBody(overrides));
const beat = (runId, overrides = {}) =>
  post('heartbeat', { runId, userId: reviewer.id, inputTokens: 0, outputTokens: 0, ...overrides });

const finishBody = (runId, overrides = {}) => ({
  runId,
  userId: reviewer.id,
  runState: 'done',
  failedLessons: [],
  inputTokens: 1200,
  outputTokens: 300,
  error: null,
  scores: [
    { lessonId: lesson.id, criterionId: tone.id, aiValue: 4, aiRationale: 'Warm opening.' },
    { lessonId: lesson.id, criterionId: clarity.id, aiValue: 2, aiRationale: 'The quiz is unclear.' },
    { lessonId: null, criterionId: tone.id, aiValue: 3, aiRationale: 'Even voice.' },
    { lessonId: null, criterionId: clarity.id, aiValue: 3, aiRationale: 'Mostly clear.' },
  ],
  ...overrides,
});

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  // Only this test's criteria are active, so the run's snapshot is exact.
  await strapi.db.query(REVIEW_CRITERION_UID).updateMany({ where: {}, data: { active: false } });
  droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData({ inReview: true }) });
  lesson = await strapi
    .documents(LESSON_UID)
    .create({ data: lessonData({ droplets: [droplet.documentId] }) });
  otherLesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
  reviewer = await strapi.documents(USER_UID).create({ data: userData() });
  other = await strapi.documents(USER_UID).create({ data: userData() });
  review = await strapi.documents(REVIEW_UID).create({
    data: reviewData({
      droplet: droplet.documentId,
      reviewer: reviewer.documentId,
      state: 'open',
    }),
  });
  clarity = await createCriterion({ order: 2 });
  tone = await createCriterion({ order: 1 });
  await createCriterion({ order: 3, active: false });
});

describe('POST /ai-scoring-runs/start', () => {
  it('creates a queued run with the model, prompt version and active criteria in order', async () => {
    const res = await start();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      dropletId: droplet.id,
      run: expect.objectContaining({ id: expect.any(Number), runState: 'queued' }),
      criteria: [
        expect.objectContaining({ id: tone.id, name: tone.name, order: 1 }),
        expect.objectContaining({ id: clarity.id, name: clarity.name, order: 2 }),
      ],
    });
    const row = await runRow(res.body.data.run.id);
    expect(row).toMatchObject({
      runState: 'queued',
      model: 'claude-sonnet-5-5',
      promptVersion: '2026-10-29.1',
    });
    expect(row.criteria.map((c) => c.id)).toEqual([tone.id, clarity.id]);
    expect(row.criteria[0]).toEqual({
      id: tone.id,
      name: tone.name,
      lessonDescription: tone.lessonDescription,
      overallDescription: tone.overallDescription,
      order: 1,
    });
  });

  it('refuses anyone but the reviewer', async () => {
    const res = await start({ userId: other.id });

    expect(res.status).toBe(403);
    expect(await runsOf(review.id)).toHaveLength(0);
  });

  it('refuses a review that is no longer open', async () => {
    await strapi
      .documents(REVIEW_UID)
      .update({ documentId: review.documentId, data: { state: 'sent' } });

    const res = await start();

    expect(res.status).toBe(409);
    expect(await runsOf(review.id)).toHaveLength(0);
  });

  it('refuses a droplet that was withdrawn from review, though the review is still open', async () => {
    await strapi
      .documents(DROPLET_UID)
      .update({ documentId: droplet.documentId, data: { inReview: false } });

    const res = await start();

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('This droplet is not in review');
    expect(await runsOf(review.id)).toHaveLength(0);
  });

  it('refuses a second run while one is queued or running', async () => {
    const first = await start();
    const second = await start();
    await beat(first.body.data.run.id);
    const third = await start();

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(second.body.error.message).toMatch(/already running/);
    expect(third.status).toBe(409);
    expect(await runsOf(review.id)).toHaveLength(1);
  });

  // On SQLite (one connection, FOR UPDATE ignored) the two run one after the
  // other, so this checks the outcome, not the Postgres row lock.
  it('creates exactly one run when two starts are sent together', async () => {
    const results = await Promise.all([start(), start()]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await runsOf(review.id)).toHaveLength(1);
  });

  it('marks a run with no progress for 10 minutes failed, then starts a new one', async () => {
    const first = await start();
    await makeStale(first.body.data.run.id);

    const second = await start();

    expect(second.status).toBe(200);
    const dead = await runRow(first.body.data.run.id);
    expect(dead.runState).toBe('failed');
    expect(dead.error).toBe('Stopped: no progress for 10 minutes.');
    expect(dead.finishedAt).not.toBeNull();
    expect((await runRow(second.body.data.run.id)).runState).toBe('queued');
  });

  it('allows a new run once the last one has ended', async () => {
    const first = await start();
    await post('finish', finishBody(first.body.data.run.id));

    expect((await start()).status).toBe(200);
  });

  it('refuses when no criterion is active', async () => {
    await strapi.db.query(REVIEW_CRITERION_UID).updateMany({ where: {}, data: { active: false } });

    const res = await start();

    expect(res.status).toBe(409);
    expect(await runsOf(review.id)).toHaveLength(0);
  });

  it('rejects unknown keys and bad values', async () => {
    expect((await post('start', { ...startBody(), extra: 1 })).status).toBe(400);
    expect((await post('start', startBody({ reviewId: 'x' }))).status).toBe(400);
    expect((await post('start', startBody({ model: '' }))).status).toBe(400);
    expect(await runsOf(review.id)).toHaveLength(0);
  });
});

describe('POST /ai-scoring-runs/heartbeat', () => {
  it('marks the run running and keeps a slow run from looking dead', async () => {
    const { body } = await start();
    const runId = body.data.run.id;
    await makeStale(runId);

    const res = await beat(runId);

    expect(res.status).toBe(200);
    expect(res.body.data.run.runState).toBe('running');
    const row = await runRow(runId);
    expect(row.startedAt).not.toBeNull();
    // Fresh progress: a start now waits for this run instead of failing it.
    expect((await start()).status).toBe(409);
    expect((await runRow(runId)).runState).toBe('running');
  });

  it('keeps the first startedAt', async () => {
    const { body } = await start();
    const runId = body.data.run.id;
    const first = await beat(runId);
    const second = await beat(runId);

    expect(second.body.data.run.startedAt).toBe(first.body.data.run.startedAt);
  });

  it('refuses a run that has already ended, and anyone but the reviewer', async () => {
    const { body } = await start();
    const runId = body.data.run.id;

    expect((await beat(runId, { userId: other.id })).status).toBe(403);
    await makeStale(runId);
    await start(); // marks it failed
    expect((await beat(runId)).status).toBe(409);
  });

  it('ends the run as failed when the review was sent meanwhile', async () => {
    const { body } = await start();
    await strapi
      .documents(REVIEW_UID)
      .update({ documentId: review.documentId, data: { state: 'sent' } });

    const res = await beat(body.data.run.id, { inputTokens: 900, outputTokens: 80 });

    expect(res.status).toBe(200);
    expect(res.body.data.run.runState).toBe('failed');
    // The lessons already scored were paid for: their tokens are kept.
    expect(await runRow(body.data.run.id)).toMatchObject({
      error: 'The review was sent before scoring finished.',
      inputTokens: 900,
      outputTokens: 80,
    });
  });

  it('records the tokens used so far, so a run cut short still shows its cost', async () => {
    const { body } = await start();
    const runId = body.data.run.id;

    await beat(runId, { inputTokens: 500, outputTokens: 40 });
    await beat(runId, { inputTokens: 1100, outputTokens: 95 });

    expect(await runRow(runId)).toMatchObject({ inputTokens: 1100, outputTokens: 95 });
  });

  it('rejects a heartbeat without token counts', async () => {
    const { body } = await start();

    const res = await post('heartbeat', { runId: body.data.run.id, userId: reviewer.id });

    expect(res.status).toBe(400);
  });
});

describe('POST /ai-scoring-runs/finish', () => {
  it('saves a suggestion for every criterion on the lesson and the Overall Score, and ends the run', async () => {
    const { body } = await start();
    const runId = body.data.run.id;

    const res = await post('finish', finishBody(runId));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      dropletId: droplet.id,
      run: { id: runId, runState: 'done' },
      saved: 4,
      kept: 0,
      dropped: 0,
    });
    const lessonTone = await scoreRow(`${review.id}:${lesson.id}:${tone.id}`);
    expect(lessonTone).toMatchObject({
      aiValue: 4,
      aiRationale: 'Warm opening.',
      value: null,
      criterionName: tone.name,
    });
    expect(lessonTone.review.id).toBe(review.id);
    expect(lessonTone.lesson.id).toBe(lesson.id);
    expect(lessonTone.criterion.id).toBe(tone.id);
    const overall = await scoreRow(`${review.id}:overall:${clarity.id}`);
    expect(overall).toMatchObject({ aiValue: 3, value: null });
    expect(overall.lesson).toBeNull();

    const row = await runRow(runId);
    expect(row).toMatchObject({
      runState: 'done',
      inputTokens: 1200,
      outputTokens: 300,
      error: null,
    });
    expect(row.failedLessons).toEqual([]);
    expect(row.finishedAt).not.toBeNull();
  });

  it('replaces unconfirmed suggestions and never touches a score the reviewer set', async () => {
    const first = await start();
    await post('finish', finishBody(first.body.data.run.id));
    // The reviewer confirms one lesson score with their own value.
    const confirmedKey = `${review.id}:${lesson.id}:${tone.id}`;
    const confirmed = await scoreRow(confirmedKey);
    await strapi
      .documents(REVIEW_SCORE_UID)
      .update({ documentId: confirmed.documentId, data: { value: 5 } });

    const second = await start();
    const res = await post(
      'finish',
      finishBody(second.body.data.run.id, {
        scores: finishBody(0).scores.map((s) => ({ ...s, aiValue: 1, aiRationale: 'Run again.' })),
      }),
    );

    expect(res.body.data).toMatchObject({ saved: 3, kept: 1 });
    expect(await scoreRow(confirmedKey)).toMatchObject({
      value: 5,
      aiValue: 4,
      aiRationale: 'Warm opening.',
    });
    expect(await scoreRow(`${review.id}:${lesson.id}:${clarity.id}`)).toMatchObject({
      value: null,
      aiValue: 1,
      aiRationale: 'Run again.',
    });
  });

  it('records a partial run and the lessons that failed', async () => {
    const { body } = await start();

    const res = await post(
      'finish',
      finishBody(body.data.run.id, {
        runState: 'partial',
        failedLessons: [otherLesson.id],
        error: 'Lesson 2: refusal',
      }),
    );

    expect(res.status).toBe(200);
    const row = await runRow(body.data.run.id);
    expect(row).toMatchObject({ runState: 'partial', error: 'Lesson 2: refusal' });
    expect(row.failedLessons).toEqual([otherLesson.id]);
  });

  it('refuses a run that was already marked failed, and saves nothing', async () => {
    const { body } = await start();
    await makeStale(body.data.run.id);
    await start(); // marks it failed

    const res = await post('finish', finishBody(body.data.run.id));

    expect(res.status).toBe(409);
    expect(await scoreRow(`${review.id}:${lesson.id}:${tone.id}`)).toBeNull();
  });

  it('saves nothing when the review was sent meanwhile, and ends the run as failed', async () => {
    const { body } = await start();
    await strapi
      .documents(REVIEW_UID)
      .update({ documentId: review.documentId, data: { state: 'sent' } });

    const res = await post('finish', finishBody(body.data.run.id));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ saved: 0, run: { runState: 'failed' } });
    expect(await scoreRow(`${review.id}:${lesson.id}:${tone.id}`)).toBeNull();
  });

  it('drops only the suggestions for a lesson that left the droplet mid-run', async () => {
    const { body } = await start();
    const runId = body.data.run.id;

    const res = await post(
      'finish',
      finishBody(runId, {
        scores: [
          ...finishBody(runId).scores,
          { lessonId: otherLesson.id, criterionId: tone.id, aiValue: 3, aiRationale: 'x' },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ saved: 4, kept: 0, dropped: 1 });
    expect(await scoreRow(`${review.id}:${lesson.id}:${tone.id}`)).toMatchObject({ aiValue: 4 });
    expect(await scoreRow(`${review.id}:${otherLesson.id}:${tone.id}`)).toBeNull();
  });

  it('refuses a criterion outside the run, and saves nothing', async () => {
    const { body } = await start();
    const runId = body.data.run.id;
    const extra = await createCriterion({ order: 4 });

    const res = await post(
      'finish',
      finishBody(runId, {
        scores: [
          ...finishBody(runId).scores,
          { lessonId: null, criterionId: extra.id, aiValue: 3, aiRationale: 'x' },
        ],
      }),
    );

    expect(res.status).toBe(400);
    expect(await scoreRow(`${review.id}:${lesson.id}:${tone.id}`)).toBeNull();
    expect((await runRow(runId)).runState).toBe('queued');
  });

  it('ends a failed run with no scores', async () => {
    const { body } = await start();

    const res = await post(
      'finish',
      finishBody(body.data.run.id, { runState: 'failed', scores: [], error: 'Could not read the droplet.' }),
    );

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ saved: 0, run: { runState: 'failed' } });
  });

  it('refuses anyone but the reviewer', async () => {
    const { body } = await start();

    const res = await post('finish', finishBody(body.data.run.id, { userId: other.id }));

    expect(res.status).toBe(403);
    expect((await runRow(body.data.run.id)).runState).toBe('queued');
  });

  it('rejects bad bodies before touching anything', async () => {
    const { body } = await start();
    const runId = body.data.run.id;
    const bad = [
      { ...finishBody(runId), extra: 1 },
      finishBody(runId, { runState: 'running' }),
      finishBody(runId, { failedLessons: ['x'] }),
      finishBody(runId, { inputTokens: -1 }),
      finishBody(runId, {
        scores: [{ lessonId: null, criterionId: tone.id, aiValue: 6, aiRationale: 'x' }],
      }),
      finishBody(runId, {
        scores: [{ lessonId: null, criterionId: tone.id, aiValue: 3, aiRationale: '' }],
      }),
      finishBody(runId, {
        scores: [{ lessonId: null, criterionId: tone.id, aiValue: 3, aiRationale: 'x', value: 5 }],
      }),
    ];

    for (const b of bad) expect((await post('finish', b)).status).toBe(400);
    expect((await runRow(runId)).runState).toBe('queued');
  });
});
