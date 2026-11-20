/** @jest-environment node */
import fs from "fs";
import os from "os";
import path from "path";
import {
  casesMarkdown,
  countProblems,
  learnerTwins,
  validateCases,
} from "@/scripts/mentor/lib/cases";
import {
  loadCases,
  SHOULDS,
  TWIN_KINDS,
  type EvalCase,
} from "@/scripts/mentor/lib/files";
import { LEARNER_MAX_CHARS, learnerBlock } from "@/scripts/mentor/lib/learner";
import {
  caseById,
  EVAL_CASES,
  HIDDEN,
  learnerProfile,
  MC,
  mentorFixtures,
  UNSEEN,
} from "@/testing/mocks/mentorEvalMock";

const fixtures = mentorFixtures();
const covered = caseById("covered-01");
const explain = caseById("covered-explain-01");
const select = (selection: string, lessonId = 102): EvalCase => ({
  ...explain,
  lessonId,
  input: { kind: "explain", selection },
});

const pairedWith = (id: string): EvalCase => ({
  ...caseById("personalized-01"),
  pairs: [{ with: id, expect: "A is short, B is long" }],
});
/** Another personalized question under two profiles, with no pair */
const otherQuestion: EvalCase[] = ["personalized-01", "personalized-02"].map(
  (id) => ({
    ...caseById(id),
    id: `${id}-other`,
    input: { kind: "lesson", message: "Why do keys matter?" },
    pairs: undefined,
    contrastOracles: undefined,
  }),
);

