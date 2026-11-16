const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { USER_UID, userData } = require('../helpers/fixtures');

let strapi;

beforeAll(async () => {
  strapi = await setupStrapi();
});

afterAll(async () => {
  await teardownStrapi();
});

const create = (data = {}) => strapi.documents(USER_UID).create({ data: userData(data) });
const zoneOf = async (documentId) =>
  (await strapi.documents(USER_UID).findOne({ documentId })).timeZone;
// db.query skips enum validation, so it can store the padded values rows have today.
const force = (id, timeZone) =>
  strapi.db.transaction(() =>
    strapi.db.query(USER_UID).updateMany({ where: { id }, data: { timeZone } })
  );

describe('authorized-user timeZone enum', () => {
  it('accepts the plain zone names the Settings selector sends', async () => {
    const user = await create();
    await strapi.documents(USER_UID).update({
      documentId: user.documentId,
      data: { timeZone: 'America/Los_Angeles' },
    });
    expect(await zoneOf(user.documentId)).toBe('America/Los_Angeles');
  });

  it('defaults new users to America/New_York with no padding', async () => {
    const user = await create();
    expect(await zoneOf(user.documentId)).toBe('America/New_York');
  });

  it('has no enum value with surrounding whitespace', () => {
    const { enum: values, default: fallback } =
      strapi.contentType(USER_UID).attributes.timeZone;
    for (const value of [...values, fallback]) expect(value).toBe(value.trim());
  });

  it('lists only zones Intl can format', () => {
    for (const timeZone of strapi.contentType(USER_UID).attributes.timeZone.enum) {
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone })).not.toThrow();
    }
  });
});

describe('backfillTimeZones', () => {
  let backfillTimeZones;

  beforeAll(() => {
    ({ backfillTimeZones } = require('../../dist/src/lib/time-zone-backfill'));
  });

  it('trims padded time zones, renames Honolulu and leaves the rest', async () => {
    const newYork = await create();
    const newYorkToo = await create();
    const tokyo = await create();
    const honolulu = await create();
    const clean = await create();
    const unset = await create();
    await force(newYork.id, 'America/New_York  ');
    await force(newYorkToo.id, 'America/New_York  ');
    await force(tokyo.id, 'Asia/Tokyo  ');
    await force(honolulu.id, 'America/Honolulu  ');
    await force(clean.id, 'Europe/London');
    await force(unset.id, null);

    expect(await backfillTimeZones()).toBe(4);

    expect(await zoneOf(newYork.documentId)).toBe('America/New_York');
    expect(await zoneOf(newYorkToo.documentId)).toBe('America/New_York');
    expect(await zoneOf(tokyo.documentId)).toBe('Asia/Tokyo');
    expect(await zoneOf(honolulu.documentId)).toBe('Pacific/Honolulu');
    expect(await zoneOf(clean.documentId)).toBe('Europe/London');
    expect(await zoneOf(unset.documentId)).toBeNull();
  });

  it('changes nothing when run again', async () => {
    expect(await backfillTimeZones()).toBe(0);
  });
});
