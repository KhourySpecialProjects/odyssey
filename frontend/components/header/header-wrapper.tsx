import { getCurrentUser } from "@/lib/auth/session";
import { AuthorizedUser } from "@/types";
import { getCachedUser } from "@/lib/requests/cached";
import { getStreakFor } from "@/lib/streak-days";
import type { Streak } from "@/lib/streaks";
import { Header } from "./index";

export async function HeaderWrapper() {
  const user = await getCurrentUser();

  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getCachedUser(user.email)) as AuthorizedUser;
  }

  // The header shows the learner's streak (ODY-919). A failed read hides
  // the pill rather than the header.
  let streak: Streak | null = null;
  if (authorizedUser?.id) {
    streak = await getStreakFor({
      id: authorizedUser.id,
      timeZone: authorizedUser.timeZone,
    }).catch(() => null);
  }

  return <Header user={user} authorizedUser={authorizedUser} streak={streak} />;
}
