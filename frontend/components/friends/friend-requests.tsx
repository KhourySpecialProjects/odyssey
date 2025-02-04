import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { FriendRequestBlock } from "./friend-request-block";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { FriendRequestFeedBlock } from "./friend-request-feed-block";

export async function FriendRequests({ noProfile }: { noProfile: Boolean }) {
  const user = await getCurrentUser();
  if (!user || !user?.email) return redirect("/");
  const authUser = await getAuthorizedUserByEmail(user.email);
  const friendRequests = authUser.received_requests.filter(
    (friend) =>
      !authUser.blocked.some((blockedUser) => blockedUser.id === friend.id) &&
      !authUser.was_blocked.some((blockedUser) => blockedUser.id === friend.id),
  );

  return (
    <div className="flex flex-col relative">
      <section>
        <h1 className="font-bold">Friend Requests</h1>
        <p>A list of your friend requests.</p>

        <div className="p-4 mt-4 rounded-md bg-slate-100">
          {friendRequests.length > 0 ? (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
              {noProfile
                ? friendRequests
                    .slice(0, 5)
                    .map((friendship) => (
                      <FriendRequestFeedBlock
                        user={authUser}
                        request={friendship}
                        key={friendship.id}
                      />
                    ))
                : friendRequests.map((friendship) => (
                    <FriendRequestBlock
                      user={authUser}
                      request={friendship}
                      key={friendship.id}
                    />
                  ))}
            </ul>
          ) : (
            <p>You have no friend requests</p>
          )}
        </div>
      </section>
    </div>
  );
}
