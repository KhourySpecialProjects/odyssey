// What Mentor has spent and how often a user has asked (ODY-884): the tokens
// each answer recorded, priced with Score with AI's prices.
import type { ModelPrice } from './ai-scoring-settings';
import { dayBounds, monthBounds, runCostUsd, type RunUsage } from './ai-scoring-spend';

export const MENTOR_USAGE_UID = 'api::mentor-usage.mentor-usage';

/**
 * This month's Mentor spend in US dollars: every answer created this month
 * (Boston time), priced by its model. A model with no price is charged at the
 * highest.
 */
export async function mentorSpendThisMonthUsd(
  prices: Record<string, ModelPrice>,
  now = new Date(),
): Promise<number> {
  const { start, end } = monthBounds(now);
  const rows = (await strapi.documents(MENTOR_USAGE_UID).findMany({
    filters: {
      createdAt: { $gte: start.toISOString(), $lt: end.toISOString() },
    },
    fields: ['model', 'inputTokens', 'outputTokens'],
  } as any)) as RunUsage[];
  return rows.reduce((sum, row) => sum + runCostUsd(row, prices), 0);
}

/** How many answers `userId` has had since midnight Boston time. */
export async function mentorAnswersToday(userId: number, now = new Date()): Promise<number> {
  const { start, end } = dayBounds(now);
  return strapi.documents(MENTOR_USAGE_UID).count({
    filters: {
      user: { id: userId },
      createdAt: { $gte: start.toISOString(), $lt: end.toISOString() },
    },
  } as any);
}
