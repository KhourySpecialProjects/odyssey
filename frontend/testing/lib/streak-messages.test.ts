import {
  iconsFor,
  litMessage,
  panelMessage,
  pendingMessage,
  progressText,
  progressToNext,
  reviveOfferMessage,
  revivedMessage,
  revivesLeftText,
  shortDate,
  streakLabel,
  unlockedMessage,
} from "@/lib/streak-messages";

describe("iconsFor", () => {
  it.each([
    [0, null, "One Coin"],
    [1, "One Coin", "Two Coins"],
    [7, "Coin Pile", "Big Pile"],
    [99, "Crowned Chest", "Super Duper Mega Golden Crowned Diamond Chest"],
    [300, "Super Duper Mega Golden Crowned Diamond Chest", null],
  ])("a %i-day streak shows %s, then %s", (days, icon, next) => {
    const icons = iconsFor(days);
    expect(icons.icon?.name ?? null).toBe(icon);
    expect(icons.next?.name ?? null).toBe(next);
  });
});

it.each([
  [22, "22-day streak, Tied Sack"],
  [0, "No streak yet"],
])("labels a %i-day streak %p", (days, label) => {
  expect(streakLabel(days)).toBe(label);
});

it("writes a date the same in every browser time zone", () => {
  expect(shortDate("2026-10-17")).toBe("Oct 17");
});

describe("litMessage", () => {
  it.each([
    [1, "Streak started!", "Come back tomorrow to make it 2 days."],
    [
      6,
      "Day 6, and counting!",
      "Come back tomorrow for day 7. 2 more days to the Big Pile.",
    ],
    [7, "Day 7 · A whole week!", "Come back tomorrow to keep it going."],
    [
      9,
      "Day 9, and counting!",
      "Come back tomorrow for day 10. 1 more day to the Gold Heap.",
    ],
    [
      24,
      "Day 24 · You earned the Spilling Sack!",
      "Come back tomorrow for day 25.",
    ],
    [
      30,
      "Day 30 · A whole month! You earned the Sack Hoard.",
      "Come back tomorrow to keep it going.",
    ],
    [
      100,
      "Day 100 · The final treasure is yours!",
      "It stays for as long as your streak does.",
    ],
    [
      120,
      "Day 120, and counting!",
      "Your final treasure stays for as long as your streak does.",
    ],
  ])("day %i", (current, title, detail) => {
    expect(litMessage(current)).toEqual({ title, detail });
  });
});

describe("progressToNext", () => {
  it.each([
    [7, 2, 3, "Big Pile", "2 of 3 days to the Big Pile"],
    [8, 0, 2, "Gold Heap", "2 days to the Gold Heap"],
    [99, 49, 50, "Super Duper Mega Golden Crowned Diamond Chest", null],
    [100, null, null, null, null],
    [0, null, null, null, null],
  ])("day %i", (current, done, span, next, text) => {
    const progress = progressToNext(current);
    expect(
      progress && [progress.done, progress.span, progress.next.name],
    ).toEqual(done === null ? null : [done, span, next]);
    if (progress && text) expect(progressText(progress)).toBe(text);
  });
});

describe("pendingMessage", () => {
  it.each([
    [
      0,
      false,
      "Finish this lesson to start a streak",
      "Day 1 unlocks One Coin.",
    ],
    [
      23,
      false,
      "Finish this lesson to keep your streak",
      "Day 24 unlocks Spilling Sack.",
    ],
    [
      24,
      true,
      "Finish a new lesson to keep your streak",
      "It'll be day 25. Your treasure grows on day 26.",
    ],
    [150, false, "Finish this lesson to keep your streak", "It'll be day 151."],
  ])("a %i-day streak, lesson done %s", (current, done, title, detail) => {
    expect(pendingMessage({ current }, done)).toEqual({ title, detail });
  });
});

describe("panelMessage", () => {
  it.each([
    [0, false, "Finish a lesson to start a streak."],
    [23, false, "Finish a lesson to make it 24 days."],
    [
      23,
      true,
      "Spilling Sack in 1 day. Finish a lesson each day to get there.",
    ],
    [
      40,
      true,
      "Crowned Chest in 10 days. Finish a lesson each day to get there.",
    ],
    [100, true, "This is the final icon. It stays for as long as your streak."],
  ])("a %i-day streak, lit %s", (current, litToday, text) => {
    expect(panelMessage({ current, litToday })).toBe(text);
  });
});

it.each([
  [
    22,
    "Next up: Spilling Sack on day 24. Finish a lesson each day to keep it going.",
  ],
  [100, "This is the final icon. It stays for as long as your streak does."],
])("the feed card for day %i", (current, text) => {
  expect(unlockedMessage(current)).toBe(text);
});

it.each([
  [2, "2 revives left"],
  [1, "1 revive left"],
  [0, "No revives left"],
])("%i revives reads %p", (left, text) => {
  expect(revivesLeftText(left)).toBe(text);
});

it.each([
  [2, "You have 2 revives left."],
  [1, "You have 1 revive left."],
])("offers the revive with what it restores and %i left", (left, count) => {
  expect(
    reviveOfferMessage({ date: "2026-11-09", ended: 24, restored: 25 }, left),
  ).toEqual({
    title: "Your 24-day streak ended yesterday.",
    detail: `Revive it to keep it going: it'll be 25 days. ${count}`,
  });
});

it("says the streak is back once revived", () => {
  expect(revivedMessage({ current: 25, revivesLeft: 1 })).toEqual({
    title: "Streak revived",
    detail: "It's a 25-day streak again. 1 revive left.",
  });
});
