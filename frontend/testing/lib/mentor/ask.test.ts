import { blockNoteIdToNumber } from "@/lib/blocknote/convert-blocks";
import { correctOptionIds } from "@/lib/mentor/answer-key";
import { resolveMentorAsk } from "@/lib/mentor/ask";
import { buildLessonContext } from "@/lib/mentor/context";
import { findQuizQuestion } from "@/lib/mentor/quiz";
import type { MentorInput, MentorLesson } from "@/lib/mentor/types";
import {
  blockNoteLesson,
  classicLesson,
  mentorDroplet,
} from "@/testing/mocks/mentorLessonMock";

// Classic: question 41 has 3 options with 411 right, 42 two options, 43 two
// right answers. BlockNote: mc-1's options are 1300–1302 with 1300 right.
const MC = blockNoteIdToNumber("mc-1");
const TF = blockNoteIdToNumber("tf-1");

const resolve = (lesson: MentorLesson, input: MentorInput) =>
  resolveMentorAsk(lesson, buildLessonContext(lesson, mentorDroplet), input);
const hint = (questionId: number, ...answerIds: number[]): MentorInput => ({
  kind: "quiz-hint",
  questionId,
  answerIds,
});

describe("resolveMentorAsk", () => {
  it.each([
    [
      "a question",
      blockNoteLesson(),
      { kind: "lesson", message: "Why?" },
      { kind: "lesson", message: "Why?", history: [] },
    ],
    [
      "a selection in one passage",
      blockNoteLesson(),
      { kind: "explain", selection: "An index speeds up reads" },
      {
        kind: "explain",
        selection: "An index speeds up reads",
        refs: ["p2"],
        history: [],
      },
    ],
    [
      "a selection across two",
      blockNoteLesson(),
      { kind: "explain", selection: "reads. It costs writes" },
      {
        kind: "explain",
        selection: "reads. It costs writes",
        refs: ["p2", "p3"],
        history: [],
      },
    ],
    [
      "a wrong pick",
      classicLesson(),
      hint(41, 413),
      {
        kind: "quiz-hint",
        question: findQuizQuestion(classicLesson(), 41),
        chosenOptionId: 413,
      },
    ],
    [
      "a wrong pick in a BlockNote lesson",
      blockNoteLesson(),
      hint(MC, 1302),
      {
        kind: "quiz-hint",
        question: findQuizQuestion(blockNoteLesson(), MC),
        chosenOptionId: 1302,
      },
    ],
  ] as const)("resolves %s", (_, lesson, input, ask) => {
    expect(resolve(lesson, input as MentorInput)).toEqual({ ok: true, ask });
  });

  it.each([
    [
      "text that isn't in the lesson",
      blockNoteLesson(),
      { kind: "explain", selection: "Not in it" },
      "selection_not_found",
    ],
    [
      "an unknown question",
      classicLesson(),
      hint(999, 1),
      "question_not_found",
    ],
    [
      "a selection of a quiz option",
      classicLesson(),
      { kind: "explain", selection: "All rows from the left table" },
      "selection_in_quiz",
    ],
    [
      "a selection running into a quiz question",
      blockNoteLesson(),
      { kind: "explain", selection: "Which index suits range" },
      "selection_in_quiz",
    ],
    // Right picks, so these can't tell a student whether the pick is right
    [
      "a question with two options",
      classicLesson(),
      hint(42, 422),
      "unsupported_question",
    ],
    [
      "a question with two right options",
      classicLesson(),
      hint(43, 431),
      "unsupported_question",
    ],
    [
      "a true/false question",
      blockNoteLesson(),
      hint(TF, 142),
      "unsupported_question",
    ],
    ["two picks", classicLesson(), hint(41, 412, 413), "invalid_answer"],
    [
      "another question's option",
      classicLesson(),
      hint(41, 421),
      "invalid_answer",
    ],
    ["the right pick", classicLesson(), hint(41, 411), "answer_correct"],
  ] as const)("refuses %s", (_, lesson, input, error) => {
    expect(resolve(lesson, input as MentorInput)).toEqual({ ok: false, error });
  });

  it("leaves out refs the budget left out of the prompt", () => {
    const lesson = blockNoteLesson();
    const context = buildLessonContext(lesson, mentorDroplet, {
      maxTokens: 200,
    });
    expect(
      resolveMentorAsk(lesson, context, {
        kind: "explain",
        selection: "Edit the query",
      }),
    ).toMatchObject({ ok: true, ask: { refs: [] } });
  });

  it("throws for another lesson's context", () => {
    const context = buildLessonContext(blockNoteLesson(), mentorDroplet);
    expect(() =>
      resolveMentorAsk(classicLesson(), context, {
        kind: "lesson",
        message: "Hi",
      }),
    ).toThrow();
  });
});

describe("correctOptionIds", () => {
  it.each([
    ["one right option", classicLesson(), 41, [411]],
    ["two", classicLesson(), 43, [431, 432]],
    ["a BlockNote question", blockNoteLesson({ mc: 2 }), MC, [1302]],
    ["an open-ended question", classicLesson(), 77, null],
  ])("%s", (_, lesson, questionId, ids) => {
    expect(correctOptionIds(lesson, questionId)).toEqual(ids);
  });
});
