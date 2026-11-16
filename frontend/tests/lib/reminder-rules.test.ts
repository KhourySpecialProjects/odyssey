import {
  alreadyRaisedToday,
  dayStartUtc,
  daysBetween,
  effectiveCount,
  evaluateCandidate,
  isSnoozeChoice,
  pickReminder,
  REMINDER_RULES,
  snoozeDateLabel,
  type ReminderCandidate,
} from "@/lib/reminder-rules";

const TZ = "America/New_York";
// Friday 20 Nov 2026, noon Boston
const NOW = new Date("2026-11-20T17:00:00Z");
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();

const make = (over: Partial<ReminderCandidate> = {}): ReminderCandidate => ({
  enrollmentId: 1,
  dropletId: 10,
  dropletName: "Git",
  enrolledAt: daysAgo(30),
  lastProgressAt: daysAgo(4),
  isArchived: false,
  droplet: { status: "published", isHidden: false, lessonIds: [1, 2, 3, 4] },
  viewedLessonIds: [1],
  dueDate: null,
  reminder: null,
  ...over,
});

const future = (n: number) =>
  new Date(NOW.getTime() + n * 86_400_000).toISOString();

const reminder = (over: object = {}) => ({
  lastRaisedAt: daysAgo(10),
  count: 1,
  snoozedUntil: null,
  mutedUntil: null,
  ...over,
});

const evalOf = (c: ReminderCandidate, now = NOW, tz: string = TZ) =>
  evaluateCandidate(c, now, tz);
const reason = (c: ReminderCandidate) => {
  const d = evalOf(c);
  return d.eligible ? "eligible" : d.reason;
};

describe("daysBetween / dayStartUtc / effectiveCount", () => {
  it("counts calendar days", () => {
    expect(daysBetween("2026-11-16", "2026-11-20")).toBe(4);
    expect(daysBetween("2026-03-07", "2026-03-09")).toBe(2);
  });

  it("finds the learner's local midnight in UTC", () => {
    expect(dayStartUtc(NOW, TZ).toISOString()).toBe("2026-11-20T05:00:00.000Z");
    expect(dayStartUtc(NOW, "America/Los_Angeles").toISOString()).toBe(
      "2026-11-20T08:00:00.000Z",
    );
    expect(dayStartUtc(NOW, "Nope/Zone").toISOString()).toBe(
      "2026-11-20T05:00:00.000Z",
    );
  });

  it("lands on local midnight when a zone's day starts at 01:00 after spring forward", () => {
    // Santiago springs forward at 00:00 on 2026-09-06, so that day starts at 01:00
    const now = new Date("2026-09-06T15:00:00Z");
    const tz = "America/Santiago";
    expect(dayStartUtc(now, tz, 3).toISOString()).toBe(
      "2026-09-09T03:00:00.000Z",
    );
  });

  it("resets the count on progress after the last raise", () => {
    const r = { count: 2, lastRaisedAt: daysAgo(10), mutedUntil: null };
    expect(effectiveCount(r, daysAgo(12), NOW)).toBe(2);
    expect(effectiveCount(r, daysAgo(5), NOW)).toBe(0);
    expect(
      effectiveCount(
        { count: null, lastRaisedAt: null, mutedUntil: null },
        null,
        NOW,
      ),
    ).toBe(0);
    expect(effectiveCount(null, null, NOW)).toBe(0);
  });

  it("resets the count once a mute that began after the last raise has ended", () => {
    const r = { count: 2, lastRaisedAt: daysAgo(10) };
    expect(effectiveCount({ ...r, mutedUntil: daysAgo(1) }, null, NOW)).toBe(0);
    expect(effectiveCount({ ...r, mutedUntil: future(1) }, null, NOW)).toBe(2);
    expect(effectiveCount({ ...r, mutedUntil: daysAgo(10) }, null, NOW)).toBe(
      2,
    );
  });
});

