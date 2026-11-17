const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  QUIZ_ATTEMPT_UID,
  USER_UID,
  LESSON_UID,
  DROPLET_UID,
  ENROLLMENT_UID,
  userData,
  lessonData,
  dropletData,
  enrollmentData,
} = require('../helpers/fixtures');

let strapi;
let dayBounds;
let token;
let user;
let other;
let lesson;
let droplet;

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });
const post = (body) => rest().post('/api/quiz-attempts/record').set(auth()).send(body);

let n = 0;
const submitId = () => `a1b2c3d4-0000-4000-8000-${String(++n).padStart(12, '0')}`;
const body = (overrides = {}) => ({
  userId: user.id,
  lessonId: lesson.id,
  dropletId: droplet.id,
  quizType: 'choice',
  questionId: 2147483648,
  correct: false,
  submitId: submitId(),
  ...overrides,
});
const record = (overrides) => post(body(overrides));

const rows = () =>
  strapi.db.query(QUIZ_ATTEMPT_UID).findMany({
    populate: { user: true, lesson: true, droplet: true },
    orderBy: { id: 'asc' },
  });

beforeAll(async () => {
  strapi = await setupStrapi();
  ({ dayBounds } = require('../../dist/src/lib/ai-scoring-spend'));
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  await strapi.db.connection('quiz_attempts').del();
  user = await strapi.documents(USER_UID).create({ data: userData() });
  other = await strapi.documents(USER_UID).create({ data: userData() });
  lesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
  droplet = await strapi.documents(DROPLET_UID).create({
    data: dropletData({ lessons: [lesson.documentId] }),
  });
  await strapi.documents(ENROLLMENT_UID).create({
    data: enrollmentData({ authorizedUser: user.documentId, droplet: droplet.documentId }),
  });
});

describe('POST /quiz-attempts/record', () => {
  it('creates one row with ids and a result only', async () => {
    const res = await record({ correct: true });

    expect(res.status).toBe(200);
    const [row] = await rows();
    expect(res.body.data).toEqual({ id: row.id, attempt: 1 });
    expect(row).toMatchObject({ quizType: 'choice', correct: true, attempt: 1 });
    expect(String(row.questionId)).toBe('2147483648');
    expect(row.user.id).toBe(user.id);
    expect(row.lesson.id).toBe(lesson.id);
    expect(row.droplet.id).toBe(droplet.id);
    expect(Object.keys(row)).not.toEqual(expect.arrayContaining(['answer', 'answerText']));
  });

  it('numbers a retry as attempt 2, per quiz type', async () => {
    await record();
    const second = await record({ correct: true });
    const open = await record({ quizType: 'open-ended' });

    expect(second.body.data.attempt).toBe(2);
    expect(open.body.data.attempt).toBe(1);
    expect(await rows()).toHaveLength(3);
  });

  it('returns the first row for the same submitId, and writes one row', async () => {
    const id = submitId();
    const first = await record({ submitId: id });
    const again = await record({ submitId: id, correct: true });

    expect(again.status).toBe(200);
    expect(again.body.data).toEqual(first.body.data);
    expect(await rows()).toHaveLength(1);
  });

  it('is a 403 for a user not enrolled in the droplet, and writes nothing', async () => {
    const res = await record({ userId: other.id });

    expect(res.status).toBe(403);
    expect(await rows()).toHaveLength(0);
  });

  it('accepts question id 0', async () => {
    expect((await record({ questionId: 0 })).status).toBe(200);
  });

  it('is a 404 when the lesson is not in the droplet', async () => {
    const stray = await strapi.documents(LESSON_UID).create({ data: lessonData() });

    expect((await record({ lessonId: stray.id })).status).toBe(404);
    expect(await rows()).toHaveLength(0);
  });

  it("does not count rows from before Boston midnight toward today's cap", async () => {
    for (let i = 0; i < 500; i += 1) {
      await strapi.documents(QUIZ_ATTEMPT_UID).create({
        data: {
          user: user.documentId,
          lesson: lesson.documentId,
          droplet: droplet.documentId,
          quizType: 'choice',
          questionId: '1',
          correct: false,
          attempt: 1,
          submitId: submitId(),
        },
      });
    }
    const { start } = dayBounds(new Date());
    await strapi.db.connection('quiz_attempts').update({ created_at: new Date(start.getTime() - 60000) });

    expect((await record()).status).toBe(200);
  }, 120000);

  it('is a 404 for an unknown user, lesson or droplet', async () => {
    for (const overrides of [
      { userId: 2147483000 },
      { lessonId: 2147483000 },
      { dropletId: 2147483000 },
    ]) {
      expect((await record(overrides)).status).toBe(404);
    }
    expect(await rows()).toHaveLength(0);
  });

  it.each([
    ['an unknown key', { answer: 'Paris' }],
    ['a missing userId', { userId: undefined }],
    ['a bad quizType', { quizType: 'essay' }],
    ['a negative questionId', { questionId: -1 }],
    ['a questionId past 2^31', { questionId: 2147483649 }],
    ['a non-boolean correct', { correct: 'yes' }],
    ['a bad submitId', { submitId: 'x' }],
  ])('is a 400 for %s, and writes nothing', async (_, overrides) => {
    const res = await record(overrides);

    expect(res.status).toBe(400);
    expect(await rows()).toHaveLength(0);
  });

  it('is a 429 at 500 rows today, but not for another user', async () => {
    const rowData = (userDoc) => ({
      user: userDoc.documentId,
      lesson: lesson.documentId,
      droplet: droplet.documentId,
      quizType: 'choice',
      questionId: '1',
      correct: false,
      attempt: 1,
    });
    await strapi.db.connection('quiz_attempts').del();
    for (let i = 0; i < 500; i += 1) {
      await strapi.documents(QUIZ_ATTEMPT_UID).create({
        data: { ...rowData(user), submitId: submitId() },
      });
    }

    expect((await record()).status).toBe(429);
    await strapi.documents(ENROLLMENT_UID).create({
      data: enrollmentData({ authorizedUser: other.documentId, droplet: droplet.documentId }),
    });
    expect((await record({ userId: other.id })).status).toBe(200);
  }, 120000);

  it('refuses a request without the service token', async () => {
    const res = await rest().post('/api/quiz-attempts/record').send(body());

    expect([401, 403]).toContain(res.status);
    expect(await rows()).toHaveLength(0);
  });

  it('has no core create, read, update or delete route', async () => {
    await record();
    const { documentId } = await strapi.documents(QUIZ_ATTEMPT_UID).findFirst();

    const calls = [
      rest().post('/api/quiz-attempts').set(auth()).send({ data: {} }),
      rest().get('/api/quiz-attempts').set(auth()),
      rest().get(`/api/quiz-attempts/${documentId}`).set(auth()),
      rest().put(`/api/quiz-attempts/${documentId}`).set(auth()).send({ data: {} }),
      rest().delete(`/api/quiz-attempts/${documentId}`).set(auth()),
    ];
    for (const res of await Promise.all(calls)) {
      expect([404, 405]).toContain(res.status);
    }
    expect(await rows()).toHaveLength(1);
  });
});
