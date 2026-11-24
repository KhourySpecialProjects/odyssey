import "server-only";
import { toLearnerContext, type LearnerContext } from "@/lib/mentor/learner";
import { getLearnerEnrollments } from "@/lib/requests/learner-enrollments";
import type { MentorSource } from "./source";

// ODY-935's check: fails closed, so a lookup error sends no learner block.
export { studentAllowsPersonalization } from "@/lib/mentor/personalization";

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
  } catch (e) {
    console.warn("mentor learner context failed", (e as Error).message);
    return null;
  }
}
