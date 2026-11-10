import {
  newDayNews,
  nextDayOutlook,
  testStreakDays,
} from "@/lib/streak-test-days";
import { addDays, reviveOffer, summarizeStreak } from "@/lib/streaks";

const TODAY = "2026-11-10";
const settings = {
  current: 24,
  litToday: false,
  missedYesterday: false,
  revivesUsed: 0,
  history: false,
};
const streakOf = (overrides: Partial<typeof settings>) => {
  const days = testStreakDays({ ...settings, ...overrides }, TODAY);
  const dates = days.map((d) => d.date);
  const revived = days.filter((d) => d.revived).length;
  return {
    days,
    ...summarizeStreak(dates, TODAY),
    revive: reviveOffer(dates, TODAY, 2 - revived),
  };
};

describe("testStreakDays", () => {
  it.each([
    [{ current: 24 }, 24, false],
    [{ current: 24, litToday: true }, 24, true],
    [{ current: 0 }, 0, false],
    [{ current: 999 }, 300, false],
  ])("%p is a %i-day streak, lit %s", (overrides, current, litToday) => {
    expect(streakOf(overrides)).toMatchObject({ current, litToday });
  });

  it.each([
    [false, 0],
    [true, 1],
  ])(
    "breaks the streak when yesterday is missed (lit today %s), so it can be revived",
    (litToday, current) => {
      const streak = streakOf({ missedYesterday: true, litToday });

      expect(streak.current).toBe(current);
      expect(streak.revive).toEqual({
        date: "2026-11-09",
        ended: 24,
        restored: 25 + current,
      });
    },
  );

  it.each([1, 2])("spends %i revives without changing the streak", (used) => {
    const streak = streakOf({ revivesUsed: used });

    expect(streak.days.filter((d) => d.revived)).toHaveLength(used);
    expect(streak.current).toBe(24);
  });

  it("marks a revive inside a long streak instead of adding days", () => {
    const streak = streakOf({ current: 100, revivesUsed: 1 });

    expect(streak.current).toBe(100);
    expect(streak.days).toHaveLength(100);
    expect(streak.days.find((d) => d.revived)?.date).toBe("2026-09-11");
  });

  it("adds the same history before the streak every time", () => {
    const first = streakOf({ history: true }).days;

    expect(first.length).toBeGreaterThan(40);
    expect(first.length).toBeLessThan(24 + 151);
    expect(streakOf({ history: true }).days).toEqual(first);
    expect(streakOf({ history: true }).current).toBe(24);
  });
});

describe("day by day", () => {
  // A 5-day streak through TODAY, read on a later day with nothing added
  const dates = [0, 1, 2, 3, 4].map((ago) => addDays(TODAY, -ago));
  const onDay = (after: number, revivesLeft = 2) => {
    const today = addDays(TODAY, after);
    return {
      ...summarizeStreak(dates, today),
      revivesLeft,
      revive: reviveOffer(dates, today, revivesLeft),
    };
  };

  it("passes days as midnight does: unlit, then ended, then lost", () => {
    const days = [0, 1, 2, 3].map((after) => onDay(after));

    expect(days.map(nextDayOutlook)).toEqual([
      "Today is lit, so your 5-day streak carries on tomorrow.",
      "Today isn't lit. Move on now and your 5-day streak ends at midnight. You can spend a revive tomorrow to save it.",
      "Yesterday was missed, so your 5-day streak ended. Revive it before you move on, or it's lost for good.",
      "No streak yet. Finish a lesson to start one.",
    ]);
    expect(days.slice(1).map((day, i) => newDayNews(days[i], day))).toEqual([
      "A new day. Your 5-day streak needs today's lesson.",
      "A day passed without a lesson, so your 5-day streak ended. Revive it today, or it's gone tomorrow.",
      "The 5-day streak wasn't revived, so it's lost for good.",
    ]);
  });

  it("says when no revive is left to save it", () => {
    expect(nextDayOutlook(onDay(1, 0))).toBe(
      "Today isn't lit. Move on now and your 5-day streak ends at midnight, with no revives left to save it.",
    );
    expect(newDayNews(onDay(1, 0), onDay(2, 0))).toBe(
      "A day passed without a lesson, so your 5-day streak ended.",
    );
  });
});
