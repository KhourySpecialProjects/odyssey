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

const scoreKey = (reviewId, lessonId, criterionId) =>
  `${reviewId}:${lessonId ?? 'overall'}:${criterionId}`;
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

const finding = (overrides = {}) => ({
  id: 'r-1',
  quote: 'Hello there',
  reason: 'Too casual.',
  lessonId: null,
  anchor: { v: 1, field: 'description', start: 0, end: 11 },
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
  // No runs from earlier tests, so they don't count against the monthly budget.
  await strapi.db.query(AI_SCORING_RUN_UID).deleteMany({ where: {} });
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

describe('POST /ai-scoring-runs/start, monthly budget', () => {
  const SETTINGS_UID = 'api::ai-scoring-setting.ai-scoring-setting';
  // The month after this one in Boston, such as "November 1" in October.
  const resetDay = () => {
    const boston = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    boston.setDate(1);
    boston.setMonth(boston.getMonth() + 1);
    return `${boston.toLocaleString('en-US', { month: 'long' })} 1`;
  };
  const usedUp = () =>
    `This month's Score with AI budget is used up. It resets on ${resetDay()}.`;

  const settingsRow = () => strapi.documents(SETTINGS_UID).findFirst();
  const setBudget = async (data) =>
    strapi.documents(SETTINGS_UID).update({ documentId: (await settingsRow()).documentId, data });
  // A run on no review that has spent `usd`: Sonnet input is $2 a million tokens.
  const runCosting = (usd, data = {}) =>
    strapi.documents(AI_SCORING_RUN_UID).create({
      data: { runState: 'done', model: 'claude-sonnet-5-5', inputTokens: usd * 500_000, ...data },
    });
  const goingRun = (usd) => runCosting(usd, { runState: 'running' });
  const moveToLastMonth = (id) =>
    strapi.db
      .connection('ai_scoring_runs')
      .where({ id })
      .update({ created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) });

  beforeEach(() => setBudget({ monthlyCapUsd: 10, perRunCapUsd: 2 }));
  afterAll(() => setBudget({ monthlyCapUsd: 25, perRunCapUsd: 2 }));

  it.each([
    ['this month has spent the cap', () => runCosting(10)],
    [
      'a run going on another review holds back its ceiling',
      async () => {
        await runCosting(8);
        await goingRun(0);
      },
    ],
    ['the cap is $0, which turns Score with AI off', () => setBudget({ monthlyCapUsd: 0 })],
  ])('refuses when %s', async (_, arrange) => {
    await arrange();

    const res = await start();

    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe(usedUp());
    expect(await runsOf(review.id)).toHaveLength(0);
  });

  it.each([
    ['this month is just under the cap', () => runCosting(9.5)],
    ['the cap was spent last month', async () => moveToLastMonth((await runCosting(10)).id)],
    [
      'a dead run holds back nothing',
      async () => {
        await runCosting(8);
        await makeStale((await goingRun(0)).id);
      },
    ],
    [
      // $7 + $1.50 spent so far + the $0.50 left of its ceiling = $9.
      'a running run counts what it has spent once',
      async () => {
        await runCosting(7);
        await goingRun(1.5);
      },
    ],
  ])('starts when %s', async (_, arrange) => {
    await arrange();

    expect((await start()).status).toBe(200);
  });

  // On SQLite the two run one after the other, so this checks the outcome,
  // not the Postgres lock on the settings row.
  it('lets only one of two starts on different reviews through at the edge', async () => {
    await runCosting(8);
    const otherDroplet = await strapi
      .documents(DROPLET_UID)
      .create({ data: dropletData({ inReview: true }) });
    const otherReviewer = await strapi.documents(USER_UID).create({ data: userData() });
    const otherReview = await strapi.documents(REVIEW_UID).create({
      data: reviewData({
        droplet: otherDroplet.documentId,
        reviewer: otherReviewer.documentId,
        state: 'open',
      }),
    });

    const results = await Promise.all([
      start(),
      start({ reviewId: otherReview.id, userId: otherReviewer.id }),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
  });

  it('seeds the settings if they are missing, so there is a row to lock', async () => {
    await strapi.documents(SETTINGS_UID).delete({ documentId: (await settingsRow()).documentId });

    expect((await start()).status).toBe(200);
    expect(await strapi.db.query(SETTINGS_UID).count()).toBe(1);
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

  it('says once the run has spent the per-run ceiling, but leaves it running to save its scores', async () => {
    const { body } = await start();
    const runId = body.data.run.id;

    // A million Sonnet input tokens is $2, the placeholder ceiling.
    const under = await beat(runId, { inputTokens: 999_999 });
    const over = await beat(runId, { inputTokens: 1_000_000 });

    expect(under.body.data.overCeiling).toBe(false);
    expect(over.body.data).toMatchObject({ overCeiling: true, run: { runState: 'running' } });
    const saved = await post(
      'finish',
      finishBody(runId, {
        runState: 'partial',
        inputTokens: 1_000_000,
        error: 'Stopped at the per-run cost ceiling',
      }),
    );
    expect(saved.body.data).toMatchObject({ saved: 4, run: { runState: 'partial' } });
  });

  it('saves progress and failedLessons, "overall" included', async () => {
    const { body } = await start();
    const runId = body.data.run.id;
    const progress = { done: [lesson.id], current: 'overall' };

    const res = await beat(runId, { progress, failedLessons: [lesson.id, 'overall'] });

    expect(res.status).toBe(200);
    const row = await runRow(runId);
    expect(row.progress).toEqual(progress);
    expect(row.failedLessons).toEqual([lesson.id, 'overall']);
  });

  describe('with scores', () => {
    const lessonScores = (overrides = {}) => [
      { lessonId: lesson.id, criterionId: tone.id, aiValue: 4, aiRationale: 'Warm.', ...overrides },
      { lessonId: lesson.id, criterionId: clarity.id, aiValue: 2, aiRationale: 'Unclear.' },
    ];

    it('saves them on value-null rows, skips one the reviewer set, and drops a lesson outside the droplet', async () => {
      const { body } = await start();
      const runId = body.data.run.id;
      await strapi.documents(REVIEW_SCORE_UID).create({
        data: {
          key: scoreKey(review.id, lesson.id, clarity.id),
          review: review.documentId,
          lesson: lesson.documentId,
          criterion: clarity.documentId,
          criterionName: 'Clarity',
          value: 5,
        },
      });

      const res = await beat(runId, {
        scores: [...lessonScores(), { ...lessonScores()[0], lessonId: otherLesson.id }],
      });

      expect(res.status).toBe(200);
      const saved = await scoreRow(scoreKey(review.id, lesson.id, tone.id));
      expect(saved).toMatchObject({ aiValue: 4, aiRationale: 'Warm.' });
      expect(await scoreRow(scoreKey(review.id, lesson.id, clarity.id))).toMatchObject({
        value: 5,
        aiValue: null,
      });
      expect(await scoreRow(scoreKey(review.id, otherLesson.id, tone.id))).toBeNull();
    });

    it('saves aiFindings beside the suggestion', async () => {
      const { body } = await start();
      const findings = [finding()];

      const res = await beat(body.data.run.id, {
        scores: lessonScores({ aiFindings: findings }),
      });

      expect(res.status).toBe(200);
      const row = await scoreRow(scoreKey(review.id, lesson.id, tone.id));
      expect(row.aiFindings).toEqual(findings);
      expect((await scoreRow(scoreKey(review.id, lesson.id, clarity.id))).aiFindings).toEqual([]);
    });

    it('is a 400 for a criterion outside the run, and the whole heartbeat rolls back', async () => {
      const { body } = await start();
      const runId = body.data.run.id;
      const stranger = await createCriterion({ order: 9 });

      const res = await beat(runId, {
        inputTokens: 700,
        progress: { done: [], current: lesson.id },
        failedLessons: [lesson.id],
        scores: lessonScores({ criterionId: stranger.id }),
      });

      expect(res.status).toBe(400);
      expect(await scoreRow(scoreKey(review.id, lesson.id, clarity.id))).toBeNull();
      expect(await runRow(runId)).toMatchObject({
        runState: 'queued',
        inputTokens: null,
        progress: null,
        failedLessons: null,
      });
    });

    it('saves nothing and ends the run failed when the review was sent', async () => {
      const { body } = await start();
      await strapi
        .documents(REVIEW_UID)
        .update({ documentId: review.documentId, data: { state: 'sent' } });

      const res = await beat(body.data.run.id, { scores: lessonScores() });

      expect(res.body.data.run.runState).toBe('failed');
      expect(await scoreRow(scoreKey(review.id, lesson.id, tone.id))).toBeNull();
    });

    it('still saves them past the per-run ceiling', async () => {
      const { body } = await start();

      const res = await beat(body.data.run.id, { inputTokens: 1_000_000, scores: lessonScores() });

      expect(res.body.data.overCeiling).toBe(true);
      expect(await scoreRow(scoreKey(review.id, lesson.id, tone.id))).toMatchObject({ aiValue: 4 });
    });
  });

  it.each([
    ['progress with an extra key', { progress: { done: [], current: null, x: 1 } }],
    ['progress with a bad current', { progress: { done: [], current: 'x' } }],
    ['progress with done not an array', { progress: { done: 'a', current: null } }],
    ['a bad failedLessons', { failedLessons: ['x'] }],
    ['a bad scores entry', { scores: [{ lessonId: 1 }] }],
  ])('rejects %s', async (_name, extra) => {
    const { body } = await start();

    expect((await beat(body.data.run.id, extra)).status).toBe(400);
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

  it('accepts "overall" in failedLessons', async () => {
    const { body } = await start();

    const res = await post(
      'finish',
      finishBody(body.data.run.id, { runState: 'partial', failedLessons: [lesson.id, 'overall'] }),
    );

    expect(res.status).toBe(200);
    expect((await runRow(body.data.run.id)).failedLessons).toEqual([lesson.id, 'overall']);
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

describe('POST /ai-scoring-runs/finish, aiFindings', () => {
  const withFindings = (aiFindings) =>
    finishBody(0).scores.map((s) => ({ ...s, ...(aiFindings ? { aiFindings } : {}) }));

  it('writes them beside aiValue, and [] over old findings when none come', async () => {
    const first = await start();
    const findings = [finding()];
    await post('finish', finishBody(first.body.data.run.id, { scores: withFindings(findings) }));
    const key = scoreKey(review.id, lesson.id, tone.id);
    expect((await scoreRow(key)).aiFindings).toEqual(findings);

    const second = await start();
    await post('finish', finishBody(second.body.data.run.id, { scores: withFindings() }));

    expect((await scoreRow(key)).aiFindings).toEqual([]);
  });

  it('keeps a confirmed row aiValue, aiRationale and aiFindings', async () => {
    const first = await start();
    const old = [finding({ id: 'old-1' })];
    await post('finish', finishBody(first.body.data.run.id, { scores: withFindings(old) }));
    const key = scoreKey(review.id, lesson.id, tone.id);
    const row = await scoreRow(key);
    await strapi
      .documents(REVIEW_SCORE_UID)
      .update({ documentId: row.documentId, data: { value: 3 } });

    const second = await start();
    await post(
      'finish',
      finishBody(second.body.data.run.id, { scores: withFindings([finding({ id: 'new-1' })]) }),
    );

    expect(await scoreRow(key)).toMatchObject({
      value: 3,
      aiValue: 4,
      aiRationale: 'Warm opening.',
      aiFindings: old,
    });
  });

  it('rejects out-of-bounds findings and writes nothing', async () => {
    const { body } = await start();
    const runId = body.data.run.id;
    const bad = [
      Array.from({ length: 6 }, (_, i) => finding({ id: `r-${i}` })),
      'nope',
      [{ ...finding(), extra: 1 }],
      [finding({ quote: 'x'.repeat(2001) })],
      [finding({ lessonId: 'one' })],
      [finding({ anchor: { v: 1, field: 'blocks', quote: 'x'.repeat(3000) } })],
    ];

    for (const aiFindings of bad) {
      const res = await post('finish', finishBody(runId, { scores: withFindings(aiFindings) }));
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/aiFindings/);
    }
    expect((await runRow(runId)).runState).toBe('queued');
    expect(await scoreRow(scoreKey(review.id, lesson.id, tone.id))).toBeNull();
  });
});
