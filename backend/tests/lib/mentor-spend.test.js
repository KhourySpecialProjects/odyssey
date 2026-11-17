const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { MENTOR_USAGE_UID, USER_UID, mentorUsageData, userData } = require('../helpers/fixtures');

const M = 1_000_000;
// The seed prices (backend/src/lib/ai-scoring-settings.ts).
const PRICES = {
  'claude-sonnet-5-5': { inputPerMillionUsd: 2, outputPerMillionUsd: 10 },
  'claude-haiku-5-5': { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.5 },
};

let strapi;
let mentorSpendThisMonthUsd;
let mentorAnswersToday;
let dayBounds;
let monthBounds;
let userA;
let userB;

// A row created at `createdAt`. Raw SQL, because the Query Engine sets
// createdAt itself.
async function usageAt(createdAt, data = {}, user = userA) {
  const row = await strapi.documents(MENTOR_USAGE_UID).create({
    data: mentorUsageData({ user: user.documentId, ...data }),
  });
  await strapi.db
    .connection('mentor_usages')
    .where({ id: row.id })
    .update({ created_at: new Date(createdAt) });
}

const clearUsage = () => strapi.db.connection('mentor_usages').del();

beforeAll(async () => {
  strapi = await setupStrapi();
  ({ mentorSpendThisMonthUsd, mentorAnswersToday } = require('../../dist/src/lib/mentor-spend'));
  ({ dayBounds, monthBounds } = require('../../dist/src/lib/ai-scoring-spend'));
  userA = await strapi.documents(USER_UID).create({ data: userData() });
  userB = await strapi.documents(USER_UID).create({ data: userData() });
});

afterAll(async () => {
  await teardownStrapi();
});

describe('mentorSpendThisMonthUsd', () => {
  beforeAll(async () => {
    await clearUsage();
    // Boston is UTC-4 until 2am on November 1, 2026, then UTC-5.
    await usageAt('2026-10-15T12:00:00Z', { inputTokens: M }); // $2
    // 11:30pm on October 31 in Boston.
    await usageAt('2026-11-01T03:30:00Z', { outputTokens: M }); // $10
    // 12:30am on November 1 in Boston.
    await usageAt('2026-11-01T04:30:00Z', {
      model: 'claude-haiku-5-5',
      inputTokens: M,
      outputTokens: M,
    }); // $0.60
  });

  it.each([
    ['October', '2026-10-20T12:00:00Z', 12],
    ['November', '2026-11-15T12:00:00Z', 0.6],
  ])('adds up only the answers created in %s, Boston time', async (_, now, usd) => {
    expect(await mentorSpendThisMonthUsd(PRICES, new Date(now))).toBeCloseTo(usd, 10);
  });

  it('charges a model with no price at the highest input price', async () => {
    await clearUsage();
    await usageAt('2026-12-10T12:00:00Z', { model: 'claude-haiku-4-5', inputTokens: M });

    expect(await mentorSpendThisMonthUsd(PRICES, new Date('2026-12-15T12:00:00Z'))).toBeCloseTo(
      2,
      10,
    );
  });
});

describe('mentorAnswersToday', () => {
  beforeAll(async () => {
    await clearUsage();
    // 11:59pm and 12:01am Eastern around midnight on November 10 (UTC-5).
    await usageAt('2026-11-10T04:59:00Z', {}, userA); // 11:59pm on the 9th
    await usageAt('2026-11-10T05:01:00Z', {}, userA); // 12:01am on the 10th
    await usageAt('2026-11-10T05:02:00Z', {}, userB);
  });

  it('counts only the answers since midnight Boston time', async () => {
    expect(await mentorAnswersToday(userA.id, new Date('2026-11-10T04:59:30Z'))).toBe(1);
    expect(await mentorAnswersToday(userA.id, new Date('2026-11-10T05:01:30Z'))).toBe(1);
  });

  it("does not count another user's answers", async () => {
    expect(await mentorAnswersToday(userB.id, new Date('2026-11-10T12:00:00Z'))).toBe(1);
    expect(await mentorAnswersToday(userA.id, new Date('2026-11-10T12:00:00Z'))).toBe(1);
  });
});

describe('dayBounds', () => {
  const hours = ({ start, end }) => (end - start) / 3_600_000;

  it('runs midnight to midnight Eastern on a normal day', () => {
    const b = dayBounds(new Date('2026-06-15T12:00:00Z'));
    expect(b.start.toISOString()).toBe('2026-06-15T04:00:00.000Z');
    expect(b.end.toISOString()).toBe('2026-06-16T04:00:00.000Z');
    expect(hours(b)).toBe(24);
  });

  it('is 25 hours long when the clocks fall back (Nov 1 2026)', () => {
    const b = dayBounds(new Date('2026-11-01T12:00:00Z'));
    expect(b.start.toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(b.end.toISOString()).toBe('2026-11-02T05:00:00.000Z');
    expect(hours(b)).toBe(25);
  });

  it('is 23 hours long when the clocks spring forward (Mar 8 2026)', () => {
    const b = dayBounds(new Date('2026-03-08T12:00:00Z'));
    expect(b.start.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(b.end.toISOString()).toBe('2026-03-09T04:00:00.000Z');
    expect(hours(b)).toBe(23);
  });

  it('rolls past the end of a month and a year', () => {
    expect(dayBounds(new Date('2026-12-31T20:00:00Z')).end.toISOString()).toBe(
      '2027-01-01T05:00:00.000Z',
    );
  });

  it('puts 11:59pm and 12:01am Eastern in different days', () => {
    const before = dayBounds(new Date('2026-11-10T04:59:00Z'));
    const after = dayBounds(new Date('2026-11-10T05:01:00Z'));
    expect(before.end.toISOString()).toBe('2026-11-10T05:00:00.000Z');
    expect(after.start.toISOString()).toBe('2026-11-10T05:00:00.000Z');
  });

  it('leaves monthBounds unchanged', () => {
    const b = monthBounds(new Date('2026-11-15T12:00:00Z'));
    expect(b.start.toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(b.end.toISOString()).toBe('2026-12-01T05:00:00.000Z');
  });
});

describe('mentor-usage schema', () => {
  it('has no attribute that could hold question or answer text', () => {
    const { attributes } = strapi.contentType(MENTOR_USAGE_UID);
    const own = Object.keys(attributes).filter(
      (name) =>
        ![
          'id',
          'documentId',
          'createdAt',
          'updatedAt',
          'publishedAt',
          'createdBy',
          'updatedBy',
          'locale',
          'localizations',
        ].includes(name),
    );

    expect(own.sort()).toEqual(['inputTokens', 'kind', 'model', 'outputTokens', 'user']);
    for (const type of ['text', 'richtext', 'blocks', 'json']) {
      expect(Object.values(attributes).map((a) => a.type)).not.toContain(type);
    }
  });
});
