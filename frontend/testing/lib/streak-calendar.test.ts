import {
  monthLabel,
  monthOf,
  shiftMonth,
  weeksOf,
} from "@/lib/streak-calendar";

it.each([
  ["2026-11", -1, "2026-10"],
  ["2026-01", -1, "2025-12"],
  ["2026-12", 1, "2027-01"],
  ["2026-11", -14, "2025-09"],
])("%s moved %i months is %s", (month, by, expected) => {
  expect(shiftMonth(month, by)).toBe(expected);
});

it("reads the month of a date and names it", () => {
  expect(monthOf("2026-11-10")).toBe("2026-11");
  expect(monthLabel("2026-11")).toBe("November 2026");
});

describe("weeksOf", () => {
  it("starts weeks on Sunday and pads the first and last", () => {
    // 1 Oct 2026 is a Thursday; 31 Oct a Saturday
    const weeks = weeksOf("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
    expect(weeks[4].at(-1)).toBe("2026-10-31");
  });

  it.each([
    ["2026-11", 30, 5],
    ["2028-02", 29, 5],
    ["2026-02", 28, 4],
    ["2026-08", 31, 6],
  ])("%s has %i days in %i weeks", (month, days, rows) => {
    const weeks = weeksOf(month);
    expect(weeks).toHaveLength(rows);
    expect(weeks.flat().filter(Boolean)).toHaveLength(days);
    weeks.forEach((week) => expect(week).toHaveLength(7));
  });
});
