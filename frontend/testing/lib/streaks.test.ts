import fs from "node:fs";
import path from "node:path";
import {
  addDays,
  DEFAULT_STREAK_TIME_ZONE,
  localDate,
  STREAK_ICONS,
  streakIconIndex,
  streakIconSrc,
  streakTimeZone,
  summarizeStreak,
  UNLOCK_DAYS,
} from "@/lib/streaks";

describe("streakIconIndex", () => {
  it.each([
    [0, null],
    [-3, null],
    [Number.NaN, null],
    [1, 0],
    [5, 4],
    [7, 4],
    [8, 5],
    [10, 6],
    [21, 11],
    [40, 21],
    [49, 21],
    [50, 22],
    [99, 22],
    [100, 23],
    [300, 23],
  ])("a %s-day streak shows icon %s", (days, index) => {
    expect(streakIconIndex(days)).toBe(index);
  });

  it("unlocks 24 icons, each on its own day", () => {
    expect(UNLOCK_DAYS).toHaveLength(24);
    UNLOCK_DAYS.forEach((day, i) => expect(streakIconIndex(day)).toBe(i));
  });

  it("has art in public/ for every icon", () => {
    const missing = STREAK_ICONS.filter(
      (icon) =>
        !fs.existsSync(path.join(process.cwd(), "public", streakIconSrc(icon))),
    );
    expect(missing).toEqual([]);
  });
});

describe("streakTimeZone", () => {
  it.each([
    ["America/Chicago", "America/Chicago"],
    ["America/Los_Angeles  ", "America/Los_Angeles"],
    [undefined, DEFAULT_STREAK_TIME_ZONE],
    [null, DEFAULT_STREAK_TIME_ZONE],
    ["  ", DEFAULT_STREAK_TIME_ZONE],
    ["Mars/Olympus_Mons", DEFAULT_STREAK_TIME_ZONE],
  ])("%p counts days in %s", (zone, expected) => {
    expect(streakTimeZone(zone)).toBe(expected);
  });
});

describe("localDate", () => {
  it.each([
    // 03:59 UTC is still the evening before in Boston (EDT, UTC-4)
    ["2026-06-02T03:59:00Z", "America/New_York", "2026-06-01"],
    ["2026-06-02T04:00:00Z", "America/New_York", "2026-06-02"],
    // In winter Boston is UTC-5, so the same clock time is a day earlier
    ["2026-12-02T04:30:00Z", "America/New_York", "2026-12-01"],
    ["2026-12-02T05:00:00Z", "America/New_York", "2026-12-02"],
    // The night clocks go back (1 Nov 2026) is still one day
    ["2026-11-01T05:30:00Z", "America/New_York", "2026-11-01"],
    ["2026-11-02T04:59:00Z", "America/New_York", "2026-11-01"],
    ["2026-06-01T23:30:00Z", "Asia/Tokyo", "2026-06-02"],
    ["2026-06-02T09:30:00Z", "Pacific/Honolulu", "2026-06-01"],
  ])("%s in %s is %s", (iso, zone, date) => {
    expect(localDate(new Date(iso), zone)).toBe(date);
  });
});

describe("addDays", () => {
  it.each([
    ["2026-11-10", 1, "2026-11-11"],
    ["2026-11-30", 1, "2026-12-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-03-01", -1, "2028-02-29"],
    ["2026-03-08", 1, "2026-03-09"],
  ])("%s plus %i is %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});

describe("summarizeStreak", () => {
  const today = "2026-11-10";
  const run = (end: string, length: number) =>
    Array.from({ length }, (_, i) => addDays(end, -i));

  it.each([
    {
      name: "no days",
      dates: [],
      expected: { current: 0, longest: 0, litToday: false, startedOn: null },
    },
    {
      name: "only today",
      dates: [today],
      expected: { current: 1, longest: 1, litToday: true, startedOn: today },
    },
    {
      name: "a streak through today",
      dates: run(today, 24),
      expected: {
        current: 24,
        longest: 24,
        litToday: true,
        startedOn: "2026-10-18",
      },
    },
    {
      name: "a streak through yesterday, still alive",
      dates: run("2026-11-09", 3),
      expected: {
        current: 3,
        longest: 3,
        litToday: false,
        startedOn: "2026-11-07",
      },
    },
    {
      name: "a streak that ended two days ago",
      dates: run("2026-11-08", 5),
      expected: { current: 0, longest: 5, litToday: false, startedOn: null },
    },
    {
      name: "a longer streak in the past",
      dates: [...run("2026-10-20", 31), ...run(today, 2)],
      expected: {
        current: 2,
        longest: 31,
        litToday: true,
        startedOn: "2026-11-09",
      },
    },
    {
      name: "unsorted, repeated dates",
      dates: [today, "2026-11-08", today, "2026-11-09"],
      expected: {
        current: 3,
        longest: 3,
        litToday: true,
        startedOn: "2026-11-08",
      },
    },
    {
      name: "a date after today, saved further east",
      dates: ["2026-11-09", "2026-11-11"],
      expected: {
        current: 2,
        longest: 2,
        litToday: true,
        startedOn: "2026-11-09",
      },
    },
    {
      name: "a streak across a month and a year",
      dates: run("2027-01-02", 5),
      today: "2027-01-02",
      expected: {
        current: 5,
        longest: 5,
        litToday: true,
        startedOn: "2026-12-29",
      },
    },
  ])("$name", ({ dates, expected, ...rest }) => {
    expect(summarizeStreak(dates, rest.today ?? today)).toEqual(expected);
  });
});
