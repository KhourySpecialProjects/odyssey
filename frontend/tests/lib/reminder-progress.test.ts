import { DateTime } from "luxon";
import {
  dueChipText,
  earliestDue,
  reminderHeadline,
  reminderProgress,
  reminderTemplate,
  type ReminderTemplateState,
} from "@/lib/reminder-progress";

const lessons = [3, 1, 2].map((n) => ({
  id: n * 10,
  name: `L${n}`,
  slug: `l${n}`,
  orderIndex: n,
}));

describe("reminderProgress", () => {
  it.each([
    ["nothing viewed", [], 0, "L1", false],
    ["out-of-order views: next is the earliest gap", [30, 10], 2, "L2", true],
    ["ignores viewed lessons from other droplets", [99, 10], 1, "L2", true],
    ["all viewed: no next lesson", [10, 20, 30], 3, undefined, true],
  ])("%s", (_, viewed, count, next, started) => {
    const r = reminderProgress(lessons, viewed);
    expect(r.progress).toEqual({ viewed: count, total: 3 });
    expect(r.nextLesson?.name).toBe(next);
    expect(r.started).toBe(started);
  });

  it("has no progress for a droplet with no lessons", () => {
    expect(reminderProgress([], [10])).toEqual({
      progress: null,
      nextLesson: null,
      started: false,
    });
  });
});

describe("reminderHeadline", () => {
  const state = (
    over: Partial<ReminderTemplateState> = {},
  ): ReminderTemplateState => ({
    progress: { viewed: 1, total: 4 },
    started: true,
    dueInDays: null,
    idleDays: 5,
    enrollmentAgeDays: 10,
    today: "2026-11-20", // a Friday
    ...over,
  });
  const none = { progress: { viewed: 0, total: 4 }, started: false };
  const fallback = "Pick up Git where you left off.";

  it.each([
    [
      "due today, started",
      { dueInDays: 0 },
      "Git is due today. You've already started, so keep going!",
    ],
    [
      "due tomorrow, one left: due soon wins",
      { dueInDays: 1, progress: { viewed: 3, total: 4 } },
      "Git is due tomorrow. You've already started, so keep going!",
    ],
    [
      "due in 3 days, not started: a weekday",
      { ...none, dueInDays: 3 },
      "Git is due Monday. Lesson 1 is a good place to start.",
    ],
    [
      "not started, 4 days",
      { ...none, enrollmentAgeDays: 4 },
      "You enrolled in Git a few days ago. Ready when you are!",
    ],
    [
      "not started, 7 days",
      { ...none, enrollmentAgeDays: 7 },
      "You enrolled in Git last week. Ready when you are!",
    ],
    [
      "not started, 13 days",
      { ...none, enrollmentAgeDays: 13 },
      "You enrolled in Git last week. Ready when you are!",
    ],
    [
      "not started, 20 days",
      { ...none, enrollmentAgeDays: 20 },
      "You enrolled in Git 2 weeks ago. Ready when you are!",
    ],
    [
      "one-lesson droplet, not started: not one left",
      { progress: { viewed: 0, total: 1 }, started: false },
      "You enrolled in Git last week. Ready when you are!",
    ],
    [
      "one left beats a long gap",
      { progress: { viewed: 3, total: 4 }, idleDays: 30 },
      "You're one lesson away from finishing Git!",
    ],
    [
      "long gap beats halfway",
      { progress: { viewed: 2, total: 4 }, idleDays: 21 },
      "Welcome back! Pick up Git where you left off.",
    ],
    [
      "exactly 0.5 is halfway",
      { progress: { viewed: 2, total: 4 } },
      "You're over halfway through Git. Keep it going!",
    ],
    ["fallback", {}, fallback],
    ["no progress", { progress: null }, fallback],
    ["due in 4 days is not due soon", { dueInDays: 4 }, fallback],
  ] as [string, Partial<ReminderTemplateState>, string][])(
    "%s",
    (_, over, text) => {
      expect(reminderHeadline("Git", state(over))).toBe(text);
    },
  );

  it("names the template", () => {
    expect(reminderTemplate(state({ dueInDays: 2 }))).toBe("due_soon_started");
    expect(reminderTemplate(state())).toBe("fallback");
  });
});

describe("earliestDue", () => {
  it("picks the earliest row and its group", () => {
    const rows = [
      { dueDate: "2026-11-20", group: { groupName: "B" } },
      { dueDate: "2026-11-14", group: { groupName: "A" } },
    ];
    expect(earliestDue(rows)).toEqual({
      dueDate: "2026-11-14",
      dueGroupName: "A",
    });
    expect(earliestDue([])).toBeNull();
  });

  it("ignores null due dates from cleared groups", () => {
    const real = { dueDate: "2026-11-14", group: { groupName: "A" } };
    const cleared = { dueDate: null, group: { groupName: "B" } };
    expect(
      earliestDue([cleared, { ...real, dueDate: "2026-11-20" }, real]),
    ).toEqual({ dueDate: "2026-11-14", dueGroupName: "A" });
    expect(earliestDue([cleared, cleared])).toBeNull();
  });
});

describe("dueChipText", () => {
  // Thursday 12 Nov 2026, local noon
  const now = DateTime.fromISO("2026-11-12T12:00:00", {
    zone: "America/New_York",
  });
  it.each([
    ["2026-11-12", "Due today · CS 101"],
    ["2026-11-13", "Due tomorrow · CS 101"],
    ["2026-11-15", "Due Sun · CS 101"],
    ["2026-11-16", null],
    ["2026-11-11", "One Day Late! · CS 101"],
    ["2026-11-09", "3 Days Late! · CS 101"],
  ])("%s", (date, text) => {
    expect(dueChipText(date, "CS 101", now)).toBe(text);
  });

  it("omits the group when there is none", () => {
    expect(dueChipText("2026-11-12", undefined, now)).toBe("Due today");
  });
});
