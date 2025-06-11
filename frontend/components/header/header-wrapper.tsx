import { getCurrentUser } from "@/lib/auth/session";
import { AuthorizedUser } from "@/types";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { Header } from "./index";

export async function HeaderWrapper() {
  const user = await getCurrentUser();
  
  let authorizedUser: AuthorizedUser | null = null;
  if (user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
  }

  return <Header user={user} authorizedUser={authorizedUser} />;
}