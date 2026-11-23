import {
  iconsFor,
  litMessage,
  panelMessage,
  pendingMessage,
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
    [
      1,
      "Day 1 · new treasure!",
      "Streak started. Your treasure grows again on day 2.",
    ],
    [
      24,
      "Day 24 · new treasure!",
      "Streak kept. Your treasure grows again on day 26.",
    ],
    [23, "Day 23 · streak kept", "Your treasure grows again on day 24."],
    [
      100,
      "Day 100 · new treasure!",
      "Streak kept. This is the final treasure. It stays for as long as your streak does.",
    ],
    [
      140,
      "Day 140 · streak kept",
      "This is the final treasure. It stays for as long as your streak does.",
    ],
  ])("day %i", (current, title, detail) => {
    expect(litMessage(current)).toEqual({ title, detail });
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
