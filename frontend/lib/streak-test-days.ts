import { addDays, STREAK_REVIVES, type StreakDay } from "@/lib/streaks";

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
