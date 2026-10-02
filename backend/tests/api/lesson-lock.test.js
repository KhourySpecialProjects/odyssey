const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { LESSON_UID, USER_UID, lessonData, userData } = require('../helpers/fixtures');

let strapi;
let token;

const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });

const lockUrl = (ref) => `/api/lessons/${ref}/lock`;
const heartbeatUrl = (ref) => `/api/lessons/${ref}/lock/heartbeat`;
const statusUrl = (ref) => `/api/lessons/${ref}/lock-status`;

const acquire = (ref, userId) =>
  rest().post(lockUrl(ref)).set(auth()).send({ userId });
const release = (ref, userId) => {
  const req = rest().delete(lockUrl(ref)).set(auth());
  return userId === undefined ? req : req.query({ userId });
};
const heartbeat = (ref, userId) =>
  rest().put(heartbeatUrl(ref)).set(auth()).send({ userId });
const lockStatus = (ref) => rest().get(statusUrl(ref)).set(auth());

const createLesson = (overrides) =>
  strapi.documents(LESSON_UID).create({ data: lessonData(overrides) });
const createUser = (overrides) =>
  strapi.documents(USER_UID).create({ data: userData(overrides) });

// Reads the raw lock columns through the Query Engine (no Document Service).
const readLock = async (lesson) => {
  const row = await strapi.db
    .query(LESSON_UID)
    .findOne({ where: { id: lesson.id }, populate: { lockedBy: true } });
  return { lockedBy: row.lockedBy?.id ?? null, lockedAt: row.lockedAt };
};

// Writes a lock directly, so tests can set up stale or fresh locks.
const setLock = (lesson, userId, lockedAt) =>
  strapi.db.query(LESSON_UID).update({
    where: { id: lesson.id },
    data: { lockedBy: userId, lockedAt },
  });

const ago = (ms) => new Date(Date.now() - ms).toISOString();
const STALE_MS = 61_000;

let lesson;
let alice;
let bob;

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  lesson = await createLesson();
  alice = await createUser({ firstName: 'Alice', lastName: 'Liddell' });
  bob = await createUser({ firstName: 'Bob', lastName: 'Builder' });
});

describe('POST /lessons/:id/lock (acquire)', () => {
  it('locks an unlocked lesson and stores the lock', async () => {
    const res = await acquire(lesson.id, alice.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ locked: true, lockedBy: alice.id });
    const stored = await readLock(lesson);
    expect(stored.lockedBy).toBe(alice.id);
    expect(stored.lockedAt).toBeTruthy();
  });

  it('answers 409 with lockedBy and lockedAt when another user holds a fresh lock', async () => {
    const lockedAt = ago(5_000);
    await setLock(lesson, alice.id, lockedAt);

    const res = await acquire(lesson.id, bob.id);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Lesson is locked');
    expect(res.body.lockedBy.id).toBe(alice.id);
    expect(res.body.lockedBy.firstName).toBe('Alice');
    expect(new Date(res.body.lockedAt).getTime()).toBe(new Date(lockedAt).getTime());
    expect((await readLock(lesson)).lockedBy).toBe(alice.id);
  });

  it("takes over another user's stale lock", async () => {
    await setLock(lesson, alice.id, ago(STALE_MS));

    const res = await acquire(lesson.id, bob.id);

    expect(res.status).toBe(200);
    expect((await readLock(lesson)).lockedBy).toBe(bob.id);
  });

  it('lets the same user re-acquire and refreshes lockedAt', async () => {
    const before = ago(10_000);
    await setLock(lesson, alice.id, before);

    const res = await acquire(lesson.id, alice.id);

    expect(res.status).toBe(200);
    const stored = await readLock(lesson);
    expect(stored.lockedBy).toBe(alice.id);
    expect(new Date(stored.lockedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it.each([
    ['missing', undefined],
    ['not a number', 'abc'],
    ['zero', 0],
  ])('answers 400 when userId is %s', async (_label, userId) => {
    const res = await acquire(lesson.id, userId);
    expect(res.status).toBe(400);
  });

  it('answers 404 for an unknown lesson', async () => {
    const res = await acquire(999999, alice.id);
    expect(res.status).toBe(404);
  });
});

describe('DELETE /lessons/:id/lock (release)', () => {
  it('answers 403 when a non-holder releases a fresh lock', async () => {
    await setLock(lesson, alice.id, ago(5_000));

    const res = await release(lesson.id, bob.id);

    expect(res.status).toBe(403);
    expect((await readLock(lesson)).lockedBy).toBe(alice.id);
  });

  it('lets the holder release and clears the lock', async () => {
    await setLock(lesson, alice.id, ago(5_000));

    const res = await release(lesson.id, alice.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ locked: false });
    expect(await readLock(lesson)).toEqual({ lockedBy: null, lockedAt: null });
  });

  it('lets a non-holder release a stale lock', async () => {
    await setLock(lesson, alice.id, ago(STALE_MS));

    const res = await release(lesson.id, bob.id);

    expect(res.status).toBe(200);
    expect(await readLock(lesson)).toEqual({ lockedBy: null, lockedAt: null });
  });

  it('answers 400 without userId', async () => {
    const res = await release(lesson.id);
    expect(res.status).toBe(400);
  });

  it('answers 404 for an unknown lesson', async () => {
    const res = await release(999999, alice.id);
    expect(res.status).toBe(404);
  });
});

describe('PUT /lessons/:id/lock/heartbeat', () => {
  it('answers 403 for a non-holder', async () => {
    await setLock(lesson, alice.id, ago(5_000));

    const res = await heartbeat(lesson.id, bob.id);

    expect(res.status).toBe(403);
  });

  it('answers 403 when the lesson is unlocked', async () => {
    const res = await heartbeat(lesson.id, alice.id);
    expect(res.status).toBe(403);
  });

  it('moves lockedAt forward for the holder', async () => {
    const before = ago(30_000);
    await setLock(lesson, alice.id, before);

    const res = await heartbeat(lesson.id, alice.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ locked: true });
    const stored = await readLock(lesson);
    expect(stored.lockedBy).toBe(alice.id);
    expect(new Date(stored.lockedAt).getTime()).toBeGreaterThan(new Date(before).getTime());
  });

  it('answers 400 without userId', async () => {
    const res = await heartbeat(lesson.id);
    expect(res.status).toBe(400);
  });

  it('answers 404 for an unknown lesson', async () => {
    const res = await heartbeat(999999, alice.id);
    expect(res.status).toBe(404);
  });

  it('leaves slug and content untouched (the lesson hook runs and does nothing)', async () => {
    await setLock(lesson, alice.id, ago(5_000));
    const before = await strapi.documents(LESSON_UID).findOne({ documentId: lesson.documentId });

    await heartbeat(lesson.id, alice.id);
    await release(lesson.id, alice.id);

    const after = await strapi.documents(LESSON_UID).findOne({ documentId: lesson.documentId });
    expect(after.slug).toBe(before.slug);
    expect(after.name).toBe(before.name);
    expect(after.blocksV2).toEqual(before.blocksV2);
  });
});

describe('GET /lessons/:id/lock-status', () => {
  it('reports a fresh lock with its holder', async () => {
    const lockedAt = ago(5_000);
    await setLock(lesson, alice.id, lockedAt);

    const res = await lockStatus(lesson.id);

    expect(res.status).toBe(200);
    expect(res.body.isLocked).toBe(true);
    // Exactly the shape the frontend's LockStatus type expects.
    expect(res.body.lockedBy).toEqual({
      id: alice.id,
      firstName: 'Alice',
      lastName: 'Liddell',
    });
    expect(new Date(res.body.lockedAt).getTime()).toBe(new Date(lockedAt).getTime());
  });

  it('reports a stale lock as unlocked', async () => {
    await setLock(lesson, alice.id, ago(STALE_MS));

    const res = await lockStatus(lesson.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isLocked: false, lockedBy: null, lockedAt: null });
  });

  it('reports a never-locked lesson as unlocked', async () => {
    const res = await lockStatus(lesson.id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isLocked: false, lockedBy: null, lockedAt: null });
  });

  it('answers 404 for an unknown lesson', async () => {
    const res = await lockStatus(999999);
    expect(res.status).toBe(404);
  });
});

