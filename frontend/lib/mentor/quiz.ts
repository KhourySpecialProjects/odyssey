import { htmlToMarkdown } from "@/lib/ai-review/serialize";
import { displayBlocksOf } from "@/lib/blocknote/convert-blocks";
import type { Block } from "@/types";
import type { MentorLesson, MentorQuizQuestion } from "./types";

// Quiz questions for Mentor (ODY-882), never with their answers. For the
// server and scripts only: the browser sends ids, not lesson text.

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
 * A multiple-choice or true/false question, found by the id the learner page
 * renders, with no answer. Null if there's none, or if two questions share
 * the id. Open-ended questions aren't looked up: in Classic lessons their
 * ids can equal a choice question's.
 */
export function findQuizQuestion(
  lesson: MentorLesson,
  questionId: number,
): MentorQuizQuestion | null {
  const found = displayBlocksOf(lesson).flatMap((block) =>
    block.__component === "droplets.quiz"
      ? (block.questions ?? []).filter((q) => q.id === questionId)
      : [],
  );
  return found.length === 1 ? quizQuestionOf(found[0]) : null;
}