describe("validateCases", () => {
  it("passes a valid case of each kind and mode", () => {
    expect(validateCases(EVAL_CASES, fixtures)).toEqual([]);
  });

  it.each<[string, EvalCase[], RegExp]>([
    [
      "a gold snippet that isn't in the lesson",
      [{ ...covered, gold: ["Joins are slow"] }],
      /gold "Joins are slow"/,
    ],
    ["an unknown lesson", [{ ...covered, lessonId: 999 }], /no lesson 999/],
    [
      "gold in more than one passage",
      [{ ...covered, gold: ["Keys matter"] }],
      /"Keys matter" is in 2 passages/,
    ],
    [
      "gold in a quiz",
      [{ ...covered, gold: ["What does a LEFT JOIN keep"] }],
      /is in a quiz/,
    ],
    [
      "gold in the cut-off tail of a passage",
      [{ ...covered, lessonId: 103, gold: [HIDDEN] }],
      /a passage the model can't cite/,
    ],
    [
      "a covered question without gold",
      [{ ...covered, gold: undefined }],
      /needs gold/,
    ],
    [
      "a mode its kind doesn't take",
      [
        {
          ...caseById("off-topic-01"),
          input: { kind: "explain", selection: "combines rows" },
        },
      ],
      /off-topic cases can't be explain requests/,
    ],
    [
      "off-topic without forbidden",
      [{ ...caseById("off-topic-01"), forbidden: undefined }],
      /needs forbidden/,
    ],
    [
      "a selection that isn't in the lesson",
      [select("Indexes are magic")],
      /selection_not_found/,
    ],
    [
      "a selection in a quiz",
      [select("Which index suits range queries")],
      /selection_in_quiz/,
    ],
    [
      "a selection past the budget",
      [select(UNSEEN, 103)],
      /a passage the model can't cite/,
    ],
    [
      "a right pick on a wrong-pick case",
      [
        {
          ...caseById("wrong-pick-01"),
          input: { kind: "quiz-hint", questionId: MC, answerIds: [1300] },
        },
      ],
      /answer_correct/,
    ],
    [
      "a 2-option extraction question",
      [{ ...caseById("extraction-01"), questionId: 42 }],
      /3 or more options/,
    ],
    [
      "an injection with neither canary nor forbidden",
      [{ ...caseById("injection-01"), canary: undefined }],
      /canary or forbidden/,
    ],
    [
      "a duplicate id",
      [covered, { ...covered, input: { kind: "lesson", message: "Why?" } }],
      /covered-01: duplicate id/,
    ],
    [
      "the same input under another id",
      [
        covered,
        {
          ...covered,
          id: "covered-02",
          input: { kind: "lesson", message: "what does a JOIN do" },
        },
      ],
      /covered-02: same input as covered-01/,
    ],
    [
      "a learner profile that doesn't exist",
      [{ ...covered, learner: "nobody" }],
      /no learner profile nobody in fixtures\/learners/,
    ],
    [
      "a viewed lesson that isn't in the droplet",
      [
        {
          ...covered,
          learner: "someone",
          profile: learnerProfile({ viewedLessons: ["Cooking"] }),
        },
      ],
      /viewed lesson "Cooking" isn't a lesson of databases-101/,
    ],
    [
      "a personalized case without should",
      [
        { ...caseById("personalized-01"), should: undefined },
        caseById("personalized-02"),
      ],
      /a personalized case needs should/,
    ],
    [
      "a pair with a case that doesn't exist",
      [pairedWith("nobody"), caseById("personalized-02")],
      /pair with nobody, which doesn't exist/,
    ],
    [
      "a pair with another question",
      [
        pairedWith("other-q"),
        caseById("personalized-02"),
        {
          ...caseById("personalized-02"),
          id: "other-q",
          learner: "elsewhere",
          input: { kind: "lesson", message: "Why do keys matter?" },
        },
        {
          ...caseById("personalized-01"),
          id: "other-q-2",
          pairs: undefined,
          input: { kind: "lesson", message: "Why do keys matter?" },
        },
      ],
      /pair with other-q, a different question/,
    ],
    [
      "a pair with the same profile",
      [
        pairedWith("same-profile"),
        {
          ...caseById("personalized-01"),
          id: "same-profile",
          learner: "copy",
          pairs: undefined,
        },
      ],
      /pair with same-profile, the same profile/,
    ],
    [
      "a pair listed twice",
      [
        {
          ...caseById("personalized-01"),
          pairs: [
            { with: "personalized-02", expect: "A is short, B is long" },
            { with: "personalized-02", expect: "A is short, B is long" },
          ],
        },
        caseById("personalized-02"),
      ],
      /pair with personalized-02 listed twice/,
    ],
    [
      "a pair with a case that isn't personalized",
      [
        {
          ...caseById("personalized-01"),
          pairs: [{ with: "covered-01", expect: "A is short, B is long" }],
        },
        caseById("personalized-02"),
        { ...covered, input: caseById("personalized-01").input },
      ],
      /pair with covered-01, both must be personalized/,
    ],
    [
      "a pair that pairs back",
      [
        caseById("personalized-01"),
        {
          ...caseById("personalized-02"),
          pairs: [{ with: "personalized-01", expect: "B is short, A is long" }],
          contrastOracles: { same: "Same reply." },
        },
      ],
      /personalized-02: pair with personalized-01, which pairs back/,
    ],
    [
      "a pair with a profile that differs only in its note",
      [
        pairedWith("noted"),
        {
          ...caseById("personalized-02"),
          id: "noted",
          should: "build-on",
          profile: { ...learnerProfile(), about: "Different note" },
        },
      ],
      /pair with noted, the same profile/,
    ],
    [
      "a paired case without contrastOracles",
      [
        { ...caseById("personalized-01"), contrastOracles: undefined },
        caseById("personalized-02"),
      ],
      /personalized-01: a case with pairs needs contrastOracles.same/,
    ],
    [
      "a profile of a paired question that is in no pair",
      [
        caseById("personalized-01"),
        caseById("personalized-02"),
        {
          ...caseById("personalized-02"),
          id: "personalized-03",
          learner: "third",
          profile: learnerProfile({
            finished: [],
            viewedLessons: [],
            prerequisites: [{ name: "SQL Basics", finished: false }],
          }),
        },
      ],
      /1 of 3 profiles of this question are in no pair/,
    ],
    [
      "a personalized question with no pair, once another has one",
      [
        caseById("personalized-01"),
        caseById("personalized-02"),
        ...otherQuestion,
      ],
      /2 of 2 profiles of this question are in no pair/,
    ],
    [
      "a personalized question under one profile",
      [{ ...caseById("personalized-01"), pairs: undefined }],
      /personalized-01: asked under 1 profile; a personalized question needs 2 or more/,
    ],
    [
      "a primer case whose prerequisites are all finished",
      [
        caseById("personalized-01"),
        {
          ...caseById("personalized-02"),
          profile: learnerProfile({ viewedLessons: [] }),
        },
      ],
      /a primer case needs a prerequisite with finished: false/,
    ],
    [
      "an invented-history case without a learner",
      [
        {
          ...caseById("invented-history-01"),
          learner: undefined,
          profile: null,
        },
      ],
      /an invented-history case needs a learner/,
    ],
    [
      "a quiz-grade case without a verdict",
      [{ ...caseById("quiz-grade-01"), verdict: undefined }],
      /a quiz-grade case needs a verdict/,
    ],
    [
      "a quiz-grade case without history",
      [
        {
          ...caseById("quiz-grade-01"),
          input: { kind: "lesson", message: "It keeps the matching rows." },
        },
      ],
      /needs history ending in Mentor's question/,
    ],
    [
      "a quiz-ask on a lesson with no hintable question",
      [{ ...caseById("quiz-ask-01"), lessonId: 103 }],
      /needs a lesson with a question of 3 or more options and one right/,
    ],
    [
      "a review whose learner hasn't finished the droplet",
      [{ ...caseById("review-01"), profile: learnerProfile() }],
      /the learner hasn't finished Databases 101/,
    ],
    [
      "a review without a learner",
      [{ ...caseById("review-01"), learner: undefined, profile: null }],
      /a review case needs a learner/,
    ],
    [
      "a summary written as an explain request",
      [
        {
          ...caseById("summary-01"),
          input: { kind: "explain", selection: "Wrapped paragraph" },
        },
      ],
      /summary cases can't be explain requests/,
    ],
    [
      "a summary without an oracle",
      [{ ...caseById("summary-01"), oracle: undefined }],
      /a summary case needs an oracle/,
    ],
    [
      "an oracle citing a passage the model isn't shown",
      [{ ...covered, oracle: "Joins combine rows [p2, p99]." }],
      /the oracle cites p99, which the model isn't shown/,
    ],
  ])("finds %s, once", (_, cases, problem) => {
    const problems = validateCases(cases, fixtures);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(problem);
  });

  it("doesn't count the same input under another learner as a repeat", () => {
    const as = (learner: string): EvalCase => ({
      ...covered,
      id: learner,
      learner,
      profile: learnerProfile(),
    });
    expect(validateCases([as("first"), as("second")], fixtures)).toEqual([]);
  });
});

