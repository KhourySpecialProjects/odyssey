// What Score with AI has spent (ODY-815): the tokens each run recorded,
// priced with the settings' prices.
import { AI_SCORING_SETTINGS_SEED, type ModelPrice } from './ai-scoring-settings';

const RUN_UID = 'api::ai-scoring-run.ai-scoring-run';

/** A month starts at midnight Boston time, how the team reads a month. */
export const SPEND_TIME_ZONE = 'America/New_York';

export type RunUsage = {
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

/**
 * The highest input and the highest output price of any model, for a model
 * with no price of its own. With no prices at all, the placeholders'.
 */
function highestPrice(prices: Record<string, ModelPrice>): ModelPrice {
  const known = Object.values(prices);
  const pool = known.length ? known : AI_SCORING_SETTINGS_SEED.prices;
  return {
    inputPerMillionUsd: Math.max(...pool.map((p) => p.inputPerMillionUsd)),
    outputPerMillionUsd: Math.max(...pool.map((p) => p.outputPerMillionUsd)),
  };
}

/**
 * What a run has cost so far, in US dollars. A model with no price is charged
 * at the highest, so a missing price never lets spend through. `inputTokens`
 * includes cache reads and writes at the full input price (ODY-814), so this
 * is a little above the real bill: the safe side for a cap.
 */
export function runCostUsd(
  run: RunUsage,
  prices: Record<string, ModelPrice>,
): number {
  const price =
    run.model && Object.prototype.hasOwnProperty.call(prices, run.model)
      ? prices[run.model]
      : highestPrice(prices);
  return (
    ((run.inputTokens ?? 0) * price.inputPerMillionUsd +
      (run.outputTokens ?? 0) * price.outputPerMillionUsd) /
    1_000_000
  );
}

const bostonClock = new Intl.DateTimeFormat('en-US', {
  timeZone: SPEND_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

/** Boston's wall clock at `at`, written as if it were UTC. */
function bostonWallMs(at: number): number {
  const p = Object.fromEntries(
    bostonClock.formatToParts(at).map(({ type, value }) => [type, Number(value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Midnight Boston time on the 1st of `month` (0-based; 12 is next January). */
function bostonMonthStart(year: number, month: number): Date {
  const utcMidnight = Date.UTC(year, month, 1);
  // Boston's clocks change at 2am, never across midnight on the 1st, so the
  // offset at UTC midnight is the offset at Boston's.
  return new Date(utcMidnight - (bostonWallMs(utcMidnight) - utcMidnight));
}

/** The Boston-time month `now` falls in: `start` inclusive, `end` exclusive. */
function monthBounds(now: Date): { start: Date; end: Date } {
  const wall = new Date(bostonWallMs(now.getTime()));
  const year = wall.getUTCFullYear();
  const month = wall.getUTCMonth();
  return {
    start: bostonMonthStart(year, month),
    end: bostonMonthStart(year, month + 1),
  };
}

/**
 * This month's Score with AI spend in US dollars: every run created this
 * month, priced by its model. A run with no tokens yet counts as $0 (ODY-853
 * reserves for runs still going). `startedAt` waits for the first heartbeat,
 * so the month is read from `createdAt`.
 */
export async function spendThisMonthUsd(
  prices: Record<string, ModelPrice>,
  now = new Date(),
): Promise<number> {
  const { start, end } = monthBounds(now);
  const runs = (await strapi.documents(RUN_UID).findMany({
    filters: {
      createdAt: { $gte: start.toISOString(), $lt: end.toISOString() },
    },
    fields: ['model', 'inputTokens', 'outputTokens'],
  } as any)) as RunUsage[];
  return runs.reduce((sum, run) => sum + runCostUsd(run, prices), 0);
}
