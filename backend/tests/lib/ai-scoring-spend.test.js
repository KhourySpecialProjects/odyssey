const { setupStrapi, teardownStrapi } = require('../helpers/strapi');
const { AI_SCORING_RUN_UID } = require('../helpers/fixtures');

const M = 1_000_000;
const PRICES = {
  'claude-sonnet-5-5': { inputPerMillionUsd: 2, outputPerMillionUsd: 10 },
  'claude-haiku-5-5': { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.5 },
};

let strapi;
let spendThisMonthUsd;
let runCostUsd;

// A run created at `createdAt`. Raw SQL, because the Query Engine sets
// createdAt itself.
async function runAt(createdAt, data) {
  const run = await strapi
    .documents(AI_SCORING_RUN_UID)
    .create({ data: { runState: 'done', ...data } });
  await strapi.db
    .connection('ai_scoring_runs')
    .where({ id: run.id })
    .update({ created_at: new Date(createdAt) });
}

beforeAll(async () => {
  strapi = await setupStrapi();
  ({ spendThisMonthUsd, runCostUsd } = require('../../dist/src/lib/ai-scoring-spend'));

  // Boston is UTC-4 until 2am on November 1, 2026, then UTC-5.
  await runAt('2026-10-15T12:00:00Z', { model: 'claude-sonnet-5-5', inputTokens: M }); // $2
  // 11:30pm on October 31 in Boston.
  await runAt('2026-11-01T03:30:00Z', { model: 'claude-sonnet-5-5', outputTokens: M }); // $10
  // 12:30am on November 1 in Boston.
  await runAt('2026-11-01T04:30:00Z', {
    model: 'claude-haiku-5-5',
    inputTokens: M,
    outputTokens: M,
  }); // $0.60
  // 11:30pm on November 30 in Boston; no price, so Sonnet's.
  await runAt('2026-12-01T04:30:00Z', { model: 'claude-opus-x', inputTokens: M }); // $2
  // 12:30am on December 1 in Boston, no tokens reported yet.
  await runAt('2026-12-01T05:30:00Z', { model: 'claude-sonnet-5-5', runState: 'running' }); // $0
  await runAt('2026-12-02T12:00:00Z', { model: 'claude-sonnet-5-5', inputTokens: M / 2 }); // $1
});

afterAll(async () => {
  await teardownStrapi();
});

describe('spendThisMonthUsd', () => {
  it.each([
    ['October', '2026-10-20T12:00:00Z', 12],
    ['November', '2026-11-15T12:00:00Z', 2.6],
    ['December', '2026-12-10T12:00:00Z', 1],
  ])('adds up only the runs created in %s, Boston time', async (_, now, usd) => {
    expect(await spendThisMonthUsd(PRICES, new Date(now))).toBeCloseTo(usd, 10);
  });
});

describe('runCostUsd', () => {
  // The highest input and the highest output price belong to different models.
  const mixed = {
    a: { inputPerMillionUsd: 3, outputPerMillionUsd: 5 },
    b: { inputPerMillionUsd: 1, outputPerMillionUsd: 15 },
  };

  const tokens = { inputTokens: M, outputTokens: M };

  it.each([
    ['its own model price', { model: 'b', ...tokens }, mixed, 16],
    ['the highest of each price for an unpriced model', { model: 'c', ...tokens }, mixed, 18],
    ['the highest for a run with no model', tokens, mixed, 18],
    ["the placeholders' highest when there are no prices", { model: 'a', ...tokens }, {}, 12],
    ['nothing before any tokens are reported', { model: 'a' }, mixed, 0],
  ])('charges %s', (_, run, prices, usd) => {
    expect(runCostUsd(run, prices)).toBeCloseTo(usd, 10);
  });
});
