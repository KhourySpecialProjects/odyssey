const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const {
  QUIZ_ATTEMPT_UID,
  USER_UID,
  LESSON_UID,
  DROPLET_UID,
  userData,
  lessonData,
  dropletData,
} = require('../helpers/fixtures');

let strapi;
let lib;

beforeAll(async () => {
  strapi = await setupStrapi();
  lib = require('../../dist/src/lib/quiz-attempt');
});

afterAll(async () => {
  await teardownStrapi();
});

const daysAgo = (n) => new Date(Date.now() - n * 86400000);

describe('purgeExpiredQuizAttempts', () => {
  it('deletes rows past 30 days and rows with no user, and keeps recent ones', async () => {
    await strapi.db.connection('quiz_attempts').del();
    const user = await strapi.documents(USER_UID).create({ data: userData() });
    const gone = await strapi.documents(USER_UID).create({ data: userData() });
    const lesson = await strapi
      .documents(LESSON_UID)
      .create({ data: lessonData() });
    const droplet = await strapi
      .documents(DROPLET_UID)
      .create({ data: dropletData({ lessons: [lesson.documentId] }) });
    let n = 0;
    const make = (owner) =>
      strapi.documents(QUIZ_ATTEMPT_UID).create({
        data: {
          user: owner.documentId,
          lesson: lesson.documentId,
          droplet: droplet.documentId,
          quizType: 'choice',
          questionId: '1',
          correct: false,
          attempt: 1,
          submitId: `a1b2c3d4-0000-4000-8000-${String(++n).padStart(12, '0')}`,
        },
      });
    const old = await make(user);
    const orphan = await make(gone);
    const recent = await make(user);
    await strapi.db
      .connection('quiz_attempts')
      .where({ id: old.id })
      .update({ created_at: daysAgo(31) });
    await strapi.documents(USER_UID).delete({ documentId: gone.documentId });

    const result = await lib.purgeExpiredQuizAttempts();

    expect(result).toEqual({ attempts: 2 });
    const left = await strapi.db
      .query(QUIZ_ATTEMPT_UID)
      .findMany({ select: ['id'] });
    expect(left.map((row) => row.id)).toEqual([recent.id]);
    const links = await strapi.db
      .connection('quiz_attempts_user_lnk')
      .whereIn('quiz_attempt_id', [old.id, orphan.id]);
    expect(links).toHaveLength(0);
  }, 120000);
});
