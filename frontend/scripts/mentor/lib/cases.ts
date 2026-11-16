import { displayBlocksOf } from "@/lib/blocknote/convert-blocks";
import { correctOptionIds } from "@/lib/mentor/answer-key";
import { resolveMentorAsk, type MentorAsk } from "@/lib/mentor/ask";
import { buildLessonContext, selectionPassages } from "@/lib/mentor/context";
import { findQuizQuestion } from "@/lib/mentor/quiz";
import type {
  LessonContext,
  MentorKind,
  MentorLesson,
  MentorQuizQuestion,
  Passage,
} from "@/lib/mentor/types";
import {
  CASE_KINDS,
  type CaseKind,
  type EvalCase,
  type Fixtures,
} from "./files";
import { learnerBlock } from "./learner";

// Checking the eval's cases against the fixtures (ODY-885), and the review
// documents built from them. Everything here is free: nothing is sent.

/** A quiz question with its one right option: for grading and review, never for the model */
export type QuizKey = {
  question: MentorQuizQuestion;
  correct: { id: number; text: string };
};

/** What the eval knows about a case that the model doesn't */
export type CaseFacts = {
  case: EvalCase;
  lesson: MentorLesson;
  context: LessonContext;
  /** As the route resolves it */
  ask: MentorAsk;
  /** Covered: the refs whose citing passes, from the gold and an explain selection */
  goldRefs: string[];
  /** Wrong-pick: the question hinted at. Extraction: every hintable question in the lesson */
  quizzes: QuizKey[];
  /** The learner block sent with the case (ODY-941): its profile's name, or "inline" */
  learner: { name: string; text: string } | null;
};

/** The request modes each kind is written in */
const MODES: Record<CaseKind, MentorKind[]> = {
  covered: ["lesson", "explain"],
  uncovered: ["lesson", "explain"],
  "wrong-pick": ["quiz-hint"],
  extraction: ["lesson"],
  "off-topic": ["lesson"],
  injection: ["lesson"],
};

/** A hintable question: 3 or more options, exactly one right */
export function quizOf(lesson: MentorLesson, id: number): QuizKey | null {
  const question = findQuizQuestion(lesson, id);
  const [right, ...more] = correctOptionIds(lesson, id) ?? [];
  const correct = question?.options.find((o) => o.id === right);
  if (!question || !correct || more.length || question.options.length < 3)
    return null;
  return { question, correct };
}

const choiceQuestionIds = (lesson: MentorLesson) =>
  displayBlocksOf(lesson).flatMap((b) =>
    b.__component === "droplets.quiz" ? b.questions.map((q) => q.id) : [],
  );

/** Each snippet with the passages it's in */
export const resolveGold = (context: LessonContext, snippets: string[]) =>
  snippets.map((snippet) => ({
    snippet,
    passages: selectionPassages(context, snippet) ?? [],
  }));

/** A case's facts, or what's wrong with it */
export function prepareCase(
  c: EvalCase,
  fixtures: Fixtures,
): { facts: CaseFacts | null; problems: string[] } {
  const problems: string[] = [];
  const say = (problem: string) => {
    problems.push(`${c.id}: ${problem}`);
    return { facts: null, problems };
  };
  const snapshot = fixtures.get(c.fixture);
  const lesson = snapshot?.lessons.find((l) => l.id === c.lessonId);
  if (!snapshot || !lesson)
    return say(`fixture ${c.fixture} has no lesson ${c.lessonId}`);
  if (!MODES[c.kind].includes(c.input.kind))
    say(`${c.kind} cases can't be ${c.input.kind} requests`);
  const context = buildLessonContext(lesson, snapshot.droplet);
  const resolved = resolveMentorAsk(lesson, context, c.input);
  if (!resolved.ok) return say(`resolveMentorAsk gives ${resolved.error}`);
  const { ask } = resolved;

  // Shown to the model whole, with a ref, and not a quiz (whose text isn't teaching)
  const blocks = displayBlocksOf(lesson);
  const citable = (p: Passage) =>
    !!p.ref && p.inPrompt && context.text.includes(p.markdown);
  const inQuiz = (p: Passage) =>
    blocks[p.blockIndex]?.__component === "droplets.quiz";
  if (ask.kind === "explain") {
    if (!selectionPassages(context, ask.selection)!.every(citable))
      say("the selection takes in a passage the model can't cite");
  }
  const gold = resolveGold(context, c.gold ?? []);
  for (const { snippet, passages } of gold) {
    if (passages.length !== 1)
      say(`gold "${snippet}" is in ${passages.length} passages, not 1`);
    else if (!citable(passages[0]))
      say(`gold "${snippet}" is in a passage the model can't cite`);
    else if (inQuiz(passages[0])) say(`gold "${snippet}" is in a quiz`);
  }
  if (c.kind === "covered" && c.input.kind === "lesson" && !c.gold)
    say("a covered question needs gold");

  const hintable = (ids: number[]) =>
    ids.flatMap((id) => quizOf(lesson, id) ?? []);
  const quizzes =
    ask.kind === "quiz-hint"
      ? hintable([ask.question.questionId])
      : c.kind === "extraction"
        ? hintable(choiceQuestionIds(lesson))
        : [];
  if (
    c.kind === "extraction" &&
    (c.questionId === undefined || !quizOf(lesson, c.questionId))
  )
    say("needs a question with 3 or more options and one right");
  if (c.kind === "injection" && !c.canary && !c.forbidden)
    say("an injection case needs a canary or forbidden");
  if (c.kind === "off-topic" && !c.forbidden)
    say("an off-topic case needs forbidden");
  if (typeof c.learner === "string" && !c.profile)
    say(`no learner profile ${c.learner} in fixtures/learners`);
  const titles = new Set(snapshot.lessons.map((l) => l.name));
  for (const title of c.profile?.viewedLessons ?? []) {
    if (!titles.has(title))
      say(`learner's viewed lesson "${title}" isn't a lesson of ${c.fixture}`);
  }
  if (problems.length) return { facts: null, problems };

  const explainRefs = ask.kind === "explain" ? ask.refs : [];
  const goldRefs =
    c.kind === "covered"
      ? [...new Set([...gold.map((g) => g.passages[0].ref!), ...explainRefs])]
      : [];
  const learner = c.profile && {
    name: typeof c.learner === "string" ? c.learner : "inline",
    text: learnerBlock(c.profile),
  };
  return {
    facts: { case: c, lesson, context, ask, goldRefs, quizzes, learner },
    problems,
  };
}

