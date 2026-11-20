const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { MENTOR_CACHED_REPLY_UID, cachedReplyData } = require('../helpers/fixtures');

let strapi;
let lib;

beforeAll(async () => {
  strapi = await setupStrapi();
  lib = require('../../dist/src/lib/mentor-cached-replies');
});

afterAll(async () => {
  await teardownStrapi();
});

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);
const input = (overrides = {}) => cachedReplyData(overrides);
const count = (filters) => strapi.documents(MENTOR_CACHED_REPLY_UID).count({ filters });
const hoursAhead = (n) => new Date(Date.now() + n * 3600000);

describe('findCachedReply and storeCachedReply (ODY-967)', () => {
  it('finds what was stored, and null for another key', async () => {
    const row = input({ text: 'Stored text' });

    const result = await lib.storeCachedReply(row);

    expect(result).toMatchObject({ stored: true });
    expect(await lib.findCachedReply(row.key)).toBe('Stored text');
    expect(await lib.findCachedReply(input().key)).toBeNull();
  });

  it('keeps the first text when the same key is stored twice', async () => {
    const row = input({ text: 'first' });

    const first = await lib.storeCachedReply(row);
    const second = await lib.storeCachedReply({ ...row, text: 'second' });

    expect([first.stored, second.stored]).toEqual([true, false]);
    expect(second.id).toBe(first.id);
    expect(await count({ key: row.key })).toBe(1);
    expect(await lib.findCachedReply(row.key)).toBe('first');
  });

  it('leaves one row when two stores of one key race', async () => {
    const row = input();

    const results = await Promise.all([lib.storeCachedReply(row), lib.storeCachedReply(row)]);

    expect(results.filter((r) => r.stored)).toHaveLength(1);
    expect(await count({ key: row.key })).toBe(1);
  });

  describe('when the first lookup misses a row that already exists', () => {
    // The first findFirst on the cached reply type answers null, as if the row were created a moment later
    const missFirstLookup = (failCreate) => {
      const real = strapi.documents.bind(strapi);
      let missed = false;
      return jest.spyOn(strapi, 'documents').mockImplementation((uid) => {
        const docs = real(uid);
        if (uid !== MENTOR_CACHED_REPLY_UID) return docs;
        return new Proxy(docs, {
          get: (target, prop) => {
            if (prop === 'findFirst') {
              return async (params) => (missed ? target.findFirst(params) : ((missed = true), null));
            }
            if (prop === 'create' && failCreate) return async () => Promise.reject(new Error('unique violation'));
            return target[prop].bind(target);
          },
        });
      });
    };
    afterEach(() => jest.restoreAllMocks());

    it('re-reads the winner after the create fails', async () => {
      const row = input();
      const winner = await strapi.documents(MENTOR_CACHED_REPLY_UID).create({ data: row });
      missFirstLookup(true);

      const result = await lib.storeCachedReply({ ...row, text: 'loser' });

      expect(result).toEqual({ id: winner.id, stored: false });
    });

    it('rethrows when the create fails and no row is behind it', async () => {
      const row = input();
      missFirstLookup(true);

      await expect(lib.storeCachedReply(row)).rejects.toThrow('unique violation');
      expect(await count({ key: row.key })).toBe(0);
    });
  });
});

describe('clean-up of superseded versions', () => {
  const lessonKey = (id, hash) => `lesson:${id}:${hash}`;
  const base = (over) =>
    input({ slot: 'lesson:101', lessonId: 101, dropletId: 1, key: lessonKey(101, HASH_A), ...over });

  it('deletes an old version of the same slot and droplet, and nothing else', async () => {
    const old = base({ promptVersion: 'v1' });
    const otherDroplet = base({ dropletId: 2, key: lessonKey(101, 'c'.repeat(64)) });
    const otherLesson = input({ slot: 'lesson:102', lessonId: 102, key: lessonKey(102, HASH_A) });
    const hint = input({
      scope: 'hint',
      slot: 'hint:101:7:3',
      lessonId: 101,
      key: `hint:101:7:3:${HASH_A}`,
    });
    for (const row of [old, otherDroplet, otherLesson, hint]) await lib.storeCachedReply(row);
    const fresh = base({ key: lessonKey(101, HASH_B), promptVersion: 'v2' });

    await lib.storeCachedReply(fresh, new Date());
    expect(await count({ key: old.key })).toBe(1);

    await lib.storeCachedReply({ ...fresh, key: lessonKey(101, 'd'.repeat(64)) }, hoursAhead(2));

    expect(await count({ key: old.key })).toBe(0);
    expect(await count({ key: `lesson:101:${'d'.repeat(64)}` })).toBe(1);
    for (const row of [otherDroplet, otherLesson, hint]) expect(await count({ key: row.key })).toBe(1);
  });

  it('keeps a version until it is an hour old, and deletes it after', async () => {
    const old = base({ key: lessonKey(101, 'e'.repeat(64)), dropletId: 3 });
    await lib.storeCachedReply(old);
    const { createdAt } = await strapi.documents(MENTOR_CACHED_REPLY_UID).findFirst({ filters: { key: old.key } });
    const at = (minutes) => new Date(new Date(createdAt).getTime() + minutes * 60000);

    await lib.storeCachedReply({ ...old, key: lessonKey(101, '1'.repeat(64)) }, at(59));
    expect(await count({ key: old.key })).toBe(1);

    await lib.storeCachedReply({ ...old, key: lessonKey(101, '2'.repeat(64)) }, at(61));
    expect(await count({ key: old.key })).toBe(0);
  });
});
