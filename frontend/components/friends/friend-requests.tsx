import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { FriendRequestBlock } from "./friend-request-block";
import { fetchFriendRequests, fetchFriends } from "@/lib/requests/friends";

export async function FriendRequests() {
  const authorizedUsers = await fetchFriends();

  return (
    <section>
      <h1 className="font-bold">Friend Requests</h1>
      <p>A list of users who have sent you friend requests.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {authorizedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {authorizedUsers.map((user) => (
              <FriendRequestBlock user={user} key={user.id} />
            ))}
          </ul>
        ) : (
          <p>There are no friend requests.</p>
        )}
      </div>
    </section>
  );
}