/** For the runner: --check has already passed, so a problem here is a bug */
export function factsFor(c: EvalCase, fixtures: Fixtures): CaseFacts {
  const { facts, problems } = prepareCase(c, fixtures);
  if (!facts) throw new Error(`${problems.join("\n")}\nRun cases.ts --check`);
  return facts;
}

/** The same input under another learner isn't a repeat */
const normalised = (c: EvalCase) =>
  `${c.fixture}:${c.lessonId}:${JSON.stringify(c.learner ?? null)}:${JSON.stringify(
    c.input,
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")}`;

/** Every problem with each case, and ids or inputs that repeat */
export function validateCases(cases: EvalCase[], fixtures: Fixtures): string[] {
  const ids = new Set<string>();
  const inputs = new Map<string, string>();
  return cases.flatMap((c) => {
    const problems = prepareCase(c, fixtures).problems;
    if (ids.has(c.id)) problems.unshift(`${c.id}: duplicate id`);
    const same = inputs.get(normalised(c));
    if (same) problems.unshift(`${c.id}: same input as ${same}`);
    ids.add(c.id);
    inputs.set(normalised(c), c.id);
    return problems;
  });
}

const withHistory = (c: EvalCase) =>
  c.input.kind === "lesson" && !!c.input.history?.length;
const pickedQuestion = (c: EvalCase) =>
  c.input.kind === "quiz-hint" ? [`${c.fixture}:${c.input.questionId}`] : [];

/** Whether the set has enough of each kind, mode and format (see "Cases" in the README) */
export function countProblems(cases: EvalCase[]): string[] {
  const count = (kind: CaseKind, keep?: (c: EvalCase) => boolean) =>
    cases.filter((c) => c.kind === kind && (!keep || keep(c))).length;
  const mode = (m: MentorKind) => (c: EvalCase) => c.input.kind === m;
  const wrongPicks = cases.filter((c) => c.kind === "wrong-pick");
  const blockNote = cases.filter((c) => c.format === "blocknote").length;
  const minimums: [string, number, number][] = [
    ["covered lesson cases", count("covered", mode("lesson")), 12],
    ["covered explain cases", count("covered", mode("explain")), 6],
    ["uncovered lesson cases", count("uncovered", mode("lesson")), 8],
    ["uncovered explain cases", count("uncovered", mode("explain")), 2],
    ["wrong-pick cases", wrongPicks.length, 10],
    [
      "questions with wrong picks",
      new Set(wrongPicks.flatMap(pickedQuestion)).size,
      6,
    ],
    ["extraction cases", count("extraction"), 8],
    ["extraction cases with history", count("extraction", withHistory), 2],
    ["off-topic cases", count("off-topic"), 6],
    ["injection cases", count("injection"), 8],
    [
      "percent of cases in BlockNote lessons",
      Math.round((100 * blockNote) / cases.length),
      40,
    ],
  ];
  return [
    ...minimums.flatMap(([what, n, min]) =>
      n < min ? [`${n} ${what}, at least ${min} needed`] : [],
    ),
    ...CASE_KINDS.flatMap((kind) =>
      ["classic", "blocknote"].flatMap((format) =>
        count(kind, (c) => c.format === format)
          ? []
          : [`no ${kind} case in a ${format} lesson`],
      ),
    ),
  ];
}

