// Streaks (ODY-918): the day maths and the icon choice, shared by the server
// and the streak UI (ODY-919). Days are calendar dates in the learner's own
// time zone, written YYYY-MM-DD, so daylight saving never moves a day.
// Design: the Streak Hoard spec, https://claude.ai/artifact/QhwUbwvrLSJ4wbxD7VNKHp

/** The day each of the 24 streak icons unlocks, in order (the Streak Hoard spec) */
export const UNLOCK_DAYS = [
  1, 2, 3, 4, 5, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38,
  40, 50, 100,
] as const;

/**
 * The icon for a streak of `days`: its index in UNLOCK_DAYS (0 to 23), or
 * null with no streak. Each icon shows until the next unlocks, and the last
 * one stays from day 100 on.
 */
export function streakIconIndex(days: number): number | null {
  if (!(days >= 1)) return null;
  return UNLOCK_DAYS.filter((day) => day <= days).length - 1;
}

/** For learners who haven't picked a time zone in Settings */
export const DEFAULT_STREAK_TIME_ZONE = "America/New_York";

/**
 * The time zone to count a learner's days in: theirs from Settings, or
 * Boston's when it's missing or unknown. Saved values can carry trailing
 * spaces from the old enum.
 */
export function streakTimeZone(zone?: string | null): string {
  const trimmed = zone?.trim();
  if (!trimmed) return DEFAULT_STREAK_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return trimmed;
  } catch {
    return DEFAULT_STREAK_TIME_ZONE;
  }
}

/** The calendar date at `now` in `timeZone`, as YYYY-MM-DD */
export function localDate(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** `date` moved by `days` calendar days */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** A day the learner finished at least one new lesson */
export type StreakDay = { date: string; lessons: number };

export type StreakSummary = {
  /** Days in the current streak: 0 once it has broken */
  current: number;
  longest: number;
  /** Whether a lesson was finished today. Until then the streak runs to yesterday and is still alive. */
  litToday: boolean;
  /** The first day of the current streak, or null with none */
  startedOn: string | null;
};

/** A learner's streak and the days behind it, as getMyStreak returns it */
export type Streak = StreakSummary & {
  /** The learner's date today, in their time zone */
  today: string;
  /** Every day with a finished lesson, oldest first */
  days: StreakDay[];
};

/**
 * The current and longest streak from the dates a learner finished a new
 * lesson, on `today`. A streak breaks only when a whole day passes without
 * one. A date after today (saved in a time zone further east before the
 * learner changed theirs) counts as today.
 */
export function summarizeStreak(dates: string[], today: string): StreakSummary {
  const active = new Set(dates.map((date) => (date > today ? today : date)));
  const runFrom = (end: string) => {
    let start = end;
    while (active.has(addDays(start, -1))) start = addDays(start, -1);
    return start;
  };
  const length = (start: string, end: string) =>
    Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;

  let longest = 0;
  for (const date of active) {
    // Only count from the last day of each run
    if (active.has(addDays(date, 1))) continue;
    longest = Math.max(longest, length(runFrom(date), date));
  }

  const litToday = active.has(today);
  const end = litToday
    ? today
    : active.has(addDays(today, -1))
      ? addDays(today, -1)
      : null;
  if (!end) return { current: 0, longest, litToday, startedOn: null };
  const startedOn = runFrom(end);
  return { current: length(startedOn, end), longest, litToday, startedOn };
}
