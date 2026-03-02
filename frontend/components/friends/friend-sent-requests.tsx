import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { FriendSentRequestsBlock } from "./friend-sent-requests-block";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export async function FriendSentRequests() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(
    user.email,
    USER_POPULATES.social,
  );
  const sentRequests = authUser.sent_requests
    .filter(
      (friend) =>
        !authUser.blocked.some((blockedUser) => blockedUser.id === friend.id) &&
        !authUser.was_blocked.some(
          (blockedUser) => blockedUser.id === friend.id,
        ),
    )
    .sort((a, b) => a.lastName?.localeCompare(b.lastName));

  return (
    <section className="md:mt-4">
      <h1 className="font-bold">Sent Requests</h1>
      <p>A list of people you have sent friend requests to.</p>

      <div className="mt-4 rounded-md bg-slate-100 p-1 md:p-4 dark:bg-slate-800">
        {sentRequests.length > 0 ? (
          <ul className="divide-y divide-slate-200 md:space-y-4 dark:divide-slate-700">
            {sentRequests.map((friendship) => (
              <FriendSentRequestsBlock
                user={authUser}
                request={friendship}
                key={friendship.id}
              />
            ))}
          </ul>
        ) : (
          <p>You have no sent requests</p>
        )}
      </div>
    </section>
  );
}
