const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const {
  MENTOR_USAGE_UID,
  MENTOR_SETTING_UID,
  GROUP_UID,
  USER_UID,
  mentorUsageData,
  groupData,
  userData,
} = require('../helpers/fixtures');

let strapi;
let token;
let checkMentorAllowance;
let dayBounds;
let monthBounds;
let user;
let other;

const M = 1_000_000;
const rest = () => request(strapi.server.httpServer);
const auth = () => ({ Authorization: `Bearer ${token}` });
const post = (path, body) => rest().post(`/api/mentor-usages/${path}`).set(auth()).send(body);
const check = (userId = user.id) => post('check', { userId });

const recordBody = (overrides = {}) => ({
  userId: user.id,
  kind: 'explain',
  model: 'claude-sonnet-5-5',
  inputTokens: 1200,
  outputTokens: 300,
  ...overrides,
});
const record = (overrides) => post('record', recordBody(overrides));

const usageRows = () =>
  strapi.db.query(MENTOR_USAGE_UID).findMany({ populate: { user: true } });
const settingsRow = () => strapi.documents(MENTOR_SETTING_UID).findFirst();
const setSettings = async (data) =>
  strapi.documents(MENTOR_SETTING_UID).update({
    documentId: (await settingsRow()).documentId,
    data,
  });

// A row for `forUser` created at `createdAt` (now when omitted). Raw SQL,
// because the Query Engine sets createdAt itself.
async function usage(data = {}, createdAt, forUser = user) {
  const row = await strapi.documents(MENTOR_USAGE_UID).create({
    data: mentorUsageData({ user: forUser.documentId, ...data }),
  });
  if (createdAt) {
    await strapi.db
      .connection('mentor_usages')
      .where({ id: row.id })
      .update({ created_at: new Date(createdAt) });
  }
  return row;
}
// Sonnet input is $2 a million tokens.
const costing = (usd, data = {}) => usage({ inputTokens: usd * 500_000, ...data });

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
  ({ checkMentorAllowance } = require('../../dist/src/lib/mentor-usage'));
  ({ dayBounds, monthBounds } = require('../../dist/src/lib/ai-scoring-spend'));
});

afterAll(async () => {
  await teardownStrapi();
});

beforeEach(async () => {
  await strapi.db.connection('mentor_usages').del();
  await setSettings({
    enabled: true,
    pilotGroups: [],
    monthlyCapUsd: 10,
    perUserDailyLimit: 3,
  });
  user = await strapi.documents(USER_UID).create({ data: userData() });
  other = await strapi.documents(USER_UID).create({ data: userData() });
});

