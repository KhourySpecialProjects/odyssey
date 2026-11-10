const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  MENTOR_FEEDBACK_UID,
  MENTOR_SETTING_UID,
  USER_UID,
  LESSON_UID,
  DROPLET_UID,
  userData,
  mentorFeedbackData,
  lessonData,
  dropletData,
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
const post = (body) => rest().post('/api/mentor-feedbacks/record').set(auth()).send(body);

const KEY = 'a1b2c3d4-0000-4000-8000-000000000001';
const body = (overrides = {}) => ({
  userId: user.id,
  lessonId: lesson.id,
  dropletId: droplet.id,
  answerKey: KEY,
  kind: 'lesson',
  rating: 'up',
  shared: false,
  citations: [{ ref: 'p1', blockId: 'abc_1', blockIndex: 2 }],
  promptVersion: 'v1.0',
  ...overrides,
});
const record = (overrides) => post(body(overrides));
const shareBody = (overrides = {}) => ({
  shared: true,
  answerText: 'An answer',
  questionText: 'A question',
  ...overrides,
});

const rows = () =>
  strapi.db.query(MENTOR_FEEDBACK_UID).findMany({
    populate: { user: true, lesson: true, droplet: true },
    orderBy: { id: 'asc' },
  });
const settingsRow = () => strapi.documents(MENTOR_SETTING_UID).findFirst();
const setSettings = async (data) =>
  strapi.documents(MENTOR_SETTING_UID).update({
    documentId: (await settingsRow()).documentId,
    data,
  });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
  ({ dayBounds } = require('../../dist/src/lib/ai-scoring-spend'));
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  await strapi.db.connection('mentor_feedbacks').del();
  await setSettings({ storeSharedAnswers: false, perUserDailyLimit: 30 });
  user = await strapi.documents(USER_UID).create({ data: userData() });
  other = await strapi.documents(USER_UID).create({ data: userData() });
  lesson = await strapi.documents(LESSON_UID).create({ data: lessonData() });
  droplet = await strapi.documents(DROPLET_UID).create({ data: dropletData() });
});