describe("skip reasons", () => {
  it.each([
    ["no_droplet", { droplet: null }],
    [
      "unpublished",
      { droplet: { status: "draft", isHidden: false, lessonIds: [1, 2] } },
    ],
    [
      "hidden",
      { droplet: { status: "published", isHidden: true, lessonIds: [1, 2] } },
    ],
    ["archived", { isArchived: true }],
    [
      "no_lessons",
      { droplet: { status: "published", isHidden: false, lessonIds: [] } },
    ],
    ["complete", { viewedLessonIds: [1, 2, 3, 4, 99] }],
    ["muted", { reminder: reminder({ mutedUntil: future(5) }) }],
    [
      "snoozed",
      {
        reminder: reminder({
          snoozedUntil: new Date(NOW.getTime() + 3_600_000).toISOString(),
        }),
      },
    ],
    ["stale", { lastProgressAt: daysAgo(61) }],
    [
      "enrolled_today",
      {
        enrolledAt: daysAgo(0),
        lastProgressAt: null,
        viewedLessonIds: [],
        dueDate: "2026-11-21",
      },
    ],
    ["too_soon", { lastProgressAt: daysAgo(3) }],
    ["gap", { reminder: reminder({ lastRaisedAt: daysAgo(6) }) }],
    [
      "stopped",
      {
        reminder: reminder({ count: 3 }),
        lastProgressAt: daysAgo(20),
      },
    ],
  ] as [string, Partial<ReminderCandidate>][])("%s", (expected, over) => {
    expect(reason(make(over))).toBe(expected);
  });

  it("is eligible with a snooze in the past and no other skip", () => {
    const c = make({
      reminder: reminder({ snoozedUntil: daysAgo(1) }),
      lastProgressAt: daysAgo(20),
    });
    expect(reason(c)).toBe("eligible");
  });

  it("muted beats the skips after it, even with progress after the last raise", () => {
    const c = make({
      lastProgressAt: daysAgo(1),
      reminder: reminder({ mutedUntil: future(5), lastRaisedAt: daysAgo(3) }),
    });
    expect(reason(c)).toBe("muted");
  });

  it("completion uses current lessons, not isComplete", () => {
    expect(reason(make({ viewedLessonIds: [1, 2, 3] }))).toBe("eligible");
    expect(reason(make({ viewedLessonIds: [1, 2, 3, 4] }))).toBe("complete");
  });
});

describe("mute ended", () => {
  const unmuted = (over: Partial<ReminderCandidate> = {}, r: object = {}) =>
    make({
      lastProgressAt: daysAgo(40),
      reminder: reminder({
        lastRaisedAt: daysAgo(35),
        mutedUntil: daysAgo(1),
        count: 3,
        ...r,
      }),
      ...over,
    });

  it.each([
    ["a fresh count, not stopped", {}],
    ["an old snooze on the row too", { snoozedUntil: daysAgo(20) }],
  ])("is eligible as a normal raise with %s", (_label, r) => {
    expect(evalOf(unmuted({}, r))).toMatchObject({
      eligible: true,
      snoozeEnded: false,
      count: 1,
    });
  });

  it("still applies the stale rule", () => {
    expect(reason(unmuted({ lastProgressAt: daysAgo(61) }))).toBe("stale");
  });

  it("does not reset the count for a mute that ended before the last raise", () => {
    const c = unmuted(
      { lastProgressAt: daysAgo(20) },
      { lastRaisedAt: daysAgo(10), mutedUntil: daysAgo(15) },
    );
    expect(reason(c)).toBe("stopped");
  });

  it("treats a mute ending exactly now as ended, not muted", () => {
    const c = unmuted({}, { mutedUntil: NOW.toISOString() });
    expect(evalOf(c)).toMatchObject({ eligible: true, count: 1 });
  });
});

