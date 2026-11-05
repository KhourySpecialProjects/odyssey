// Mentor's allowance check and usage record (ODY-884). The check is read-only:
// it takes no lock and reserves nothing, so answers still streaming can carry
// a user past the daily limit or Mentor past the monthly cap by a little.
import { loadAiScoringSettings } from './ai-scoring-settings';
import { dayBounds, monthBounds } from './ai-scoring-spend';
import { loadMentorSettings } from './mentor-settings';
import { mentorAnswersToday, mentorSpendThisMonthUsd, MENTOR_USAGE_UID } from './mentor-spend';

const GROUP_UID = 'api::group.group';
const USER_UID = 'api::authorized-user.authorized-user';

export const MENTOR_DISABLED_MESSAGE = "Mentor isn't available right now.";
export const MENTOR_NOT_IN_PILOT_MESSAGE = "Mentor isn't available for your account yet.";
export const MENTOR_MONTHLY_CAP_MESSAGE = 'Mentor is resting until the 1st.';
export const mentorDailyLimitMessage = (limit: number) =>
  `You've asked Mentor ${limit} questions today. You can ask again after midnight Eastern time.`;

export const MENTOR_KINDS = ['lesson', 'explain', 'quiz-hint'] as const;
export type MentorKind = (typeof MENTOR_KINDS)[number];

export type MentorRefusal = {
  allowed: false;
  reason: 'disabled' | 'not_in_pilot' | 'monthly_cap' | 'daily_limit';
  message: string;
  retryAt: string | null;
};

/** Thrown with the HTTP status the controller should answer with. */
export class MentorUsageError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const refuse = (
  reason: MentorRefusal['reason'],
  message: string,
  retryAt: Date | null = null,
): MentorRefusal => ({
  allowed: false,
  reason,
  message,
  retryAt: retryAt ? retryAt.toISOString() : null,
});

/**
 * Whether `userId` may ask Mentor now. The first refusal wins: switched off,
 * outside the pilot groups (none set means everyone), this month's Mentor
 * spend at the cap (a cap of $0 refuses everyone), then the user's answers
 * today at the daily limit.
 */
export async function checkMentorAllowance(
  userId: number,
  now = new Date(),
): Promise<{ allowed: true } | MentorRefusal> {
  const { enabled, pilotGroupIds, monthlyCapUsd, perUserDailyLimit } =
    await loadMentorSettings();
  if (!enabled) return refuse('disabled', MENTOR_DISABLED_MESSAGE);

  if (pilotGroupIds.length) {
    const inPilot = await strapi.documents(GROUP_UID).count({
      filters: { id: { $in: pilotGroupIds }, members: { id: userId } },
    } as any);
    if (inPilot === 0) return refuse('not_in_pilot', MENTOR_NOT_IN_PILOT_MESSAGE);
  }

  const { prices } = await loadAiScoringSettings();
  if ((await mentorSpendThisMonthUsd(prices, now)) >= monthlyCapUsd) {
    return refuse('monthly_cap', MENTOR_MONTHLY_CAP_MESSAGE, monthBounds(now).end);
  }

  if ((await mentorAnswersToday(userId, now)) >= perUserDailyLimit) {
    return refuse(
      'daily_limit',
      mentorDailyLimitMessage(perUserDailyLimit),
      dayBounds(now).end,
    );
  }

  return { allowed: true };
}

export type RecordMentorUsageInput = {
  userId: number;
  kind: MentorKind;
  model: string;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Writes one row for one answer: tokens only, never the question or answer. A
 * model with no price is still saved; it is charged at the highest price.
 */
export async function recordMentorUsage(
  input: RecordMentorUsageInput,
): Promise<{ id: number }> {
  const user = (await strapi.documents(USER_UID).findFirst({
    filters: { id: input.userId },
    fields: ['id'],
  } as any)) as { documentId: string } | null;
  if (!user) throw new MentorUsageError(404, 'User not found');

  const { prices } = await loadAiScoringSettings();
  if (!(input.model in prices)) {
    strapi.log.warn(
      `Mentor model ${input.model} has no price in ai-scoring-setting; charging it at the highest price.`,
    );
  }

  const row = await strapi.documents(MENTOR_USAGE_UID).create({
    data: {
      user: user.documentId,
      kind: input.kind,
      model: input.model,
      inputTokens: input.inputTokens,
      outputTokens: input.outputTokens,
    },
  } as any);
  return { id: Number(row.id) };
}
