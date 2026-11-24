import {
  LEARNER_MAX_CHARS,
  learnerBlock,
  recentMisses,
  toLearnerContext,
  type LearnerCurrentDroplet,
  type LearnerEnrollment,
  type RecentQuizAttempt,
} from "@/lib/mentor/learner";

const lessons = [{ id: 1 }, { id: 2 }, { id: 3 }];
const droplet = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  name: `Droplet ${id}`,
  difficulty: "beginner",
  status: "published",
  isHidden: false,
  tags: [{ name: "databases" }],
  lessons,
  ...over,
});
const done = (
  id: number,
  completionDate: string | null,
  over: Partial<LearnerEnrollment> = {},
): LearnerEnrollment => ({
  isComplete: true,
  completionDate,
  droplet: droplet(id),
  ...over,
});
const current: LearnerCurrentDroplet = { id: 99, prerequisites: [] };
const run = (rows: LearnerEnrollment[], c = current) =>
  toLearnerContext(rows, c);

describe("toLearnerContext finished", () => {
  it("lists newest first in Boston months, capped at 15", () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      done(i + 1, `2025-01-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
    );
    const { finished } = run(rows);
    expect(finished).toHaveLength(15);
    expect(finished[0]).toMatchObject({ name: "Droplet 20", month: "2025-01" });
    expect(finished[14].name).toBe("Droplet 6");
    // 1 Feb 02:00 UTC is still 31 Jan in Boston
    expect(run([done(1, "2025-02-01T02:00:00Z")]).finished[0].month).toBe(
      "2025-01",
    );
  });

  it("falls back to lastProgressDate, then updatedAt", () => {
    const { finished } = run([
      done(1, null, { lastProgressDate: "2025-03-10T12:00:00Z" }),
      done(2, null, { updatedAt: "2025-05-10T12:00:00Z" }),
      done(3, null),
    ]);
    expect(finished.map((f) => [f.name, f.month])).toEqual([
      ["Droplet 2", "2025-05"],
      ["Droplet 1", "2025-03"],
    ]);
  });

  it("counts archived as finished, never in progress", () => {
    const rows = [
      done(1, "2025-01-10T12:00:00Z", { isArchived: true }),
      {
        isComplete: false,
        isArchived: true,
        droplet: droplet(2),
        viewedLessons: [{ id: 1, name: "A" }],
      },
    ];
    const ctx = run(rows, { id: 99, prerequisites: [{ id: 1, name: "P" }] });
    expect(ctx.finished).toHaveLength(1);
    expect(ctx.inProgress).toEqual([]);
  });

  it("leaves out hidden, unpublished and missing droplets", () => {
    const { finished } = run([
      done(1, "2025-01-10T12:00:00Z", {
        droplet: droplet(1, { isHidden: true }),
      }),
      done(2, "2025-01-10T12:00:00Z", {
        droplet: droplet(2, { status: "draft" }),
      }),
      done(3, "2025-01-10T12:00:00Z", {
        droplet: droplet(3, { isHidden: null }),
      }),
      done(4, "2025-01-10T12:00:00Z", { droplet: null }),
      done(5, "2025-01-10T12:00:00Z"),
    ]);
    expect(finished.map((f) => f.name)).toEqual(["Droplet 5"]);
  });
});

describe("toLearnerContext in progress", () => {
  const started = (
    id: number,
    when: string,
    viewed: { id: number; name: string }[],
  ): LearnerEnrollment => ({
    isComplete: false,
    lastProgressDate: when,
    droplet: droplet(id),
    viewedLessons: viewed,
  });

  it("sorts newest first, caps at 5, counts only lessons still in the droplet", () => {
    const rows = [1, 2, 3, 4, 5, 6].map((i) =>
      started(i, `2025-01-0${i}T12:00:00Z`, [
        { id: 1, name: "A" },
        { id: 77, name: "Removed" },
      ]),
    );
    const { inProgress } = run(rows);
    expect(inProgress.map((p) => p.name)).toEqual([
      "Droplet 6",
      "Droplet 5",
      "Droplet 4",
      "Droplet 3",
      "Droplet 2",
    ]);
    expect(inProgress[0]).toMatchObject({ viewed: 1, total: 3 });
  });

  it("needs a viewed lesson, and includes the current droplet", () => {
    const { inProgress } = run([
      started(1, "2025-01-01T12:00:00Z", []),
      started(99, "2025-01-02T12:00:00Z", [{ id: 2, name: "B" }]),
    ]);
    expect(inProgress.map((p) => p.name)).toEqual(["Droplet 99"]);
  });
});

describe("toLearnerContext prerequisites and viewed lessons", () => {
  const prereq = (id: number, over: Record<string, unknown> = {}) => ({
    id,
    name: `Pre ${id}`,
    status: "published",
    isHidden: false,
    ...over,
  });

  it("marks finished ones, drops hidden ones, keeps at most 8", () => {
    const c = {
      id: 99,
      prerequisites: [
        prereq(1),
        prereq(2),
        prereq(3, { isHidden: true }),
        ...[4, 5, 6, 7, 8, 9, 10, 11].map((i) => prereq(i)),
      ],
    };
    const { prerequisites } = run([done(1, "2025-01-10T12:00:00Z")], c);
    expect(prerequisites).toHaveLength(8);
    expect(prerequisites.slice(0, 2)).toEqual([
      { name: "Pre 1", finished: true },
      { name: "Pre 2", finished: false },
    ]);
    expect(prerequisites.map((p) => p.name)).not.toContain("Pre 3");
  });

  it("lists viewed titles of this droplet only, at most 15", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
    const here: LearnerEnrollment = {
      isComplete: false,
      droplet: droplet(99, { lessons: many }),
      viewedLessons: [
        ...many.map((l) => ({ id: l.id, name: `L${l.id}` })),
        { id: 500, name: "Gone" },
      ],
    };
    const other: LearnerEnrollment = {
      isComplete: false,
      droplet: droplet(5),
      viewedLessons: [{ id: 1, name: "Elsewhere" }],
    };
    const { viewedLessons } = run([other, here]);
    expect(viewedLessons).toHaveLength(15);
    expect(viewedLessons).not.toContain("Elsewhere");
    expect(viewedLessons).not.toContain("Gone");
  });
  it("keeps viewed titles in lesson order", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ id: i + 1 }));
    const here: LearnerEnrollment = {
      isComplete: false,
      droplet: droplet(99, { lessons: many }),
      viewedLessons: [...many]
        .reverse()
        .map((l) => ({ id: l.id, name: `L${l.id}` })),
    };
    const { viewedLessons } = run([here]);
    expect(viewedLessons[0]).toBe("L1");
    expect(viewedLessons[14]).toBe("L15");
  });

  it("drops hidden in-progress droplets", () => {
    const row: LearnerEnrollment = {
      isComplete: false,
      droplet: droplet(5, { isHidden: true }),
      viewedLessons: [{ id: 1, name: "A" }],
    };
    expect(run([row]).inProgress).toEqual([]);
  });

  it("drops draft and unflagged prerequisites", () => {
    const c: LearnerCurrentDroplet = {
      id: 99,
      prerequisites: [
        { id: 1, name: "Draft", status: "draft", isHidden: false },
        { id: 2, name: "Null", status: "published", isHidden: null },
        { id: 3, name: "Ok", status: "published", isHidden: false },
      ],
    };
    expect(run([], c).prerequisites.map((p) => p.name)).toEqual(["Ok"]);
  });
});

describe("toLearnerContext bounds", () => {
  it("keeps at most 3 tags per finished droplet", () => {
    const tags = ["a", "b", "c", "d", "e"].map((name) => ({ name }));
    const { finished } = run([
      done(1, "2025-01-10T12:00:00Z", { droplet: droplet(1, { tags }) }),
    ]);
    expect(finished[0].tags).toEqual(["a", "b", "c"]);
  });

  it("cuts long names to 60 characters with an ellipsis", () => {
    const long = "x".repeat(100);
    const { finished } = run([
      done(1, "2025-01-10T12:00:00Z", {
        droplet: droplet(1, { name: long, tags: [{ name: long }] }),
      }),
    ]);
    expect(finished[0].name).toHaveLength(60);
    expect(finished[0].name.endsWith("…")).toBe(true);
    expect(finished[0].tags[0]).toHaveLength(60);
  });

  it("keeps the block within its cap for 40 droplets and the worst case of the rest", () => {
    const long = "y".repeat(100);
    const manyLessons = Array.from({ length: 22 }, (_, i) => ({ id: i + 1 }));
    const rows: LearnerEnrollment[] = [
      ...Array.from({ length: 40 }, (_, i) =>
        done(
          i + 1,
          `2025-01-${String((i % 28) + 1).padStart(2, "0")}T12:00:00Z`,
          {
            droplet: droplet(i + 1, {
              name: `${long}${i}`,
              tags: [{ name: long }],
            }),
          },
        ),
      ),
      {
        isComplete: false,
        droplet: droplet(99, { lessons: manyLessons }),
        viewedLessons: manyLessons.map((l) => ({ id: l.id, name: long })),
      },
      ...Array.from({ length: 6 }, (_, i) => ({
        isComplete: false,
        lastProgressDate: "2025-02-01T12:00:00Z",
        droplet: droplet(100 + i, { name: long }),
        viewedLessons: [{ id: 1, name: "A" }],
      })),
    ];
    const prerequisites = Array.from({ length: 12 }, (_, i) => ({
      id: 200 + i,
      name: long,
      status: "published",
      isHidden: false,
    }));
    const ctx = run(rows, { id: 99, prerequisites });
    expect(learnerBlock(ctx).length).toBeLessThanOrEqual(LEARNER_MAX_CHARS);
    // with nothing finished, everything else still fits
    const rest = learnerBlock({ ...ctx, finished: [] });
    expect(rest.length).toBeLessThanOrEqual(LEARNER_MAX_CHARS);
    expect(ctx.viewedLessons).toHaveLength(15);
  });
});

const NOW = new Date("2025-03-01T12:00:00Z");
const hoursAgo = (h: number) =>
  new Date(NOW.getTime() - h * 3600000).toISOString();
const attempt = (over: Partial<RecentQuizAttempt> = {}): RecentQuizAttempt => ({
  quizType: "choice",
  questionId: 1,
  correct: false,
  createdAt: hoursAgo(1),
  lesson: { id: 1, name: "Loops" },
  droplet: { id: 1, status: "published", isHidden: false },
  ...over,
});
const misses = (...rows: RecentQuizAttempt[]) => recentMisses(rows, NOW);

describe("recentMisses", () => {
  it.each([
    ["a wrong answer", [attempt()], [{ lesson: "Loops", missed: 1 }]],
    [
      "wrong then right",
      [
        attempt({ correct: true, createdAt: hoursAgo(1) }),
        attempt({ createdAt: hoursAgo(2) }),
      ],
      [],
    ],
    [
      "right then wrong",
      [
        attempt({ createdAt: hoursAgo(1) }),
        attempt({ correct: true, createdAt: hoursAgo(2) }),
      ],
      [{ lesson: "Loops", missed: 1 }],
    ],
    ["a 31-day-old row", [attempt({ createdAt: hoursAgo(31 * 24) })], []],
    [
      "a hidden droplet",
      [attempt({ droplet: { id: 1, status: "published", isHidden: true } })],
      [],
    ],
    [
      "an edit droplet",
      [attempt({ droplet: { id: 1, status: "edit", isHidden: false } })],
      [],
    ],
    ["a droplet without flags", [attempt({ droplet: { id: 1 } })], []],
    ["a deleted lesson", [attempt({ lesson: null })], []],
    [
      "the same id under both quiz types",
      [attempt(), attempt({ quizType: "open-ended" })],
      [{ lesson: "Loops", missed: 2 }],
    ],
  ])("%s", (_name, rows, expected) => {
    expect(misses(...rows)).toEqual(expected);
  });

  it("returns 5 of 7 lessons, newest miss first, with names cut to 40", () => {
    const rows = Array.from({ length: 7 }, (_, i) =>
      attempt({
        lesson: { id: i + 1, name: i === 6 ? "z".repeat(60) : `L${i + 1}` },
        createdAt: hoursAgo(i + 1),
      }),
    );
    expect(misses(...rows).map((m) => m.lesson)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
    ]);
    const [long] = misses(attempt({ lesson: { id: 9, name: "z".repeat(60) } }));
    expect(long.lesson).toHaveLength(40);
    expect(long.lesson.endsWith("…")).toBe(true);
  });
});

describe("learnerBlock recently missed", () => {
  const base = {
    finished: [],
    inProgress: [],
    prerequisites: [],
    viewedLessons: [],
  };

  it("adds a plural and singular line, and none when empty or missing", () => {
    const text = learnerBlock({
      ...base,
      recentlyMissed: [
        { lesson: "Loops", missed: 2 },
        { lesson: "Recursion", missed: 1 },
      ],
    });
    expect(text).toContain(
      "Recently missed: Loops (2 questions), Recursion (1 question)",
    );
    expect(learnerBlock({ ...base, recentlyMissed: [] })).not.toContain(
      "Recently",
    );
    expect(learnerBlock(base)).not.toContain("Recently");
  });

  it("stays within the cap in the worst case, keeping at least 4 missed lessons and the line", () => {
    const long = "y".repeat(100);
    const many = Array.from({ length: 22 }, (_, i) => ({ id: i + 1 }));
    const rows: LearnerEnrollment[] = [
      {
        isComplete: false,
        droplet: droplet(99, { lessons: many }),
        viewedLessons: many.map((l) => ({ id: l.id, name: long })),
      },
      ...Array.from({ length: 6 }, (_, i) => ({
        isComplete: false,
        lastProgressDate: "2025-02-01T12:00:00Z",
        droplet: droplet(100 + i, { name: long }),
        viewedLessons: [{ id: 1, name: "A" }],
      })),
    ];
    const prerequisites = Array.from({ length: 12 }, (_, i) => ({
      id: 200 + i,
      name: long,
      status: "published",
      isHidden: false,
    }));
    const recentlyMissed = Array.from({ length: 5 }, (_, i) => ({
      lesson: `${"m".repeat(39)}${i}`,
      missed: 9,
    }));
    const ctx = { ...run(rows, { id: 99, prerequisites }), recentlyMissed };
    const text = learnerBlock(ctx);

    expect(text.length).toBeLessThanOrEqual(LEARNER_MAX_CHARS);
    expect(
      text.match(/m{39}\d \(9 questions\)/g)!.length,
    ).toBeGreaterThanOrEqual(4);
  });
});
