import { htmlToMarkdown } from "@/lib/ai-review/serialize";
import { displayBlocksOf } from "@/lib/blocknote/convert-blocks";
import type { Block } from "@/types";
import type { MentorLesson, MentorQuizQuestion } from "./types";

// Quiz questions for Mentor (ODY-882). findQuizQuestion never gives their
// answers; choiceQuestionById does, for answer-key.ts alone. For the server
// and scripts only: the browser sends ids, not lesson text.

/** A choice question as the learner page draws it, answers included */
export type ChoiceQuestion = Extract<
  Block,
  { __component: "droplets.quiz" }
>["questions"][number];

/**
 * The question and its options without the answer. Built field by field, so
 * a field added to quizzes later can't slip into a prompt.
 */
export function quizQuestionOf(question: ChoiceQuestion): MentorQuizQuestion {
  return {
    questionId: question.id,
    question: htmlToMarkdown(question.content),
    options: (question.answerOptions ?? []).map((option) => ({
      id: option.id,
      text: htmlToMarkdown(option.content),
    })),
  };
}

/** A choice question as the model reads it: the question, then its options */
export function quizQuestionMarkdown(question: MentorQuizQuestion): string {
  return [
    `[Quiz question] ${question.question}`,
    ...question.options.map(
      (option) => `  - ${option.text.replace(/\n/g, "\n    ")}`,
    ),
  ].join("\n");
}

/**
 * The multiple-choice or true/false question with the id the learner page
 * renders, answers included. Null if there's none, or if two questions share
 * the id. Open-ended questions aren't looked up: in Classic lessons their
 * ids can equal a choice question's.
 */
export function choiceQuestionById(
  lesson: MentorLesson,
  questionId: number,
): ChoiceQuestion | null {
  const found = displayBlocksOf(lesson).flatMap((block) =>
    block.__component === "droplets.quiz"
      ? (block.questions ?? []).filter((q) => q.id === questionId)
      : [],
  );
  return found.length === 1 ? found[0] : null;
}

/** The choice question with this page id, as choiceQuestionById finds it, with no answer */
export function findQuizQuestion(
  lesson: MentorLesson,
  questionId: number,
): MentorQuizQuestion | null {
  const question = choiceQuestionById(lesson, questionId);
  return question && quizQuestionOf(question);
}
