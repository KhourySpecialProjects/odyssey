import { DateTime } from "luxon";
import {
  dueChipText,
  earliestDue,
  reminderHeadline,
  reminderProgress,
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
  it.each([
    [{ viewed: 2, total: 3 }, "You're one lesson away from finishing Git!"],
    [{ viewed: 1, total: 3 }, "Pick up Git where you left off."],
    [{ viewed: 3, total: 3 }, "Pick up Git where you left off."],
    [null, "Pick up Git where you left off."],
  ])("%j", (progress, text) => {
    expect(reminderHeadline("Git", progress)).toBe(text);
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
