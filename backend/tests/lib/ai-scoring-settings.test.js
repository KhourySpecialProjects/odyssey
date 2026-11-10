const request = require('supertest');
const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { createFullAccessToken } = require('../helpers/api-token');

const SETTINGS_UID = 'api::ai-scoring-setting.ai-scoring-setting';

let strapi;
let token;
let seedAiScoringSettings;
let loadAiScoringSettings;
let AI_SCORING_SETTINGS_SEED;

beforeAll(async () => {
  strapi = await setupStrapi();
  token = await createFullAccessToken(strapi);
  ({
    seedAiScoringSettings,
    loadAiScoringSettings,
    AI_SCORING_SETTINGS_SEED,
  } = require('../../dist/src/lib/ai-scoring-settings'));
});

afterAll(async () => {
  await teardownStrapi();
});

const settings = () => strapi.documents(SETTINGS_UID);
const stored = () => settings().findFirst({ populate: { prices: true } });
const rows = () => strapi.db.query(SETTINGS_UID).count();

describe('seedAiScoringSettings', () => {
  it('seeds the placeholder caps and both models\' prices on boot', async () => {
    const row = await stored();

    expect(Number(row.monthlyCapUsd)).toBe(AI_SCORING_SETTINGS_SEED.monthlyCapUsd);
    expect(Number(row.perRunCapUsd)).toBe(AI_SCORING_SETTINGS_SEED.perRunCapUsd);
    expect(
      row.prices.map((p) => [p.model, Number(p.inputPerMillionUsd), Number(p.outputPerMillionUsd)]),
    ).toEqual([
      ['claude-sonnet-5-5', 2, 10],
      ['claude-haiku-5-5', 0.1, 0.5],
    ]);
  });

  it('creates nothing when run again, as on every restart', async () => {
    expect(await seedAiScoringSettings()).toBe(false);
    expect(await rows()).toBe(1);
  });

  it('never overwrites an edited value', async () => {
    const row = await stored();
    await settings().update({
      documentId: row.documentId,
      data: { monthlyCapUsd: 40.5 },
    });

    expect(await seedAiScoringSettings()).toBe(false);
    expect(Number((await stored()).monthlyCapUsd)).toBe(40.5);
  });
});

describe('loadAiScoringSettings', () => {
  it('returns the stored values as numbers, with prices by model', async () => {
    const row = await stored();
    await settings().update({
      documentId: row.documentId,
      data: {
        monthlyCapUsd: 50,
        perRunCapUsd: 1.25,
        prices: [
          { model: 'claude-sonnet-5-5', inputPerMillionUsd: 3, outputPerMillionUsd: 15 },
        ],
      },
    });

    expect(await loadAiScoringSettings()).toEqual({
      monthlyCapUsd: 50,
      perRunCapUsd: 1.25,
      prices: {
        'claude-sonnet-5-5': { inputPerMillionUsd: 3, outputPerMillionUsd: 15 },
      },
    });
  });

  it('falls back to the placeholders when the row is missing, so the limits stay on', async () => {
    const row = await stored();
    await settings().delete({ documentId: row.documentId });

    expect(await loadAiScoringSettings()).toEqual({
      monthlyCapUsd: 25,
      perRunCapUsd: 2,
      prices: {
        'claude-sonnet-5-5': { inputPerMillionUsd: 2, outputPerMillionUsd: 10 },
        'claude-haiku-5-5': { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.5 },
      },
    });
    // Seeding again puts the row back.
    expect(await seedAiScoringSettings()).toBe(true);
    expect(await rows()).toBe(1);
  });
});

describe('REST', () => {
  const rest = () => request(strapi.server.httpServer);

  it('can be read with the service token', async () => {
    const res = await rest()
      .get('/api/ai-scoring-setting')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
  });

  it('cannot be changed over REST, only in the admin', async () => {
    const res = await rest()
      .put('/api/ai-scoring-setting')
      .set({ Authorization: `Bearer ${token}` })
      .send({ data: { monthlyCapUsd: 1000000 } });

    expect(res.status).not.toBe(200);
    expect(Number((await stored()).monthlyCapUsd)).toBe(25);
  });

  describe('POST /ai-scoring-setting/prompt', () => {
    const save = (body) =>
      rest()
        .post('/api/ai-scoring-setting/prompt')
        .set({ Authorization: `Bearer ${token}` })
        .send(body);
    const parts = (over = {}) => ({
      data: { instructions: 'I', lessonScope: 'L', overallScope: 'O', ...over },
    });

    it('saves three trimmed texts, and GET shows them', async () => {
      const res = await save(
        parts({ instructions: '  Be fair.  ', lessonScope: ' Lesson ', overallScope: 'Overall' }),
      );

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        instructions: 'Be fair.',
        lessonScope: 'Lesson',
        overallScope: 'Overall',
      });
      const get = await rest()
        .get('/api/ai-scoring-setting')
        .set({ Authorization: `Bearer ${token}` });
      expect(get.body.data).toMatchObject({ instructions: 'Be fair.' });
    });

    it('clears a part with null', async () => {
      await save(parts());
      const res = await save(parts({ lessonScope: null }));

      expect(res.status).toBe(200);
      expect(res.body.data.lessonScope).toBeNull();
      expect((await stored()).lessonScope).toBeNull();
    });

    it.each([
      ['blank', parts({ lessonScope: '' })],
      ['whitespace only', parts({ lessonScope: '   ' })],
      ['over the limit', parts({ instructions: 'x'.repeat(6001) })],
      ['a scope over the limit', parts({ overallScope: 'x'.repeat(1501) })],
      ['a missing key', { data: { instructions: 'I', lessonScope: 'L' } }],
      ['an extra key', parts({ monthlyCapUsd: 1000 })],
      ['no data', {}],
    ])('refuses %s and leaves the row unchanged', async (_name, body) => {
      await save(parts({ instructions: 'Kept' }));
      const res = await save(body);

      expect(res.status).toBe(400);
      expect((await stored()).instructions).toBe('Kept');
      expect(Number((await stored()).monthlyCapUsd)).toBe(25);
    });

    it('seeds the row when it is missing, then saves', async () => {
      await settings().delete({ documentId: (await stored()).documentId });

      const res = await save(parts({ instructions: 'Fresh' }));

      expect(res.status).toBe(200);
      expect(await rows()).toBe(1);
      expect((await stored()).instructions).toBe('Fresh');
    });
  });
});
