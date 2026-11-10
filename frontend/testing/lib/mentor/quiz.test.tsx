import { render } from "@testing-library/react";
import { QuizQuestionBlock } from "@/components/droplets/lessons/quiz-question";
import { findQuizQuestion } from "@/lib/mentor/quiz";
import {
  blockNoteIdToNumber,
  displayBlocksOf,
} from "@/lib/blocknote/convert-blocks";
import type { MentorLesson } from "@/lib/mentor/types";
import {
  blockNoteLesson,
  classicLesson,
} from "@/testing/mocks/mentorLessonMock";

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));

const choiceQuestions = (lesson: MentorLesson) =>
  displayBlocksOf(lesson).flatMap((block) =>
    block.__component === "droplets.quiz" ? block.questions : [],
  );

describe("findQuizQuestion", () => {
  // The page's ids: Classic options keep theirs; BlockNote's are made from the
  // block's index, 13 for the multiple choice and 14 for the true/false
  it.each([
    [
      "Classic, three options",
      classicLesson(),
      classicLesson({ mc: 413 }),
      41,
      [411, 412, 413],
    ],
    [
      "Classic, two options",
      classicLesson(),
      classicLesson({ yesNo: 421 }),
      42,
      [421, 422],
    ],
    [
      "Classic, two correct",
      classicLesson(),
      classicLesson({ multi: [433] }),
      43,
      [431, 432, 433],
    ],
    [
      "BlockNote multiple choice",
      blockNoteLesson(),
      blockNoteLesson({ mc: 2 }),
      blockNoteIdToNumber("mc-1"),
      [1300, 1301, 1302],
    ],
    [
      "BlockNote true/false",
      blockNoteLesson(),
      blockNoteLesson({ trueFalse: true }),
      blockNoteIdToNumber("tf-1"),
      [141, 142],
    ],
  ])(
    "%s: the option ids the page renders, whichever is correct",
    (_, lesson, flipped, questionId, ids) => {
      const found = findQuizQuestion(lesson, questionId);
      expect(found?.options.map((o) => o.id)).toEqual(ids);
      expect(findQuizQuestion(flipped, questionId)).toEqual(found);
    },
  );

  // Radio buttons for one correct option, checkboxes for several
  it.each(
    [classicLesson(), blockNoteLesson()].flatMap((lesson) =>
      choiceQuestions(lesson).map(
        (question) => [lesson.name, question.id, lesson, question] as const,
      ),
    ),
  )(
    "%s, question %i: the values the page's options submit",
    (_, id, lesson, question) => {
      const { container } = render(
        <QuizQuestionBlock question={question} lessonId={lesson.id} />,
      );
      const values = Array.from(
        container.querySelectorAll('[role="radio"], [role="checkbox"]'),
        (option) => option.getAttribute("value"),
      );
      expect(values).toEqual(
        findQuizQuestion(lesson, id)!.options.map((o) => String(o.id)),
      );
    },
  );

  it("gives the question and options as Markdown, and nothing else", () => {
    expect(findQuizQuestion(classicLesson(), 41)).toEqual({
      questionId: 41,
      question: "What does a LEFT JOIN keep?",
      options: [
        { id: 411, text: "All rows from the left table" },
        { id: 412, text: "Only matching rows" },
        { id: 413, text: "Only *unmatched* rows" },
      ],
    });
  });

  const shared = classicLesson();
  shared.blocks!.push({
    __component: "droplets.quiz",
    questions: [{ id: 41, content: "Again?", answerOptions: [] }],
  });

  it.each([
    ["an unknown id", classicLesson(), 999],
    ["a Classic open-ended question", classicLesson(), 77],
    [
      "a BlockNote open-ended question",
      blockNoteLesson(),
      blockNoteIdToNumber("oe-1"),
    ],
    ["an id two questions share", shared, 41],
  ])("gives null for %s", (_, lesson, questionId) => {
    expect(findQuizQuestion(lesson, questionId)).toBeNull();
  });
});
