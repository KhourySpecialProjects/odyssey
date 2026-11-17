import "server-only";
import { toLearnerContext, type LearnerContext } from "@/lib/mentor/learner";
import { getLearnerEnrollments } from "@/lib/requests/learner-enrollments";
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
    return toLearnerContext(await getLearnerEnrollments(userId), droplet);
  } catch {
    return null;
  }
}
