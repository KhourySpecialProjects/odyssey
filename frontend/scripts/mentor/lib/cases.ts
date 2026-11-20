import { displayBlocksOf } from "@/lib/blocknote/convert-blocks";
import { correctOptionIds } from "@/lib/mentor/answer-key";
import { resolveMentorAsk, type MentorAsk } from "@/lib/mentor/ask";
import { buildLessonContext, selectionPassages } from "@/lib/mentor/context";
import { findQuizQuestion } from "@/lib/mentor/quiz";
import { citedRefs } from "@/lib/mentor/refs";
import type {
  LessonContext,
  MentorKind,
  MentorLesson,
  MentorQuizQuestion,
  Passage,
} from "@/lib/mentor/types";
import {
  ASKING_KINDS,
  CASE_KINDS,
  NO_TWIN_KINDS,
  V1_KINDS,
  type CaseKind,
  type EvalCase,
  type Fixtures,
  type LearnerProfile,
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
  /** The name of the droplet the lesson belongs to */
  droplet: string;
};

/** The request modes each kind is written in */
const MODES: Record<CaseKind, MentorKind[]> = {
  covered: ["lesson", "explain"],
  uncovered: ["lesson", "explain"],
  "wrong-pick": ["quiz-hint"],
  extraction: ["lesson"],
  "off-topic": ["lesson"],
  injection: ["lesson"],
  // v2's kinds are lesson-mode chat today; 936 and 940 add their modes here
  personalized: ["lesson"],
  "invented-history": ["lesson"],
  "quiz-ask": ["lesson"],
  "quiz-grade": ["lesson"],
  review: ["lesson"],
  // 967 adds its summary mode here and rewrites the seeds' inputs
  summary: ["lesson"],
};

/** Kinds whose answer must cite the gold */
const GOLD_KINDS: CaseKind[] = ["covered", "personalized", "invented-history"];

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
      : c.kind === "extraction" ||
          c.kind === "summary" ||
          ASKING_KINDS.includes(c.kind)
        ? hintable(choiceQuestionIds(lesson))
        : [];
  if (ASKING_KINDS.includes(c.kind) && !quizzes.length)
    say("needs a lesson with a question of 3 or more options and one right");
  if (
    c.kind === "extraction" &&
    (c.questionId === undefined || !quizOf(lesson, c.questionId))
  )
    say("needs a question with 3 or more options and one right");
  if (c.kind === "injection" && !c.canary && !c.forbidden)
    say("an injection case needs a canary or forbidden");
  if (c.kind === "off-topic" && !c.forbidden)
    say("an off-topic case needs forbidden");
  const article = /^[aeiou]/.test(c.kind) ? "an" : "a";
  const needs = (field: string) =>
    say(`${article} ${c.kind} case needs ${field}`);
  if (["personalized", "invented-history", "review"].includes(c.kind)) {
    if (!c.learner) needs("a learner");
  }
  if (c.kind === "personalized" && !c.should) needs("should");
  if (
    c.should === "primer" &&
    c.profile &&
    !c.profile.prerequisites.some((p) => !p.finished)
  )
    say("a primer case needs a prerequisite with finished: false");
  if (c.kind === "summary" && !c.oracle) needs("an oracle");
  if (GOLD_KINDS.includes(c.kind) && c.kind !== "covered" && !c.gold)
    needs("gold");
  if (c.kind === "quiz-grade") {
    if (!c.verdict) needs("a verdict");
    const history = c.input.kind === "lesson" ? c.input.history ?? [] : [];
    if (history.at(-1)?.role !== "mentor")
      say("a quiz-grade case needs history ending in Mentor's question");
  }
  if (
    c.kind === "review" &&
    c.profile &&
    !c.profile.finished.some((d) => d.name === snapshot.droplet.name)
  )
    say(`the learner hasn't finished ${snapshot.droplet.name}`);
  if (typeof c.learner === "string" && !c.profile)
    say(`no learner profile ${c.learner} in fixtures/learners`);
  const titles = new Set(snapshot.lessons.map((l) => l.name));
  for (const title of c.profile?.viewedLessons ?? []) {
    if (!titles.has(title))
      say(`learner's viewed lesson "${title}" isn't a lesson of ${c.fixture}`);
  }
  const shownRefs = new Set(
    context.passages.flatMap((p) => (p.ref && p.inPrompt ? [p.ref] : [])),
  );
  const unseen = citedRefs(c.oracle ?? "").filter((r) => !shownRefs.has(r));
  if (unseen.length)
    say(`the oracle cites ${unseen.join(", ")}, which the model isn't shown`);
  if (problems.length) return { facts: null, problems };

  const explainRefs = ask.kind === "explain" ? ask.refs : [];
  const goldRefs = GOLD_KINDS.includes(c.kind)
    ? [...new Set([...gold.map((g) => g.passages[0].ref!), ...explainRefs])]
    : [];
  const learner = c.profile && {
    name: typeof c.learner === "string" ? c.learner : "inline",
    text: learnerBlock(c.profile),
  };
  return {
    facts: {
      case: c,
      lesson,
      context,
      ask,
      goldRefs,
      quizzes,
      learner,
      droplet: snapshot.droplet.name,
    },
    problems,
  };
}

/** For the runner: --check has already passed, so a problem here is a bug */
export function factsFor(c: EvalCase, fixtures: Fixtures): CaseFacts {
  const { facts, problems } = prepareCase(c, fixtures);
  if (!facts) throw new Error(`${problems.join("\n")}\nRun cases.ts --check`);
  return facts;
}

