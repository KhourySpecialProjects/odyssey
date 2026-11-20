const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { expectUniqueViolation } = require('../helpers/unique');
const { MENTOR_CACHED_REPLY_UID, cachedReplyData } = require('../helpers/fixtures');

let strapi;

beforeAll(async () => {
  strapi = await setupStrapi();
});

afterAll(async () => {
  await teardownStrapi();
});

describe('mentor-cached-reply schema (ODY-967)', () => {
  it('has exactly the agreed attributes', () => {
    const type = strapi.contentType(MENTOR_CACHED_REPLY_UID);
    const own = Object.keys(type.attributes).filter(
      (name) => !['createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations'].includes(name),
    );

    expect(own.sort()).toEqual(['dropletId', 'key', 'lessonId', 'model', 'promptVersion', 'scope', 'slot', 'text']);
    expect(type.options.draftAndPublish).toBe(false);
  });

  it('rejects a duplicate key at the database level (unique index)', async () => {
    const data = cachedReplyData();

    await expectUniqueViolation(
      strapi.db.transaction(async () => {
        const q = strapi.db.query(MENTOR_CACHED_REPLY_UID);
        await q.create({ data: { documentId: 'crdupa', ...data } });
        await q.create({ data: { documentId: 'crdupb', ...data } });
      }),
      { table: 'mentor_cached_replies', column: 'key', index: 'mentor_cached_replies_key_uq' },
    );
  });
});
