import type { AuthorizedUser, Enrollment } from "@/types";

/** The welcome droplet; finishing it doesn't count as having learned something. */
export const INTRO_DROPLET_ID = 43;

/** True for students who haven't done the quiz and have no completed droplet besides the welcome one. */
export function needsOnboarding(
  user: Pick<AuthorizedUser, "onboardedAt">,
  enrollments: Pick<Enrollment, "isComplete" | "droplet">[],
): boolean {
  if (user.onboardedAt) return false;
  return !enrollments.some(
    (e) => e.isComplete && e.droplet && e.droplet.id !== INTRO_DROPLET_ID,
  );
}

/** Splits a session name ("Last, First" or "First Last") into first and last. */
export function splitName(name?: string | null): {
  firstName?: string;
  lastName?: string;
} {
  const n = name?.trim();
  if (!n) return {};
  if (n.includes(",")) {
    const [last, ...rest] = n.split(",");
    return { firstName: rest.join(",").trim(), lastName: last.trim() };
  }
  const parts = n.split(/\s+/);
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
