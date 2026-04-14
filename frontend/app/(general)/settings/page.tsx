import Link from "next/link";
import { SocialForms } from "@/app/(general)/settings/social-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { AuthorizedUser } from "@/types";

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
    </div>
  );
}
