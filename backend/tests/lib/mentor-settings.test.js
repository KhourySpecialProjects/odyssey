const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');
const { MENTOR_SETTING_UID, GROUP_UID, groupData } = require('../helpers/fixtures');

let strapi;
let token;
let seedMentorSettings;
let loadMentorSettings;
let MENTOR_SETTINGS_SEED;

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
  ({
    seedMentorSettings,
    loadMentorSettings,
    MENTOR_SETTINGS_SEED,
  } = require('../../dist/src/lib/mentor-settings'));
});

afterAll(async () => {
  await teardownStrapi();
});

const settings = () => strapi.documents(MENTOR_SETTING_UID);
const stored = () => settings().findFirst({ populate: { pilotGroups: true } });
const rows = () => strapi.db.query(MENTOR_SETTING_UID).count();

describe('seedMentorSettings', () => {
  it('seeds Mentor switched off, with a $10 cap and 30 a day, on boot', async () => {
    const row = await stored();

    expect(row.enabled).toBe(false);
    expect(Number(row.monthlyCapUsd)).toBe(10);
    expect(row.perUserDailyLimit).toBe(30);
    expect(row.storeSharedAnswers).toBe(false);
    expect(MENTOR_SETTINGS_SEED).toEqual({
      enabled: false,
      monthlyCapUsd: 10,
      perUserDailyLimit: 30,
      storeSharedAnswers: false,
    });
  });

  it('creates nothing when run again, as on every restart', async () => {
    expect(await seedMentorSettings()).toBe(false);
    expect(await rows()).toBe(1);
  });

  it('never overwrites an edited value', async () => {
    const row = await stored();
    await settings().update({
      documentId: row.documentId,
      data: { monthlyCapUsd: 40.5, enabled: true },
    });

    expect(await seedMentorSettings()).toBe(false);
    const after = await stored();
    expect(Number(after.monthlyCapUsd)).toBe(40.5);
    expect(after.enabled).toBe(true);
  });
});

describe('loadMentorSettings', () => {
  it('returns the stored values as numbers, with the pilot group ids', async () => {
    const group = await strapi.documents(GROUP_UID).create({ data: groupData() });
    const row = await stored();
    await settings().update({
      documentId: row.documentId,
      data: {
        enabled: true,
        monthlyCapUsd: 12.5,
        perUserDailyLimit: 7,
        storeSharedAnswers: true,
        pilotGroups: [group.documentId],
      },
    });

    const loaded = await loadMentorSettings();

    expect(loaded).toEqual({
      enabled: true,
      pilotGroupIds: [group.id],
      monthlyCapUsd: 12.5,
      perUserDailyLimit: 7,
      storeSharedAnswers: true,
    });
    expect(typeof loaded.pilotGroupIds[0]).toBe('number');
  });

  it('falls back to the seed when the row is missing, so Mentor is off', async () => {
    const row = await stored();
    await settings().delete({ documentId: row.documentId });

    expect(await loadMentorSettings()).toEqual({
      enabled: false,
      pilotGroupIds: [],
      monthlyCapUsd: 10,
      perUserDailyLimit: 30,
      storeSharedAnswers: false,
    });
    // Seeding again puts the row back.
    expect(await seedMentorSettings()).toBe(true);
    expect(await rows()).toBe(1);
  });
});

describe('storeSharedAnswers', () => {
  it('reads a null stored value as off', async () => {
    const row = await stored();
    await strapi.db
      .connection('mentor_settings')
      .where({ id: row.id })
      .update({ store_shared_answers: null });

    expect((await loadMentorSettings()).storeSharedAnswers).toBe(false);
  });
});

describe('REST', () => {
  const rest = () => request(strapi.server.httpServer);

  it('can be read with the service token', async () => {
    const res = await rest()
      .get('/api/mentor-setting')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
  });

  it('cannot be changed over REST, only in the admin', async () => {
    const res = await rest()
      .put('/api/mentor-setting')
      .set({ Authorization: `Bearer ${token}` })
      .send({ data: { enabled: true, monthlyCapUsd: 1000000 } });

    expect(res.status).not.toBe(200);
    const row = await stored();
    expect(row.enabled).toBe(false);
    expect(Number(row.monthlyCapUsd)).toBe(10);
  });
});
