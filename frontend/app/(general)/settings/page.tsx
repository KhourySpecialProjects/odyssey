import Link from "next/link";
import { SocialForms } from "@/app/(general)/settings/social-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { LearningInterests } from "@/components/settings/learning-interests";
import { getLearnerProfile } from "@/lib/learner-profile";
import { tagsToTopics, visibleInterestIds } from "@/lib/onboarding-topics";
import { getCachedUser } from "@/lib/requests/cached";
import { getTags } from "@/lib/requests/tag";
import { AuthorizedUser, LearnerProfile } from "@/types";

// Generic message only: errors can carry student data (FERPA).
const logFailure = (what: string, error: unknown) =>
  console.error(
    `Settings: ${what} failed`,
    error instanceof Error ? error.name : "unknown",
  );

export default async function Settings() {
  const user = await getCurrentUser();
  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getCachedUser(user.email)) as AuthorizedUser;
    if (!authorizedUser?.id) {
      throw new Error("Authorized user not found");
    }
  }
  if (!authorizedUser) {
    throw new Error("Authorized user not found");
  }

  const [profile, tags] = await Promise.all([
    getLearnerProfile(authorizedUser.id).catch((e) => {
      logFailure("learner profile", e);
      return null as LearnerProfile | null;
    }),
    getTags().catch((e) => {
      logFailure("tags", e);
      return null;
    }),
  ]);

  const topics = tags
    ? tagsToTopics(
        tags.flatMap((t) =>
          t.documentId ? [{ ...t, documentId: t.documentId }] : [],
        ),
      )
    : [];

  return (
    <div className="flex w-full flex-col">
      <h1 className="mb-2 text-4xl font-semibold text-black dark:text-white">
        Profile
      </h1>
      <p className="mb-8 text-base text-slate-500 dark:text-slate-400">
        Your personal profile information.
      </p>

      <SocialForms authorizedUser={authorizedUser} user={user!} />

      <p className="mt-8 text-base text-slate-900 dark:text-slate-300">
        To make changes, update your{" "}
        <Link
          href="https://nam.delve.office.com/?v=editprofile"
          className="font-medium text-[#287697] underline hover:text-[#1d5a75] dark:text-[#4AABCF]"
          target="_blank"
        >
          Northeastern profile
        </Link>
        . You may need to log out and back into Odyssey for changes to take
        effect.
      </p>

      {topics.length > 0 && (
        <LearningInterests
          topics={topics}
          initial={{
            goal: profile?.goal ?? undefined,
            focusAreas: profile?.focusAreas ?? [],
            interestTagIds: visibleInterestIds(
              profile?.interests.map((t) => t.id) ?? [],
              topics,
            ),
            interestNote: profile?.interestNote ?? undefined,
          }}
        />
      )}
    </div>
  );
}
