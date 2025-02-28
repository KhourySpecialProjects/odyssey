import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { FriendBlock } from "./friend-block";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { fetchFriends } from "@/lib/requests/friends";

export async function Friends() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(user.email);

  const friends = await fetchFriends(authUser);

  return (
    <section className="mt-4">
      <h1 className="font-bold dark:text-slate-300">Friends</h1>
      <p className="dark:text-slate-300">A list of your friends.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100 dark:bg-slate-800">
        {friends.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {friends.map((friendship) => (
              <FriendBlock
                user={authUser}
                friend={friendship}
                key={friendship.id}
              />
            ))}
          </ul>
        ) : (
          <p>You have no friends &#58;&#40;</p>
        )}
      </div>
    </section>
  );
}