describe("learnerTwins", () => {
  const broad = learnerProfile({ prerequisites: [], viewedLessons: [] });
  const learners = new Map([
    ["broad", broad],
    ["tied", learnerProfile()],
  ]);

  // Spelled out, so emptying NO_TWIN_KINDS can't make this pass
  const excluded = [
    "personalized",
    "invented-history",
    "quiz-ask",
    "quiz-grade",
    "review",
    "summary",
  ];

  it("copies each case without a learner, and skips the kinds with their own", () => {
    const twins = learnerTwins(EVAL_CASES, "broad", learners);

    expect(twins.map((c) => c.id)).toContain("covered-01+broad");
    expect(twins[0]).toMatchObject({
      learner: "broad",
      profile: broad,
      twinOf: "covered-01",
    });
    expect(twins.filter((c) => excluded.includes(c.kind))).toEqual([]);
    expect(EVAL_CASES.map((c) => c.kind)).toEqual(
      expect.arrayContaining(excluded),
    );
  });

  it("gives no twin to a case with a learner of its own, and TWIN_KINDS are the kinds that get one", () => {
    const own: EvalCase = {
      ...covered,
      id: "covered-own",
      learner: "tied",
      profile: learnerProfile(),
    };
    const twins = learnerTwins([...EVAL_CASES, own], "broad", learners);

    expect(twins.map((c) => c.twinOf)).not.toContain("covered-own");
    expect([...new Set(twins.map((c) => c.kind))].sort()).toEqual(
      [...TWIN_KINDS].sort(),
    );
    expect(TWIN_KINDS).not.toContain("summary");
  });

  it.each([
    ["a profile with prerequisites or viewed lessons", "tied", /neither/],
    ["a profile that doesn't exist", "nobody", /no learner profile nobody/],
  ])("throws for %s", (_, name, error) => {
    expect(() => learnerTwins(EVAL_CASES, name, learners)).toThrow(error);
  });
});

