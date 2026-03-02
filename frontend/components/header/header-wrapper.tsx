import { getCurrentUser } from "@/lib/auth/session";
import { AuthorizedUser } from "@/types";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { Header } from "./index";

export async function HeaderWrapper() {
  const user = await getCurrentUser();

  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
      USER_POPULATES.profile,
    )) as AuthorizedUser;
  }

  return <Header user={user} authorizedUser={authorizedUser} />;
}
