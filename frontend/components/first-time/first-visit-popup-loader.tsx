import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { FirstVisitPopup } from "./first-visit-popup";

export async function FirstVisitPopupLoader() {
  const user = await getCurrentUser();
  if (!user?.email) return null;

  let authorizedUser = null;
  try {
    authorizedUser = await getCachedUser(user.email);
  } catch (error) {
    console.error("Error fetching authorized user:", error);
  }

  return <FirstVisitPopup user={authorizedUser} />;
}