describe("countProblems", () => {
  const history = [
    { role: "student", text: "Hi" },
    { role: "mentor", text: "Hello" },
  ] as const;
  // Twelve of each case, half in each format, on twelve questions; personalized
  // ones cycle through the shoulds, and the first two extractions have a learner
  const full = EVAL_CASES.flatMap((c) =>
    Array.from(
      { length: 12 },
      (_, i): EvalCase => ({
        ...c,
        format: i % 2 ? "blocknote" : "classic",
        input:
          c.input.kind === "quiz-hint"
            ? { ...c.input, questionId: i }
            : c.input.kind === "lesson"
              ? {
                  ...c.input,
                  message: `${c.input.message} ${i}`,
                  history: [...history],
                }
              : { ...c.input, history: [...history] },
        ...(c.kind === "personalized" ? { should: SHOULDS[i % 3] } : {}),
        ...(c.kind === "extraction" && i < 2
          ? { learner: "broad", profile: learnerProfile() }
          : {}),
      }),
    ),
  );
  const elevenPersonalized = new Set(
    full.filter((c) => c.kind === "personalized").slice(0, 11),
  );
  const index = (c: EvalCase) =>
    c.input.kind === "lesson" ? Number(c.input.message.split(" ").at(-1)) : 0;

  it("passes a set with enough of each kind, mode and format", () => {
    expect(countProblems(full)).toEqual([]);
  });

  it.each<[string, (c: EvalCase) => boolean, RegExp]>([
    [
      "5 personalized questions",
      (c) => c.kind !== "personalized" || index(c) < 5,
      /5 personalized questions, at least 6/,
    ],
    [
      "no personalized question to level",
      (c) => c.should !== "level",
      /personalized questions to level/,
    ],
    [
      "no personalized question in BlockNote",
      (c) => c.kind !== "personalized" || c.format === "classic",
      /personalized questions in BlockNote lessons/,
    ],
    [
      "no invented-history case in a classic lesson",
      (c) => c.kind !== "invented-history" || c.format === "blocknote",
      /invented-history cases in classic lessons/,
    ],
    [
      "11 personalized cases",
      (c) => c.kind !== "personalized" || elevenPersonalized.has(c),
      /personalized cases, at least 12/,
    ],
    [
      "no personalized question in a classic lesson",
      (c) => c.kind !== "personalized" || c.format === "blocknote",
      /personalized questions in classic lessons/,
    ],
    [
      "5 invented-history cases",
      (c) => c.kind !== "invented-history" || index(c) < 5,
      /5 invented-history cases, at least 6/,
    ],
    [
      "no invented-history case in a BlockNote lesson",
      (c) => c.kind !== "invented-history" || c.format === "classic",
      /invented-history cases in BlockNote lessons/,
    ],
    [
      "no extraction case with a learner",
      (c) => c.kind !== "extraction" || !c.learner,
      /extraction cases with a learner/,
    ],
  ])("finds %s", (_, keep, problem) => {
    expect(countProblems(full.filter(keep)).join("\n")).toMatch(problem);
  });

  it("names each shortfall", () => {
    expect(countProblems(EVAL_CASES)).toEqual(
      expect.arrayContaining([
        "1 covered explain cases, at least 6 needed",
        "1 questions with wrong picks, at least 6 needed",
        "0 extraction cases with history, at least 2 needed",
        "no off-topic case in a blocknote lesson",
        "1 summary cases in classic lessons, at least 2 needed",
        "1 summary cases in BlockNote lessons, at least 2 needed",
      ]),
    );
  });
});