describe("snooze ended", () => {
  const ended = (over: Partial<ReminderCandidate> = {}) =>
    make({
      lastProgressAt: daysAgo(12),
      reminder: reminder({
        lastRaisedAt: daysAgo(2),
        snoozedUntil: daysAgo(1),
        count: 2,
      }),
      ...over,
    });

  it("ignores the gap and uses the effective count without +1", () => {
    const d = evalOf(ended());
    expect(d).toMatchObject({ eligible: true, snoozeEnded: true, count: 2 });
  });

  it("ignores stopped and the wait", () => {
    const d = evalOf(
      ended({
        lastProgressAt: daysAgo(3),
        reminder: reminder({
          lastRaisedAt: daysAgo(1),
          snoozedUntil: daysAgo(0.5),
          count: 3,
        }),
      }),
    );
    expect(d).toMatchObject({ eligible: true, snoozeEnded: true, count: 3 });
  });

  it.each([
    ["complete", { viewedLessonIds: [1, 2, 3, 4] }],
    ["archived", { isArchived: true }],
    ["stale", { lastProgressAt: daysAgo(70) }],
  ] as [string, Partial<ReminderCandidate>][])("still skips %s", (r, over) => {
    expect(reason(ended(over))).toBe(r);
  });

  it("stays an ended snooze when a mute ended before the last raise", () => {
    const d = evalOf(
      ended({
        reminder: reminder({
          lastRaisedAt: daysAgo(2),
          snoozedUntil: daysAgo(1),
          mutedUntil: daysAgo(5),
          count: 2,
        }),
      }),
    );
    expect(d).toMatchObject({ eligible: true, snoozeEnded: true, count: 2 });
  });

  it("still skips muted", () => {
    expect(
      reason(
        ended({
          reminder: reminder({
            mutedUntil: future(5),
            snoozedUntil: daysAgo(1),
            lastRaisedAt: daysAgo(2),
          }),
        }),
      ),
    ).toBe("muted");
  });

  it("uses normal rules after progress since the last raise", () => {
    const c = ended({ lastProgressAt: daysAgo(1) });
    expect(evalOf(c)).toMatchObject({ eligible: false, reason: "too_soon" });
  });

  it("beats a due-soon droplet in pickReminder", () => {
    const dueSoon = make({
      enrollmentId: 1,
      dueDate: "2026-11-21",
      lastProgressAt: daysAgo(5),
    });
    const { pick } = pickReminder(
      [dueSoon, ended({ enrollmentId: 2 })],
      NOW,
      TZ,
    );
    expect(pick?.candidate.enrollmentId).toBe(2);
  });

  it("ranks the earliest snooze end first", () => {
    const a = ended({ enrollmentId: 1 });
    const b = ended({
      enrollmentId: 2,
      reminder: reminder({
        lastRaisedAt: daysAgo(5),
        snoozedUntil: daysAgo(3),
        count: 1,
      }),
    });
    expect(pickReminder([a, b], NOW, TZ).pick?.candidate.enrollmentId).toBe(2);
  });
});

describe("the wait", () => {
  it("3 days is too soon, 4 is eligible", () => {
    expect(reason(make({ lastProgressAt: daysAgo(3) }))).toBe("too_soon");
    expect(reason(make({ lastProgressAt: daysAgo(4) }))).toBe("eligible");
  });

  it("counts a never-started enrollment from createdAt", () => {
    const base = { lastProgressAt: null, viewedLessonIds: [] };
    expect(reason(make({ ...base, enrolledAt: daysAgo(3) }))).toBe("too_soon");
    expect(reason(make({ ...base, enrolledAt: daysAgo(4) }))).toBe("eligible");
  });

  it("counts local calendar days, not 24-hour periods", () => {
    // 23:30 Boston on 16 Nov, then 00:10 Boston on 20 Nov
    const progress = "2026-11-17T04:30:00Z";
    const now = new Date("2026-11-20T05:10:00Z");
    const c = make({ lastProgressAt: progress });
    expect(evalOf(c, now, TZ)).toMatchObject({ eligible: true, idleDays: 4 });
    const tokyo = evalOf(c, now, "Asia/Tokyo");
    expect(tokyo).toMatchObject({ eligible: false, reason: "too_soon" });
  });

  it("falls back to Boston for an unset or invalid zone", () => {
    const c = make();
    expect(evaluateCandidate(c, NOW, null)).toEqual(evalOf(c));
    expect(evaluateCandidate(c, NOW, "Nope/Zone")).toEqual(evalOf(c));
  });
});

describe("stale boundary", () => {
  it("idle 60 days is eligible, 61 is stale", () => {
    const at = (n: number) => make({ lastProgressAt: daysAgo(n) });
    expect(reason(at(60))).toBe("eligible");
    expect(reason(at(61))).toBe("stale");
  });
});

describe("dates the rules cannot parse or place", () => {
  it("does not read the clock for an invalid progress date", () => {
    const c = make({ lastProgressAt: "not-a-date" });
    const later = new Date("2030-01-01T17:00:00Z");
    expect(evalOf(c, later)).toEqual({ eligible: false, reason: "too_soon" });
  });

  it("treats progress dated in the future as progress today", () => {
    const c = make({ lastProgressAt: daysAgo(-2), dueDate: "2026-11-21" });
    expect(reason(c)).toBe("progress_today");
  });
});

