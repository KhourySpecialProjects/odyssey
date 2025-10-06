import { getCurrentUser } from "@/lib/auth/session";
import { AuthorizedUser } from "@/types";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { Header } from "./index";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";

export async function HeaderWrapper() {
  const user = await getCurrentUser();
  const session = await getServerSession(authOptions);

  let authorizedUser: AuthorizedUser | null = null;
  if (session?.isAuthorized && user?.email) {
    authorizedUser = (await getAuthorizedUserByEmail(
      user.email,
    )) as AuthorizedUser;
  }

  return <Header user={user} authorizedUser={authorizedUser} />;
}