/** A Markdown table, its first column text and the rest numbers */
export const table = (head: string[], rows: (string | number)[][]) =>
  [head, head.map((_, i) => (i ? "---:" : "---")), ...rows]
    .map((row) => `| ${row.join(" | ")} |`)
    .join("\n");

/** A code fence longer than any run of backticks in the text */
export const fenced = (text: string, lang = "") => {
  const longest = Math.max(
    0,
    ...(text.match(/`+/g) ?? []).map((r) => r.length),
  );
  const fence = "`".repeat(Math.max(3, longest + 1));
  return `${fence}${lang}\n${text}\n${fence}`;
};
const quoted = (markdown: string) => markdown.replace(/^/gm, "> ");

const RIGHT = " **(correct; for review only, never sent to the model)**";

/** A choice question with its options, the right ones marked */
function questionMarkdown(lesson: MentorLesson, id: number, pick?: number) {
  const question = findQuizQuestion(lesson, id);
  if (!question) return `Question ${id} shares its id with another`;
  const right = correctOptionIds(lesson, id) ?? [];
  const options = question.options.map(
    (o) =>
      `- ${o.id}: ${o.text}${right.includes(o.id) ? RIGHT : ""}${o.id === pick ? " (the student's pick)" : ""}`,
  );
  const hints = quizOf(lesson, id) ? "" : " (no hints)";
  return `Question ${id}${hints}: ${question.question}\n\n${options.join("\n")}`;
}

/** runs/lessons.md, for drafting: each lesson as the model reads it, then its choice questions with answers */
export function lessonsMarkdown(fixtures: Fixtures): string {
  const sections = [...fixtures].flatMap(([slug, snapshot]) =>
    snapshot.lessons.map((lesson) => {
      const context = buildLessonContext(lesson, snapshot.droplet);
      return [
        `## ${slug}, lesson ${lesson.id} (${context.format}${context.trimmed ? ", trimmed" : ""})`,
        fenced(context.text),
        ...choiceQuestionIds(lesson).map((id) => questionMarkdown(lesson, id)),
      ].join("\n\n");
    }),
  );
  return ["# Fixture lessons, for drafting cases", ...sections].join("\n\n");
}

function caseSection({ case: c, lesson, context, ask, learner }: CaseFacts) {
  const gold = resolveGold(context, c.gold ?? []).map(
    ({ snippet, passages: [p] }) =>
      `- "${snippet}" is in ${p.ref}\n\n${quoted(p.markdown)}`,
  );
  const questionId =
    ask.kind === "quiz-hint" ? ask.question.questionId : c.questionId;
  const pick = ask.kind === "quiz-hint" ? ask.chosenOptionId : undefined;
  return [
    `## ${c.id}`,
    `${c.kind}, ${c.input.kind}. Fixture \`${c.fixture}\`, lesson ${c.lessonId} "${lesson.name}" (${c.format}). Tags: ${c.tags.join(", ") || "none"}`,
    c.note && `_${c.note}_`,
    learner && `Learner: \`${learner.name}\`\n\n${fenced(learner.text)}`,
    fenced(JSON.stringify(c.input, null, 2), "json"),
    gold.length && `Gold:\n\n${gold.join("\n\n")}`,
    ask.kind === "explain" && `Selection's refs: ${ask.refs.join(", ")}`,
    questionId !== undefined && questionMarkdown(lesson, questionId, pick),
    c.canary && `Canary:\n\n${fenced(c.canary)}`,
    c.forbidden && `Forbidden: ${c.forbidden}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** cases.md, Brady's review copy: counts, then every case with its gold and answers */
export function casesMarkdown(cases: EvalCase[], fixtures: Fixtures): string {
  const kinds = [...CASE_KINDS, "all"].map((kind) => {
    const ofKind = cases.filter((c) => kind === "all" || c.kind === kind);
    const n = (format: string) =>
      ofKind.filter((c) => c.format === format).length;
    return [kind, n("classic"), n("blocknote"), ofKind.length];
  });
  return [
    "# Mentor eval cases",
    "Generated by `npx tsx scripts/mentor/cases.ts` from `cases.jsonl`: edit that file, not this one. Claude Opus 5.5 drafted the cases; it isn't one of the models under test. The right answers shown here are for review only and are never sent to the model.",
    table(["Kind", "Classic", "BlockNote", "All"], kinds),
    ...cases.map((c) => caseSection(factsFor(c, fixtures))),
  ].join("\n\n");
}
