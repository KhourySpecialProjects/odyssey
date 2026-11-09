/** @jest-environment node */
import fs from "fs";
import os from "os";
import path from "path";
import {
  casesMarkdown,
  countProblems,
  validateCases,
} from "@/scripts/mentor/lib/cases";
import { loadCases, type EvalCase } from "@/scripts/mentor/lib/files";
import {
  caseById,
  EVAL_CASES,
  HIDDEN,
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
  ])("finds %s, once", (_, cases, problem) => {
    const problems = validateCases(cases, fixtures);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(problem);
  });
});

describe("countProblems", () => {
  const history = [
    { role: "student", text: "Hi" },
    { role: "mentor", text: "Hello" },
  ] as const;
  // Twelve of each case, half in each format, on twelve questions
  const full = EVAL_CASES.flatMap((c) =>
    Array.from(
      { length: 12 },
      (_, i): EvalCase => ({
        ...c,
        format: i % 2 ? "blocknote" : "classic",
        input:
          c.input.kind === "quiz-hint"
            ? { ...c.input, questionId: i }
            : { ...c.input, history: [...history] },
      }),
    ),
  );

  it("passes a set with enough of each kind, mode and format", () => {
    expect(countProblems(full)).toEqual([]);
  });

  it("names each shortfall", () => {
    expect(countProblems(EVAL_CASES)).toEqual(
      expect.arrayContaining([
        "1 covered explain cases, at least 6 needed",
        "1 questions with wrong picks, at least 6 needed",
        "0 extraction cases with history, at least 2 needed",
        "no off-topic case in a blocknote lesson",
      ]),
    );
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
    // As in the file: no format, which loadCases adds
    const hint = { ...caseById("wrong-pick-01"), format: undefined };
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
    const line = { ...covered, format: undefined };
    expect(load(line, "{not json", { ...line, kind: "chat" })).toThrow(
      /line 2: not JSON\nline 3: kind:/,
    );
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
