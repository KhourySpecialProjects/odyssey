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
    for (const row of [otherDroplet, otherLesson, hint]) expect(await count({ key: row.key })).toBe(1);
  });
});