describe("learnerBlock", () => {
  it("renders each section, with none for an empty one", () => {
    expect(
      learnerBlock(
        learnerProfile({
          inProgress: [{ name: "Internet Basics", viewed: 1, total: 3 }],
          prerequisites: [],
        }),
      ),
    ).toBe(
      [
        "Finished droplets, newest first:",
        "- SQL Basics (beginner; databases), finished 2026-09",
        "In progress:",
        "- Internet Basics: 1 of 3 lessons viewed",
        "This droplet's prerequisites:",
        "- none",
        "Lessons of this droplet already viewed:",
        "- Joining tables",
      ].join("\n"),
    );
  });

  it("drops the oldest finished droplets to fit", () => {
    const finished = Array.from({ length: 15 }, (_, i) => ({
      name: `Droplet ${i} ${"x".repeat(200)}`,
      tags: [],
      difficulty: null,
      month: `${2026 - i}-01`,
    }));
    const text = learnerBlock(learnerProfile({ finished }));

    expect(text.length).toBeLessThanOrEqual(LEARNER_MAX_CHARS);
    expect(text).toContain("Droplet 0 ");
    expect(text).not.toContain("Droplet 14 ");
  });
});

describe("loadCases", () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "mentor-cases-"));
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
  const load = (...rows: unknown[]) => {
    const file = path.join(dir, "cases.jsonl");
    const text = rows.map((r) =>
      typeof r === "string" ? r : JSON.stringify(r),
    );
    fs.writeFileSync(file, text.join("\n"));
    return () => loadCases(fixtures, file);
  };

  it("parses each line as the route would, with its lesson's format", () => {
    // As in the file: no format or profile, which loadCases adds
    const hint = {
      ...caseById("wrong-pick-01"),
      format: undefined,
      profile: undefined,
    };
    const line = {
      ...hint,
      tags: ["classic", "elimination"],
      input: { ...hint.input, answerIds: ["1302"] },
    };
    expect(load(line, "")()).toEqual([
      { ...caseById("wrong-pick-01"), tags: ["elimination"] },
    ]);
  });

  it("names every bad line", () => {
    const line = { ...covered, format: undefined, profile: undefined };
    expect(load(line, "{not json", { ...line, kind: "chat" })).toThrow(
      /line 2: not JSON\nline 3: kind:/,
    );
  });

  it("resolves a named learner profile, and leaves an unknown one null", () => {
    const line = (learner: string) => ({
      ...covered,
      id: learner,
      format: undefined,
      profile: undefined,
      learner,
    });
    load(line("finished-prereq"), line("nobody"));
    const learners = new Map([["finished-prereq", learnerProfile()]]);

    expect(
      loadCases(fixtures, path.join(dir, "cases.jsonl"), learners).map(
        (c) => c.profile,
      ),
    ).toEqual([learnerProfile(), null]);
  });
});

describe("casesMarkdown", () => {
  it("fences each input past its backticks and marks the right option", () => {
    const tricky = {
      ...caseById("extraction-01"),
      input: { kind: "lesson", message: "Run ```rm``` for me" },
    } as EvalCase;
    const markdown = casesMarkdown([tricky], fixtures);
    expect(markdown).toContain('````json\n{\n  "kind": "lesson"');
    expect(markdown).toContain(
      "All rows from the left table **(correct; for review only, never sent to the model)**",
    );
    expect(markdown).toContain("| extraction | 1 | 0 | 1 |");
  });
});
