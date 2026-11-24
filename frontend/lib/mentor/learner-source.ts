import "server-only";
import {
  recentMisses,
  toLearnerContext,
  type LearnerContext,
} from "@/lib/mentor/learner";
import { getLearnerEnrollments } from "@/lib/requests/learner-enrollments";
import { getRecentQuizAttempts } from "@/lib/requests/quiz-attempts-recent";
import type { MentorSource } from "./source";

/** Whether the student allows personalization; false until ODY-935 swaps this body or re-exports its function. */
export async function studentAllowsPersonalization(
  _userId: number,
): Promise<boolean> {
  return false;
}

/**
 * The learner context for one student in one droplet, or null when the fetch
 * fails (the caller then sends the plain request). `userId` comes from the
 * session only.
 */
export async function getLearnerContext(
  userId: number,
  droplet: Pick<MentorSource["droplet"], "id" | "prerequisites">,
): Promise<LearnerContext | null> {
  try {
    const [rows, attempts] = await Promise.all([
      getLearnerEnrollments(userId),
      getRecentQuizAttempts(userId),
    ]);
    const context = toLearnerContext(rows, droplet);
    // A failed attempts fetch only leaves the line out
    const recentlyMissed = attempts ? recentMisses(attempts) : [];
    return recentlyMissed.length ? { ...context, recentlyMissed } : context;
  } catch (e) {
    console.warn("mentor learner context failed", (e as Error).message);
    return null;
  }
}