describe('POST /mentor-feedbacks/record', () => {
  it('creates one row with ids only, and no text', async () => {
    const res = await record();

    expect(res.status).toBe(200);
    const [row] = await rows();
    expect(res.body.data).toEqual({ id: row.id, canShare: false });
    expect(row).toMatchObject({
      answerKey: KEY,
      kind: 'lesson',
      rating: 'up',
      shared: false,
      answerText: null,
      questionText: null,
      promptVersion: 'v1.0',
      citations: [{ ref: 'p1', blockId: 'abc_1', blockIndex: 2 }],
    });
    expect(row.user.id).toBe(user.id);
    expect(row.lesson.id).toBe(lesson.id);
    expect(row.droplet.id).toBe(droplet.id);
  });

  it('keeps questionId for a quiz hint', async () => {
    const res = await record({ kind: 'quiz-hint', questionId: 4 });

    expect(res.status).toBe(200);
    expect((await rows())[0]).toMatchObject({ kind: 'quiz-hint', questionId: 4 });
  });

  it.each([
    ['an unknown key', { question: 'What is a closure?' }],
    ['a missing userId', { userId: undefined }],
    ['a bad answerKey', { answerKey: 'short' }],
    ['a bad kind', { kind: 'chat' }],
    ['a bad rating', { rating: 'meh' }],
    ['questionId on a lesson', { questionId: 3 }],
    ['a quiz hint without questionId', { kind: 'quiz-hint' }],
    ['a citation with a quote', { citations: [{ ref: 'p1', quote: 'lesson text' }] }],
    ['21 citations', { citations: Array.from({ length: 21 }, () => ({ ref: 'p1' })) }],
    ['a bad citation ref', { citations: [{ ref: 'one' }] }],
    ['answerText with shared false', { answerText: 'text' }],
    ['shared true without text', { shared: true }],
    ['questionText with shared false', { questionText: 'q' }],
    [
      'questionText on a quiz hint',
      { ...shareBody(), kind: 'quiz-hint', questionId: 2 },
    ],
    ['shared on a lesson without questionText', shareBody({ questionText: undefined })],
    ['questionText over 2000', shareBody({ questionText: 'q'.repeat(2001) })],
  ])('is a 400 for %s, and writes nothing', async (_, overrides) => {
    const res = await record(overrides);

    expect(res.status).toBe(400);
    expect(await rows()).toHaveLength(0);
  });

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

  it('is a 403 for text while sharing is off, and writes nothing', async () => {
    const res = await record(shareBody());

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Sharing answers is off');
    expect(await rows()).toHaveLength(0);
  });

  describe('while sharing is on', () => {
    beforeEach(() => setSettings({ storeSharedAnswers: true }));

    it('stores both texts and reports canShare', async () => {
      const res = await record(shareBody());

      expect(res.status).toBe(200);
      expect(res.body.data.canShare).toBe(true);
      expect(await rows()).toMatchObject([
        { shared: true, answerText: 'An answer', questionText: 'A question' },
      ]);
    });

    it('stores only the answer for a quiz hint', async () => {
      const res = await record(
        shareBody({ kind: 'quiz-hint', questionId: 2, questionText: undefined }),
      );

      expect(res.status).toBe(200);
      expect(await rows()).toMatchObject([
        { answerText: 'An answer', questionText: null },
      ]);
    });

    it('nulls both texts when unticked', async () => {
      await record(shareBody());

      const res = await record();

      expect(res.status).toBe(200);
      expect(await rows()).toMatchObject([
        { shared: false, answerText: null, questionText: null },
      ]);
    });

    it('does not return the text in the response', async () => {
      const res = await record(shareBody());

      expect(JSON.stringify(res.body)).not.toContain('An answer');
      expect(JSON.stringify(res.body)).not.toContain('A question');
    });
  });

  it('updates the same row when the same key is posted again', async () => {
    const first = await record();
    const second = await record({ rating: 'down' });

    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(await rows()).toMatchObject([{ rating: 'down' }]);
  });

  it.each([
    ['lesson', {}],
    ['quiz-hint', { kind: 'quiz-hint', questionId: 2 }],
  ])('unticks every copy of a mixed-kind duplicate, posted as %s', async (_, overrides) => {
    await setSettings({ storeSharedAnswers: true });
    for (const kind of ['lesson', 'quiz-hint']) {
      await strapi.documents(MENTOR_FEEDBACK_UID).create({
        data: mentorFeedbackData({
          answerKey: KEY,
          user: user.documentId,
          kind,
          shared: true,
          answerText: 'a',
          questionText: 'q',
        }),
      });
    }

    const res = await record(overrides);

    expect(res.status).toBe(200);
    expect(await rows()).toMatchObject([
      { shared: false, answerText: null, questionText: null },
      { shared: false, answerText: null, questionText: null },
    ]);
  });

  it('is a 400 when the kind differs from the stored row, and changes nothing', async () => {
    await setSettings({ storeSharedAnswers: true });
    await record(shareBody({ kind: 'quiz-hint', questionId: 2, questionText: undefined }));

    const res = await record(shareBody({ rating: 'down' }));

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe("Kind can't change");
    expect(await rows()).toMatchObject([
      { kind: 'quiz-hint', rating: 'up', answerText: 'An answer', questionText: null },
    ]);
  });

  it('is a 400 for a shared post over mixed-kind duplicates, and changes neither row', async () => {
    await setSettings({ storeSharedAnswers: true });
    for (const kind of ['lesson', 'quiz-hint']) {
      await strapi.documents(MENTOR_FEEDBACK_UID).create({
        data: mentorFeedbackData({ answerKey: KEY, user: user.documentId, kind }),
      });
    }

    const res = await record(shareBody());

    expect(res.status).toBe(400);
    expect(await rows()).toMatchObject([
      { kind: 'lesson', shared: false, answerText: null, questionText: null },
      { kind: 'quiz-hint', shared: false, answerText: null, questionText: null },
    ]);
  });

  it('lets an unshared post carry another kind, keeping the stored kind', async () => {
    await record();

    const res = await record({ kind: 'quiz-hint', questionId: 2, rating: 'down' });

    expect(res.status).toBe(200);
    expect(await rows()).toMatchObject([{ kind: 'lesson', rating: 'down' }]);
  });

  it("gives another user's identical key a separate row", async () => {
    await record();
    const res = await record({ userId: other.id, rating: 'down' });

    expect(res.status).toBe(200);
    const all = await rows();
    expect(all).toHaveLength(2);
    expect(all[0]).toMatchObject({ rating: 'up' });
    expect(all[0].user.id).toBe(user.id);
    expect(all[1]).toMatchObject({ rating: 'down' });
    expect(all[1].user.id).toBe(other.id);
  });

  describe('daily cap', () => {
    beforeEach(() => setSettings({ perUserDailyLimit: 2 }));

    it('refuses a new row at the cap with 429, but still allows updates', async () => {
      const keys = [1, 2, 3].map((n) => `a1b2c3d4-0000-4000-8000-00000000000${n}`);
      expect((await record({ answerKey: keys[0] })).status).toBe(200);
      expect((await record({ answerKey: keys[1] })).status).toBe(200);

      const refused = await record({ answerKey: keys[2] });
      const updated = await record({ answerKey: keys[0], rating: 'down' });

      expect(refused.status).toBe(429);
      expect(updated.status).toBe(200);
      expect(await rows()).toHaveLength(2);
    });

    it('resets at midnight Eastern', async () => {
      const key = (n) => `a1b2c3d4-0000-4000-8000-00000000000${n}`;
      await record({ answerKey: key(1) });
      await record({ answerKey: key(2) });
      const yesterday = new Date(dayBounds(new Date()).start.getTime() - 60 * 1000);
      await strapi.db.connection('mentor_feedbacks').update({ created_at: yesterday });

      const fresh = await record({ answerKey: key(3) });
      await record({ answerKey: key(4) });
      const third = await record({ answerKey: key(5) });

      expect(fresh.status).toBe(200);
      expect(third.status).toBe(429);
    });

    it("doesn't count another user's rows", async () => {
      await record({ userId: other.id });
      await record({ userId: other.id, answerKey: 'a1b2c3d4-0000-4000-8000-000000000002' });

      expect((await record()).status).toBe(200);
    });
  });

  it('refuses a request without the service token', async () => {
    const res = await rest().post('/api/mentor-feedbacks/record').send(body());

    expect([401, 403]).toContain(res.status);
    expect(await rows()).toHaveLength(0);
  });

  it('does not route a core create on /mentor-feedbacks', async () => {
    const res = await rest()
      .post('/api/mentor-feedbacks')
      .set(auth())
      .send({ data: { kind: 'lesson', rating: 'up', answerKey: KEY } });

    expect([404, 405]).toContain(res.status);
    expect(await rows()).toHaveLength(0);
  });

  it('does not route a core read on /mentor-feedbacks', async () => {
    await record();
    const { documentId } = await strapi.documents(MENTOR_FEEDBACK_UID).findFirst();

    for (const path of ['/api/mentor-feedbacks', `/api/mentor-feedbacks/${documentId}`]) {
      const res = await rest().get(path).set(auth());
      expect([404, 405]).toContain(res.status);
    }
  });
});

describe('mentor-feedback schema', () => {
  it('pins the attribute names, with both texts private', () => {
    const { attributes } = strapi.contentType(MENTOR_FEEDBACK_UID);
    const system = ['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt'];
    const own = Object.keys(attributes).filter(
      (name) =>
        ![...system, 'createdBy', 'updatedBy', 'locale', 'localizations'].includes(name),
    );

    expect(own.sort()).toEqual([
      'answerKey',
      'answerText',
      'citations',
      'droplet',
      'kind',
      'lesson',
      'promptVersion',
      'questionId',
      'questionText',
      'rating',
      'shared',
      'user',
    ]);
    expect(attributes.answerText.private).toBe(true);
    expect(attributes.questionText.private).toBe(true);
  });
});
