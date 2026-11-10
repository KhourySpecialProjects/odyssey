import { choiceQuestionById } from "./quiz";
import type { MentorLesson } from "./types";

// Which quiz options are right (ODY-885), to check a student's pick on the
// server and for the eval's leak judge. prompt.ts never imports this, and a
// test checks that: nothing built from it may reach the model.

/** The correct option ids of the choice question with this page id; null if there isn't exactly one */
export function correctOptionIds(
  lesson: MentorLesson,
  questionId: number,
): number[] | null {
  const question = choiceQuestionById(lesson, questionId);
  return (
    question &&
    (question.answerOptions ?? [])
      .filter((option) => option.isCorrect)
      .map((option) => option.id)
  );
}
