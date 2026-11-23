import {
  addDays,
  reviveOffer,
  STREAK_REVIVES,
  summarizeStreak,
  type Streak,
} from "@/lib/streaks";

export const STREAK_TODAY = "2026-11-10";

/**
 * A learner's streak on STREAK_TODAY, worked out as getStreakFor does: a
 * run of `current` days through today (or through yesterday, not lit yet),
 * plus any `past` dates with a lesson each and `revived` dates.
 */
export function makeStreak({
  current = 23,
  litToday = false,
  past = [] as string[],
  revived = [] as string[],
} = {}): Streak {
  const end = litToday ? STREAK_TODAY : addDays(STREAK_TODAY, -1);
  const run = Array.from({ length: current }, (_, i) => addDays(end, -i));
  const lessonDays = new Set([...past, ...run]);
  const dates = [...new Set([...lessonDays, ...revived])].sort();
  const revivesLeft = Math.max(0, STREAK_REVIVES - revived.length);
  return {
    ...summarizeStreak(dates, STREAK_TODAY),
    today: STREAK_TODAY,
    days: dates.map((date) =>
      lessonDays.has(date)
        ? { date, lessons: 1 }
        : { date, lessons: 0, revived: true },
    ),
    revivesLeft,
    revive: reviveOffer(dates, STREAK_TODAY, revivesLeft),
  };
}

/** 31 days ending 2026-10-12: an older, longer streak */
export const LONG_PAST_RUN = Array.from({ length: 31 }, (_, i) =>
  addDays("2026-10-12", -i),
);

/** 24 days through 2026-11-08: a streak that missed yesterday, 9 Nov */
export const MISSED_YESTERDAY = Array.from({ length: 24 }, (_, i) =>
  addDays("2026-11-08", -i),
);
