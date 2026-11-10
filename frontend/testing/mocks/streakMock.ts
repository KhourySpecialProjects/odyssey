import { addDays, summarizeStreak, type Streak } from "@/lib/streaks";

export const STREAK_TODAY = "2026-11-10";

/**
 * A learner's streak on STREAK_TODAY: a run of `current` days through today
 * (or through yesterday, not lit yet), plus any `past` dates, one lesson each.
 */
export function makeStreak({
  current = 23,
  litToday = false,
  past = [] as string[],
} = {}): Streak {
  const end = litToday ? STREAK_TODAY : addDays(STREAK_TODAY, -1);
  const run = Array.from({ length: current }, (_, i) => addDays(end, -i));
  const dates = [...new Set([...past, ...run])].sort();
  return {
    ...summarizeStreak(dates, STREAK_TODAY),
    today: STREAK_TODAY,
    days: dates.map((date) => ({ date, lessons: 1 })),
  };
}

/** 31 days ending 2026-10-12: an older, longer streak */
export const LONG_PAST_RUN = Array.from({ length: 31 }, (_, i) =>
  addDays("2026-10-12", -i),
);
