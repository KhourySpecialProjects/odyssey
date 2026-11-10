import {
  addDays,
  STREAK_REVIVES,
  type Streak,
  type StreakDay,
} from "@/lib/streaks";

// The days the streak testing panel (ODY-921, TEMPORARY) writes for its
// settings, relative to the panel's "today".

export type TestStreakSettings = {
  /** Days in the streak, 0 to 300 */
  current: number;
  /** A lesson finished today */
  litToday: boolean;
  /** Yesterday was missed, so the streak ended the day before (and can be revived) */
  missedYesterday: boolean;
  /** Revives already spent, 0 to 2 */
  revivesUsed: number;
  /** Scattered activity in the months before, for the calendar */
  history: boolean;
};

export const TEST_STREAK_MAX = 300;

/** Repeatable "random": the same history every time */
const noise = (n: number) => (n * 7919 + 13) % 31;

export function testStreakDays(
  settings: TestStreakSettings,
  today: string,
): StreakDay[] {
  const current = Math.max(0, Math.min(TEST_STREAK_MAX, settings.current));
  const byDate = new Map<string, StreakDay>();
  const add = (date: string, lessons: number, revived = false) =>
    byDate.set(
      date,
      revived ? { date, lessons: 0, revived } : { date, lessons },
    );

  // The streak: through today if lit, or through yesterday. With yesterday
  // missed, it ended the day before, and today stands alone if lit.
  const end = settings.missedYesterday
    ? addDays(today, -2)
    : settings.litToday
      ? today
      : addDays(today, -1);
  for (let i = 0; i < current; i++) add(addDays(end, -i), 1 + (i % 3));
  if (settings.missedYesterday && settings.litToday) add(today, 1);

  // Spent revives: each a missed day revived after a day that counts. Inside
  // a long streak the day is simply marked revived.
  const used = Math.max(0, Math.min(STREAK_REVIVES, settings.revivesUsed));
  for (let k = 0; k < used; k++) {
    const day = addDays(today, -(60 + 4 * k));
    if (!byDate.has(addDays(day, -1))) add(addDays(day, -1), 1);
    add(day, 0, true);
  }

  // History: about half the days in the 150 before the streak
  if (settings.history) {
    const start = addDays(end, -current - 1);
    for (let ago = 1; ago <= 150; ago++) {
      const date = addDays(start, -ago);
      if (byDate.has(date) || ago % 7 === 3 || noise(ago) % 10 >= 5) continue;
      add(date, 1 + (noise(ago) % 3));
    }
  }

  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

type DayState = Pick<Streak, "current" | "litToday" | "revivesLeft" | "revive">;

const streakOf = (days: number) => `${days}-day streak`;

/** What midnight will do to the streak, for the panel to say before moving on */
export function nextDayOutlook(streak: DayState): string {
  const { current, litToday, revivesLeft, revive } = streak;
  if (revive) {
    return `Yesterday was missed, so your ${streakOf(revive.ended)} ended. Revive it before you move on, or it's lost for good.`;
  }
  if (current === 0) return "No streak yet. Finish a lesson to start one.";
  if (litToday) {
    return `Today is lit, so your ${streakOf(current)} carries on tomorrow.`;
  }
  return revivesLeft > 0
    ? `Today isn't lit. Move on now and your ${streakOf(current)} ends at midnight. You can spend a revive tomorrow to save it.`
    : `Today isn't lit. Move on now and your ${streakOf(current)} ends at midnight, with no revives left to save it.`;
}

/** What midnight did, from the streak before and after moving on a day */
export function newDayNews(before: DayState, after: DayState): string {
  if (before.revive) {
    return `The ${streakOf(before.revive.ended)} wasn't revived, so it's lost for good.`;
  }
  if (before.current > 0 && after.current === 0) {
    return after.revive
      ? `A day passed without a lesson, so your ${streakOf(before.current)} ended. Revive it today, or it's gone tomorrow.`
      : `A day passed without a lesson, so your ${streakOf(before.current)} ended.`;
  }
  return after.current > 0
    ? `A new day. Your ${streakOf(after.current)} needs today's lesson.`
    : "A new day. No streak yet.";
}
