import { getCurrentUser } from "@/lib/auth/session";
import { needsOnboarding, splitName } from "@/lib/onboarding";
import { tagsToTopics } from "@/lib/onboarding-topics";
import { getCachedEnrollments, getCachedUser } from "@/lib/requests/cached";
import { getTags } from "@/lib/requests/tag";
import { isTimeZone } from "@/lib/time-zones";
import { OnboardingQuizHost } from "./onboarding-quiz-host";

export async function OnboardingQuizLoader() {
  try {
    const session = await getCurrentUser();
    if (!session?.email) return null;
    const user = await getCachedUser(session.email);
    if (!user) return null;

    const [enrollments, tags] = await Promise.all([
      getCachedEnrollments(user.id),
      getTags(),
    ]);
    if (!needsOnboarding(user, enrollments ?? [])) return null;

    // Prefill from the user record, else from the sign-in name.
    const fromSession = splitName(session.name);
    return (
      <OnboardingQuizHost
        topics={tagsToTopics(
          (tags ?? []).flatMap((t) =>
            t.documentId ? [{ ...t, documentId: t.documentId }] : [],
          ),
        )}
        initial={{
          firstName: user.firstName || fromSession.firstName || "",
          lastName: user.lastName || fromSession.lastName || "",
          bio: user.bio || "",
          timeZone: isTimeZone(user.timeZone) ? user.timeZone : undefined,
        }}
        user={user}
      />
    );
  } catch (error) {
    // Generic message only: errors can carry student data (FERPA).
    console.error(
      "OnboardingQuizLoader failed",
      error instanceof Error ? error.name : "unknown",
    );
    return null;
  }
}
