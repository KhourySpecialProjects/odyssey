const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const {
  ENROLLMENT_UID,
  LESSON_UID,
  enrollmentData,
  lessonData,
} = require('../helpers/fixtures');

let strapi;
let backfillLastProgress;

beforeAll(async () => {
  strapi = await setupStrapi();
  ({ backfillLastProgress } = require('../../dist/src/lib/enrollment-progress-backfill'));
});

afterAll(async () => {
  await teardownStrapi();
});

const OLD = new Date('2026-01-02T03:04:05.000Z');
const force = (id, data) =>
  strapi.db.transaction(() =>
    strapi.db.query(ENROLLMENT_UID).updateMany({ where: { id }, data })
  );
const read = async (documentId) =>
  strapi.documents(ENROLLMENT_UID).findOne({ documentId });
const create = async (viewedLessons = []) => {
  const entry = await strapi
    .documents(ENROLLMENT_UID)
    .create({ data: enrollmentData({ viewedLessons }) });
  await force(entry.id, { updatedAt: OLD });
  return entry;
};

describe('backfillLastProgress', () => {
  it('copies updatedAt onto started enrollments only, and keeps updatedAt', async () => {
    const lessons = await Promise.all(
      [1, 2].map(() =>
        strapi.documents(LESSON_UID).create({ data: lessonData() })
      )
    );
    const started = await create(lessons.map((l) => l.documentId));
    const never = await create();
    const has = await create([lessons[0].documentId]);
    const kept = new Date('2026-05-05T00:00:00.000Z');
    await force(has.id, { lastProgressDate: kept });

    expect(await backfillLastProgress()).toBe(1);

    const s = await read(started.documentId);
    expect(new Date(s.lastProgressDate).toISOString()).toBe(OLD.toISOString());
    expect(new Date(s.updatedAt).toISOString()).toBe(OLD.toISOString());
    expect((await read(never.documentId)).lastProgressDate).toBeNull();
    const h = await read(has.documentId);
    expect(new Date(h.lastProgressDate).toISOString()).toBe(kept.toISOString());
  });

  it('changes nothing when run again', async () => {
    expect(await backfillLastProgress()).toBe(0);
  });
});