describe('POST /mentor-usages/check', () => {
  it('allows by default', async () => {
    const res = await check();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ allowed: true });
  });

  it('refuses everyone while Mentor is off, before any other reason', async () => {
    // Over the daily limit and the cap too: off still wins.
    await costing(10);
    await setSettings({ enabled: false, monthlyCapUsd: 0 });

    const res = await check();

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      allowed: false,
      reason: 'disabled',
      message: "Mentor isn't available right now.",
      retryAt: null,
    });
  });

  describe('pilot groups', () => {
    let group;

    beforeEach(async () => {
      group = await strapi.documents(GROUP_UID).create({
        data: groupData({ members: [user.documentId] }),
      });
      await setSettings({ pilotGroups: [group.documentId] });
    });

    it('allows a member', async () => {
      const res = await check(user.id);

      expect(res.body.data).toEqual({ allowed: true });
    });

    it('refuses someone outside the group', async () => {
      const res = await check(other.id);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        allowed: false,
        reason: 'not_in_pilot',
        message: "Mentor isn't available for your account yet.",
        retryAt: null,
      });
    });

    it('lets everyone in once the pilot groups are empty', async () => {
      await setSettings({ pilotGroups: [] });

      const res = await check(other.id);

      expect(res.body.data).toEqual({ allowed: true });
    });
  });

  describe('monthly cap', () => {
    // The next 1st at midnight Eastern, whichever offset applies.
    const nextFirst = () => monthBounds(new Date()).end.toISOString();

    it('allows just under the cap', async () => {
      await costing(9.99, { user: other.documentId });

      const res = await check();

      expect(res.body.data).toEqual({ allowed: true });
    });

    it('refuses at exactly the cap, until the 1st', async () => {
      await costing(6, { user: other.documentId });
      await costing(4);

      const res = await check();

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        allowed: false,
        reason: 'monthly_cap',
        message: 'Mentor is resting until the 1st.',
        retryAt: nextFirst(),
      });
      expect(['04:00:00.000Z', '05:00:00.000Z']).toContain(
        res.body.data.retryAt.slice(-13),
      );
      expect(res.body.data.retryAt.slice(8, 10)).toBe('01');
    });

    it('charges a model with no price at the highest price', async () => {
      // Unpriced: 5M input tokens at the highest input price ($2) is $10.
      await usage({ model: 'claude-haiku-4-5', inputTokens: 5 * M });

      const res = await check();

      expect(res.body.data.reason).toBe('monthly_cap');
    });

    it('refuses everyone when the cap is $0', async () => {
      await setSettings({ monthlyCapUsd: 0 });

      const res = await check();

      expect(res.body.data.reason).toBe('monthly_cap');
    });

    it("doesn't count last month's spend", async () => {
      const { id } = await costing(10);
      await strapi.db
        .connection('mentor_usages')
        .where({ id })
        .update({ created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) });

      const res = await check();

      expect(res.body.data).toEqual({ allowed: true });
    });
  });

  describe('daily limit', () => {
    it('refuses at the limit, naming it, until the next midnight Eastern', async () => {
      await usage();
      await usage();
      await usage();
      // Another user's answers don't count.
      await usage({}, undefined, other);

      const res = await check();

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        allowed: false,
        reason: 'daily_limit',
        message:
          "You've asked Mentor 3 questions today. You can ask again after midnight Eastern time.",
        retryAt: dayBounds(new Date()).end.toISOString(),
      });
      expect(['04:00:00.000Z', '05:00:00.000Z']).toContain(
        res.body.data.retryAt.slice(-13),
      );
    });

    it("doesn't count yesterday's answers", async () => {
      // 11:59pm Eastern yesterday.
      const yesterday = new Date(dayBounds(new Date()).start.getTime() - 60 * 1000);
      await usage({}, yesterday);
      await usage({}, yesterday);
      await usage({}, yesterday);

      const res = await check();

      expect(res.body.data).toEqual({ allowed: true });
    });

    it('holds at the midnight Eastern boundary', async () => {
      const midnight = dayBounds(new Date()).start;
      const before = new Date(midnight.getTime() - 60 * 1000); // 11:59pm
      await usage({}, before);
      await usage({}, before);
      await usage({}, before);

      // 11:59:30pm: the three still count. 12:00:30am: a new day.
      const justBefore = await checkMentorAllowance(
        user.id,
        new Date(midnight.getTime() - 30 * 1000),
      );
      const justAfter = await checkMentorAllowance(
        user.id,
        new Date(midnight.getTime() + 30 * 1000),
      );

      expect(justBefore).toMatchObject({ allowed: false, reason: 'daily_limit' });
      expect(justAfter).toEqual({ allowed: true });
    });
  });

  it('is a 400 for a bad body', async () => {
    const res = await post('check', { userId: user.id, question: 'hi' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid key question');
    expect((await post('check', {})).status).toBe(400);
  });

  it('writes nothing', async () => {
    await check();

    expect(await usageRows()).toHaveLength(0);
  });
});

describe('POST /mentor-usages/record', () => {
  it('writes one row with the user, kind, model and tokens', async () => {
    const res = await record();

    expect(res.status).toBe(200);
    const rows = await usageRows();
    expect(rows).toHaveLength(1);
    expect(res.body.data).toEqual({ id: rows[0].id });
    expect(rows[0]).toMatchObject({
      kind: 'explain',
      model: 'claude-sonnet-5-5',
      inputTokens: 1200,
      outputTokens: 300,
    });
    expect(rows[0].user.id).toBe(user.id);
  });

  it('counts toward the daily limit', async () => {
    await record();
    await record();
    await record();

    const res = await check();

    expect(res.body.data.reason).toBe('daily_limit');
  });

  it('rejects unknown keys, such as question text, and writes nothing', async () => {
    const res = await record({ question: 'What is a closure?', answer: 'A function.' });

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Invalid key question');
    expect(await usageRows()).toHaveLength(0);
  });

  it.each([
    ['a bad kind', { kind: 'chat' }],
    ['a missing kind', { kind: undefined }],
    ['an empty model', { model: '' }],
    ['a model over 100 characters', { model: 'm'.repeat(101) }],
    ['negative input tokens', { inputTokens: -1 }],
    ['fractional output tokens', { outputTokens: 1.5 }],
    ['text for tokens', { inputTokens: '12' }],
    ['a missing userId', { userId: undefined }],
  ])('is a 400 for %s', async (_, overrides) => {
    const res = await record(overrides);

    expect(res.status).toBe(400);
    expect(await usageRows()).toHaveLength(0);
  });

  it('is a 404 for an unknown user', async () => {
    const res = await record({ userId: 2147483000 });

    expect(res.status).toBe(404);
    expect(res.body.error.message).toBe('User not found');
    expect(await usageRows()).toHaveLength(0);
  });

  it('still saves a model with no price, and warns', async () => {
    const warn = jest.spyOn(strapi.log, 'warn').mockImplementation(() => {});

    const res = await record({ model: 'claude-haiku-4-5' });

    expect(res.status).toBe(200);
    expect(await usageRows()).toHaveLength(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('claude-haiku-4-5'));
    warn.mockRestore();
  });
});

describe('REST', () => {
  it('does not route a core create on /mentor-usages', async () => {
    const res = await rest()
      .post('/api/mentor-usages')
      .set(auth())
      .send({ data: { kind: 'lesson', model: 'claude-sonnet-5-5' } });

    expect([404, 405]).toContain(res.status);
    expect(await usageRows()).toHaveLength(0);
  });
});