describe(':id forms', () => {
  it.each([
    ['numeric id', (l) => l.id],
    ['documentId', (l) => l.documentId],
  ])('every route works with the %s', async (_label, ref) => {
    const key = ref(lesson);

    expect((await acquire(key, alice.id)).status).toBe(200);
    expect((await readLock(lesson)).lockedBy).toBe(alice.id);

    expect((await acquire(key, bob.id)).status).toBe(409);

    const status = await lockStatus(key);
    expect(status.status).toBe(200);
    expect(status.body.isLocked).toBe(true);

    expect((await heartbeat(key, alice.id)).status).toBe(200);
    expect((await heartbeat(key, bob.id)).status).toBe(403);

    expect((await release(key, bob.id)).status).toBe(403);
    expect((await release(key, alice.id)).status).toBe(200);
    expect(await readLock(lesson)).toEqual({ lockedBy: null, lockedAt: null });
  });

  it.each([
    ['a path-like id', '..%2Fx'],
    ['an id with punctuation', 'abc-def'],
    ['an unknown documentId', 'zzzzzzzzzzzzzzzzzzzzzzzz'],
  ])('answers 404 for %s on every route', async (_label, ref) => {
    expect((await acquire(ref, alice.id)).status).toBe(404);
    expect((await release(ref, alice.id)).status).toBe(404);
    expect((await heartbeat(ref, alice.id)).status).toBe(404);
    expect((await lockStatus(ref)).status).toBe(404);
  });
});

describe('acquire is all or nothing', () => {
  it('rolls back the write when the transaction throws, and answers 500', async () => {
    const holderLockedAt = ago(STALE_MS);
    await setLock(lesson, alice.id, holderLockedAt);
    const before = await readLock(lesson);

    // db.query(uid) returns a cached repository object, so patching its
    // `update` also affects the controller. It runs the real UPDATE inside
    // the transaction and then throws, which must roll the UPDATE back.
    const repo = strapi.db.query(LESSON_UID);
    const realUpdate = repo.update;
    const spy = jest.spyOn(repo, 'update').mockImplementation(async (params) => {
      await realUpdate(params);
      throw new Error('forced failure after the write');
    });
    const logSpy = jest.spyOn(strapi.log, 'error').mockImplementation(() => {});

    try {
      const res = await acquire(lesson.id, bob.id);

      expect(spy).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('Failed to acquire lock');
    } finally {
      spy.mockRestore();
      logSpy.mockRestore();
    }

    expect(await readLock(lesson)).toEqual(before);
  });
});
