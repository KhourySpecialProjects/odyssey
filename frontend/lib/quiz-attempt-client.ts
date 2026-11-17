import { recordQuizAttempt } from "@/lib/requests/quiz-attempt";
import type { QuizAttemptInput } from "@/lib/validations/quiz-attempt";

type FireInput = Omit<
  QuizAttemptInput,
  "dropletId" | "lessonId" | "submitId"
> & {
  userId?: number;
  dropletId?: number;
  lessonId?: number;
};

/** Saves a quiz submit in the background (ODY-939); never blocks or breaks the quiz. */
export function fireQuizAttempt({ userId, ...input }: FireInput): void {
  try {
    if (!userId || !input.dropletId || !input.lessonId) return;
    void recordQuizAttempt({ ...input, submitId: crypto.randomUUID() })
      .then((result) => {
        if (!result.ok) console.warn("Quiz attempt not saved:", result.error);
      })
      .catch(console.warn);
  } catch (e) {
    console.warn(e); // a sync throw (e.g. no crypto.randomUUID) must not reach the quiz
  }
}