describe("due soon", () => {
  const due = (dueDate: string, lastProgressAt: string | null) =>
    make({ dueDate, lastProgressAt });

  it("skips the wait when due in 3 days with 1 idle day", () => {
    expect(reason(due("2026-11-23", daysAgo(1)))).toBe("eligible");
  });

  it("due in 4 days with 1 idle day is too soon", () => {
    expect(reason(due("2026-11-24", daysAgo(1)))).toBe("too_soon");
  });

  it("due today is eligible", () => {
    expect(reason(due("2026-11-20", daysAgo(2)))).toBe("eligible");
  });

  it("overdue follows the normal wait", () => {
    expect(reason(due("2026-11-19", daysAgo(1)))).toBe("too_soon");
    expect(reason(due("2026-11-19", daysAgo(4)))).toBe("eligible");
  });

  it("skips a day with progress", () => {
    expect(reason(due("2026-11-21", daysAgo(0)))).toBe("progress_today");
  });

  it("converts a Strapi datetime to the learner's day", () => {
    // 24 Nov 00:00Z is 23 Nov in Boston and 24 Nov in Tokyo
    const now = new Date("2026-11-20T05:00:00Z");
    const c = due("2026-11-24T00:00:00.000Z", daysAgo(10));
    expect(evalOf(c, now, TZ)).toMatchObject({ dueInDays: 3 });
    expect(evalOf(c, now, "Asia/Tokyo")).toMatchObject({ dueInDays: 4 });
  });

  it("is never stale", () => {
    expect(reason(due("2026-11-21", daysAgo(90)))).toBe("eligible");
  });

  it("still honors the gap", () => {
    const c = make({
      dueDate: "2026-11-21",
      lastProgressAt: daysAgo(10),
      reminder: reminder({ lastRaisedAt: daysAgo(6) }),
    });
    expect(reason(c)).toBe("gap");
  });
});

describe("the gap", () => {
  it("6 days ago is a gap, 7 is eligible", () => {
    const at = (n: number) =>
      make({
        lastProgressAt: daysAgo(20),
        reminder: reminder({ lastRaisedAt: daysAgo(n) }),
      });
    expect(reason(at(6))).toBe("gap");
    expect(reason(at(7))).toBe("eligible");
  });
});

describe("stop after 3", () => {
  it("stops at count 3 with no progress since", () => {
    const c = make({
      lastProgressAt: daysAgo(30),
      reminder: reminder({ count: 3, lastRaisedAt: daysAgo(8) }),
    });
    expect(reason(c)).toBe("stopped");
  });

  it("restarts after progress, with count 1", () => {
    const c = make({
      lastProgressAt: daysAgo(5),
      reminder: reminder({ count: 3, lastRaisedAt: daysAgo(8) }),
    });
    expect(evalOf(c)).toMatchObject({ eligible: true, count: 1 });
  });

  it("adds one to the count", () => {
    expect(
      evalOf(
        make({ lastProgressAt: daysAgo(20), reminder: reminder({ count: 2 }) }),
      ),
    ).toMatchObject({
      count: 3,
    });
  });
});

describe("pickReminder", () => {
  const cand = (id: number, over: Partial<ReminderCandidate> = {}) =>
    make({
      enrollmentId: id,
      dropletId: id,
      droplet: {
        status: "published",
        isHidden: false,
        lessonIds: [1, 2, 3, 4],
      },
      ...over,
    });
  const pickId = (cs: ReminderCandidate[]) =>
    pickReminder(cs, NOW, TZ).pick?.candidate.enrollmentId;

  it("due soon beats one-left", () => {
    const oneLeft = cand(1, { viewedLessonIds: [1, 2, 3] });
    const due = cand(2, { dueDate: "2026-11-22" });
    expect(pickId([oneLeft, due])).toBe(2);
  });

  it("the earlier due date wins", () => {
    const a = cand(1, { dueDate: "2026-11-22" });
    const b = cand(2, { dueDate: "2026-11-21" });
    expect(pickId([a, b])).toBe(2);
  });

  it("fewest lessons left wins", () => {
    const a = cand(1, { viewedLessonIds: [1] });
    const b = cand(2, { viewedLessonIds: [1, 2] });
    expect(pickId([a, b])).toBe(2);
  });

  it("breaks ties by fraction, then id", () => {
    const small = cand(1, {
      droplet: { status: "published", isHidden: false, lessonIds: [1, 2] },
      viewedLessonIds: [],
    });
    const big = cand(2, {
      droplet: {
        status: "published",
        isHidden: false,
        lessonIds: [1, 2, 3, 4],
      },
      viewedLessonIds: [1, 2, 3],
    });
    // Both leave 1 or 2: small has 2 left, big 1 left
    expect(pickId([small, big])).toBe(2);
    const x = cand(5, { viewedLessonIds: [1] });
    const y = cand(3, { viewedLessonIds: [1] });
    expect(pickId([x, y])).toBe(3);
    const wide = cand(8, {
      droplet: {
        status: "published",
        isHidden: false,
        lessonIds: [1, 2, 3, 4, 5, 6],
      },
      viewedLessonIds: [1, 2],
    });
    const narrow = cand(7, {
      droplet: {
        status: "published",
        isHidden: false,
        lessonIds: [1, 2, 3, 4],
      },
      viewedLessonIds: [1, 2],
    });
    // Wide has 4 left and narrow 2: fewest left decides before fraction
    expect(pickId([wide, narrow])).toBe(7);
  });

  it("returns null with nothing eligible", () => {
    const r = pickReminder([cand(1, { isArchived: true })], NOW, TZ);
    expect(r.pick).toBeNull();
    expect(r.decisions).toHaveLength(1);
  });

  it("gives the same result twice and carries the template state", () => {
    const cs = [cand(1, { dueDate: "2026-11-22" }), cand(2)];
    const first = pickReminder(cs, NOW, TZ);
    expect(pickReminder(cs, NOW, TZ)).toEqual(first);
    expect(first.pick).toMatchObject({
      count: 1,
      state: {
        progress: { viewed: 1, total: 4 },
        started: true,
        dueInDays: 2,
        idleDays: 4,
      },
    });
  });
});

