import { displayBlocksOf } from "@/lib/blocknote/convert-blocks";
import { correctOptionIds } from "./answer-key";
import { selectionPassages } from "./context";
import { findQuizQuestion } from "./quiz";
import type {
  LessonContext,
  MentorInput,
  MentorLesson,
  MentorQuizQuestion,
  MentorTurn,
} from "./types";

// What the student is asking Mentor (ODY-885), from the ids the browser
// sends. The route (ODY-886) and the eval both go through here. For the
// server and scripts only: it reads which quiz options are right.

export type MentorAsk =
  | { kind: "lesson"; message: string; history: MentorTurn[] }
  | {
      kind: "explain";
      selection: string;
      /** The passages in the prompt that the selection is in; [] when none of them can be cited */
      refs: string[];
      history: MentorTurn[];
    }
  /** Only after the pick is checked wrong: the question holds no answer */
  | { kind: "quiz-hint"; question: MentorQuizQuestion; chosenOptionId: number };

/** Why a request can't be answered; the route gives each a 400 */
export type MentorAskError =
  /** The selected text isn't in the lesson */
  | "selection_not_found"
  /** The selection takes in a quiz question or its options: explaining an option judges it */
  | "selection_in_quiz"
  /** No choice question has this id, or two share it */
  | "question_not_found"
  /** Fewer than 3 options, or not exactly one right option */
  | "unsupported_question"
  /** Not exactly one id, or not one of this question's options */
  | "invalid_answer"
  /** The pick is right, so there's nothing to hint at */
  | "answer_correct";

export type MentorAskResult =
  | { ok: true; ask: MentorAsk }
  | { ok: false; error: MentorAskError };

const failed = (error: MentorAskError): MentorAskResult => ({
  ok: false,
  error,
});

/**
 * A request's ask, or why it can't be answered. A hint is only given on a
 * wrong pick of a question with one right answer among 3 or more options:
 * with two options, saying the pick is wrong gives the answer away. Takes
 * mentorInputSchema's parsed input, and throws for another lesson's context.
 */
export function resolveMentorAsk(
  lesson: MentorLesson,
  context: LessonContext,
  input: MentorInput,
): MentorAskResult {
  if (context.lessonId !== lesson.id) {
    throw new Error(`Context for lesson ${context.lessonId}, not ${lesson.id}`);
  }
  switch (input.kind) {
    case "lesson":
      return {
        ok: true,
        ask: {
          kind: "lesson",
          message: input.message,
          history: input.history ?? [],
        },
      };
    case "explain": {
      const passages = selectionPassages(context, input.selection);
      if (!passages) return failed("selection_not_found");
      const blocks = displayBlocksOf(lesson);
      const inQuiz = passages.some(
        (p) => blocks[p.blockIndex]?.__component === "droplets.quiz",
      );
      if (inQuiz) return failed("selection_in_quiz");
      return {
        ok: true,
        ask: {
          kind: "explain",
          selection: input.selection,
          // The model can't cite what the budget left out
          refs: passages.flatMap((p) => (p.ref && p.inPrompt ? [p.ref] : [])),
          history: input.history ?? [],
        },
      };
    }
    case "quiz-hint": {
      const question = findQuizQuestion(lesson, input.questionId);
      if (!question) return failed("question_not_found");
      const correct = correctOptionIds(lesson, input.questionId) ?? [];
      if (question.options.length < 3 || correct.length !== 1) {
        return failed("unsupported_question");
      }
      const [chosen] = input.answerIds;
      if (
        input.answerIds.length !== 1 ||
        !question.options.some((option) => option.id === chosen)
      ) {
        return failed("invalid_answer");
      }
      if (correct.includes(chosen)) return failed("answer_correct");
      return {
        ok: true,
        ask: { kind: "quiz-hint", question, chosenOptionId: chosen },
      };
    }
  }
}
