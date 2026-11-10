// Streak days (ODY-918): one row per learner per local date, listing the
// lessons they finished for the first time that day. The Next.js server
// works out the date in the learner's time zone and records each new lesson
// (frontend/lib/streak-days.ts). The current and longest streak are worked
// out from the rows when they're read, so nothing here goes stale at midnight.

export const STREAK_DAY_UID = 'api::streak-day.streak-day';
const USER_UID = 'api::authorized-user.authorized-user';

/** Thrown with the HTTP status the controller should answer with. */
export class StreakDayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Row = Record<string, any>;

export type RecordStreakDayInput = {
  userId: number;
  /** The learner's local date, YYYY-MM-DD */
  date: string;
  lessonId: number;
};

export type RecordStreakDayResult = {
  date: string;
  /** Lessons finished that day, this one included */
  lessons: number;
  /** False when the lesson was already on the day */
  added: boolean;
};

export const streakDayKey = (userId: number, date: string) => `${userId}:${date}`;

/** A real calendar date written YYYY-MM-DD, such as 2026-11-10 (not 2026-02-30). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

async function findDay(key: string): Promise<Row | null> {
  return (await strapi.documents(STREAK_DAY_UID).findFirst({
    filters: { key },
    fields: ['date', 'lessonIds'],
  } as any)) as Row | null;
}

const lessonsOf = (row: Row | null): number[] =>
  Array.isArray(row?.lessonIds) ? row.lessonIds.filter(Number.isSafeInteger) : [];

/**
 * Adds `lessonId` to the learner's row for `date`, creating the row with the
 * day's first lesson. Safe to repeat: a lesson already on the day changes
 * nothing. The row lock serializes two lessons finished at the same moment.
 */
export async function recordStreakDay(
  input: RecordStreakDayInput,
): Promise<RecordStreakDayResult> {
  const key = streakDayKey(input.userId, input.date);

  const once = () =>
    strapi.db.transaction(async () => {
      await strapi.db
        .queryBuilder(STREAK_DAY_UID)
        .select(['id'])
        .where({ key })
        .forUpdate()
        .first()
        .execute();
      const existing = await findDay(key);
      const lessons = lessonsOf(existing);
      if (lessons.includes(input.lessonId)) {
        return { date: input.date, lessons: lessons.length, added: false };
      }

      const lessonIds = [...lessons, input.lessonId];
      if (existing) {
        await strapi.documents(STREAK_DAY_UID).update({
          documentId: existing.documentId,
          data: { lessonIds },
        } as any);
      } else {
        const user = (await strapi.documents(USER_UID).findFirst({
          filters: { id: input.userId },
          fields: ['id'],
        } as any)) as Row | null;
        if (!user) throw new StreakDayError(404, 'User not found');
        await strapi.documents(STREAK_DAY_UID).create({
          data: { key, date: input.date, lessonIds, user: user.documentId },
        } as any);
      }
      return { date: input.date, lessons: lessonIds.length, added: true };
    });

  try {
    return await once();
  } catch (err) {
    // Another request created the day's row first. The unique index rejected
    // this insert, which aborts the transaction on Postgres, so the second
    // try is a new transaction that finds the row and adds to it.
    if (err instanceof StreakDayError || !(await findDay(key))) throw err;
    return once();
  }
}