describe("alreadyRaisedToday", () => {
  const dayStart = dayStartUtc(NOW, TZ);
  it.each([
    ["exactly at dayStart", dayStart.toISOString(), true],
    ["a future-dated row", "2026-11-25T00:00:00Z", true],
    ["yesterday", "2026-11-20T04:59:59Z", false],
  ])("%s", (_, firstCreated, expected) => {
    expect(alreadyRaisedToday([{ firstCreated }], dayStart)).toBe(expected);
  });

  it("is false with no rows or a null date", () => {
    expect(alreadyRaisedToday([], dayStart)).toBe(false);
    expect(alreadyRaisedToday([{ firstCreated: null }], dayStart)).toBe(false);
  });
});

describe("snooze and mute dates", () => {
  it.each([
    [TZ, 1, "2026-11-21T05:00:00.000Z"],
    [TZ, 3, "2026-11-23T05:00:00.000Z"],
    [TZ, 7, "2026-11-27T05:00:00.000Z"],
    [TZ, 30, "2026-12-20T05:00:00.000Z"],
    ["Asia/Tokyo", 1, "2026-11-21T15:00:00.000Z"],
    ["Asia/Tokyo", 30, "2026-12-20T15:00:00.000Z"],
    ["Nope/Zone", 1, "2026-11-21T05:00:00.000Z"],
    [null, 3, "2026-11-23T05:00:00.000Z"],
  ])("dayStartUtc in %s plus %i days", (tz, days, expected) => {
    expect(dayStartUtc(NOW, tz, days).toISOString()).toBe(expected);
  });

  it("stays on local midnight across the DST change", () => {
    const now = new Date("2026-11-01T04:30:00Z"); // 00:30 Boston, before the change
    expect(dayStartUtc(now, TZ, 1).toISOString()).toBe(
      "2026-11-02T05:00:00.000Z",
    );
  });

  it("labels the date in the learner's zone", () => {
    expect(snoozeDateLabel(new Date("2026-11-07T05:00:00Z"), TZ)).toBe(
      "Sat, Nov 7",
    );
  });

  it.each([
    ["tomorrow", true],
    ["in_3_days", true],
    ["next_week", true],
    ["toString", false],
    ["stop", false],
    [3, false],
  ])("isSnoozeChoice(%p) is %p", (v, expected) => {
    expect(isSnoozeChoice(v)).toBe(expected);
  });

  it("keeps a snooze until local midnight of its date", () => {
    const until = dayStartUtc(NOW, TZ, 1);
    const c = make({
      lastProgressAt: daysAgo(20),
      reminder: reminder({
        lastRaisedAt: daysAgo(2),
        snoozedUntil: until.toISOString(),
      }),
    });
    const before = new Date(until.getTime() - 60_000); // 23:59 local
    expect(evalOf(c, before)).toEqual({ eligible: false, reason: "snoozed" });
    expect(evalOf(c, until)).toMatchObject({
      eligible: true,
      snoozeEnded: true,
    });
  });

  it("keeps a mute for the full 30 days", () => {
    const until = dayStartUtc(NOW, TZ, REMINDER_RULES.muteDays);
    const c = make({
      lastProgressAt: daysAgo(20),
      reminder: reminder({ mutedUntil: until.toISOString() }),
    });
    const before = new Date(until.getTime() - 60_000);
    expect(evalOf(c, before)).toEqual({ eligible: false, reason: "muted" });
    expect(evalOf(c, until)).toMatchObject({
      eligible: true,
      snoozeEnded: false,
    });
  });
});
