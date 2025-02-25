import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { FriendSentRequestsBlock } from "./friend-sent-requests-block";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";

export async function FriendSentRequests() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(user.email);
  const sentRequests = authUser.sent_requests.filter(
    (friend) =>
      !authUser.blocked.some((blockedUser) => blockedUser.id === friend.id) &&
      !authUser.was_blocked.some((blockedUser) => blockedUser.id === friend.id),
  );

  return (
    <section className="mt-4">
      <h1 className="font-bold">Sent Requests</h1>
      <p>A list of people you have sent friend requests to.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {sentRequests.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
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