/** The question asked, wherever it's asked, whoever asks it */
export const questionKey = (c: EvalCase) =>
  `${c.fixture}:${c.lessonId}:${JSON.stringify(c.input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")}`;
/** The same input under another learner isn't a repeat */
const normalised = (c: EvalCase) =>
  `${JSON.stringify(c.learner ?? null)}:${questionKey(c)}`;

/** The profile a case asks under, as a comparable string */
const profileKey = (c: EvalCase) =>
  JSON.stringify(c.profile ?? c.learner ?? null);

/** Pairs: each `with` is another case of the same question under another profile, once; once any is written, each question under 2 or more profiles needs one */
function pairProblems(cases: EvalCase[]): string[] {
  const byId = new Map(cases.map((c) => [c.id, c]));
  const problems = cases.flatMap((c) => {
    const found: string[] = [];
    for (const [i, { with: other, expect }] of (c.pairs ?? []).entries()) {
      const b = byId.get(other);
      if (!b) found.push(`${c.id}: pair with ${other}, which doesn't exist`);
      else if (questionKey(b) !== questionKey(c))
        found.push(`${c.id}: pair with ${other}, a different question`);
      else if (profileKey(b) === profileKey(c))
        found.push(`${c.id}: pair with ${other}, the same profile`);
      if (c.pairs!.findIndex((p) => p.with === other) !== i)
        found.push(`${c.id}: pair with ${other} listed twice`);
      if (!/\bA\b/.test(expect) || !/\bB\b/.test(expect))
        found.push(`${c.id}: the expect line for ${other} must name A and B`);
    }
    return found;
  });
  const personalized = cases.filter((c) => c.kind === "personalized");
  if (!personalized.some((c) => c.pairs?.length)) return problems;
  const paired = new Set(
    personalized.flatMap((c) => (c.pairs?.length ? [questionKey(c)] : [])),
  );
  const questions = new Map<string, EvalCase[]>();
  for (const c of personalized)
    questions.set(questionKey(c), [
      ...(questions.get(questionKey(c)) ?? []),
      c,
    ]);
  for (const [key, asked] of questions) {
    if (!paired.has(key) && new Set(asked.map(profileKey)).size >= 2)
      problems.push(`${asked[0].id}: a personalized question needs a pair`);
  }
  return problems;
}

/** Every problem with each case, ids or inputs that repeat, and personalized questions asked under one profile */
export function validateCases(cases: EvalCase[], fixtures: Fixtures): string[] {
  const ids = new Set<string>();
  const inputs = new Map<string, string>();
  const problems = cases.flatMap((c) => {
    const found = prepareCase(c, fixtures).problems;
    if (ids.has(c.id)) found.unshift(`${c.id}: duplicate id`);
    const same = inputs.get(normalised(c));
    if (same) found.unshift(`${c.id}: same input as ${same}`);
    ids.add(c.id);
    inputs.set(normalised(c), c.id);
    return found;
  });
  const profiles = new Map<string, { id: string; learners: Set<string> }>();
  for (const c of cases.filter((c) => c.kind === "personalized")) {
    const asked = profiles.get(questionKey(c)) ?? {
      id: c.id,
      learners: new Set(),
    };
    asked.learners.add(JSON.stringify(c.learner ?? null));
    profiles.set(questionKey(c), asked);
  }
  for (const { id, learners } of profiles.values()) {
    if (learners.size < 2)
      problems.push(
        `${id}: asked under 1 profile; a personalized question needs 2 or more`,
      );
  }
  return [...problems, ...pairProblems(cases)];
}

/** Each case without a learner, copied under this profile as `<id>+<name>` */
export function learnerTwins(
  cases: EvalCase[],
  name: string,
  learners: Map<string, LearnerProfile>,
): EvalCase[] {
  const profile = learners.get(name);
  if (!profile)
    throw new Error(`no learner profile ${name} in fixtures/learners`);
  if (profile.prerequisites.length || profile.viewedLessons.length)
    throw new Error(
      `${name} has prerequisites or viewed lessons: a twin profile has neither`,
    );
  return cases
    .filter((c) => !c.learner && !NO_TWIN_KINDS.includes(c.kind))
    .map((c) => ({
      ...c,
      id: `${c.id}+${name}`,
      learner: name,
      profile,
      twinOf: c.id,
    }));
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
    // v2's seed minimums (ODY-941). 938, 936 and 940 raise them toward the
    // README's proposed final counts as they add cases.
    ["personalized cases", count("personalized"), 2],
    ["invented-history cases", count("invented-history"), 2],
    ["quiz-ask cases", count("quiz-ask"), 2],
    ["quiz-grade cases", count("quiz-grade"), 3],
    ["review cases", count("review"), 2],
    // ODY-968
    [
      "summary cases in classic lessons",
      count("summary", (c) => c.format === "classic"),
      2,
    ],
    [
      "summary cases in BlockNote lessons",
      count("summary", (c) => c.format === "blocknote"),
      2,
    ],
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
    // Both formats for v1's kinds; v2's seeds are too few to ask it yet
    ...V1_KINDS.flatMap((kind) =>
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
    c.should && `Should: ${c.should}`,
    ...(c.pairs ?? []).map(
      (p) => `Pair with \`${p.with}\`, expect: ${p.expect}`,
    ),
    c.contrastOracles &&
      `Contrast oracle (for --answers oracle), A reworded:\n\n${fenced(c.contrastOracles.same)}`,
    c.verdict && `Verdict: ${c.verdict}`,
    fenced(JSON.stringify(c.input, null, 2), "json"),
    c.oracle && `A reply that should pass:\n\n${fenced(c.oracle)}`,
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
