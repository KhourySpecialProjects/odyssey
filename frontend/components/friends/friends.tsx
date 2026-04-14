import { getCachedUserSocial } from "@/lib/requests/cached";
import { FriendBlock } from "./friend-block";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { fetchFriends } from "@/lib/requests/friends";
import { EmptyState } from "@/components/ui/empty-state";
import { UsersIcon } from "lucide-react";

export async function Friends() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();

  const friends = await fetchFriends(authUser);

  return (
    <section>
      {friends.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {friends.map((friendship) => (
            <FriendBlock
              user={authUser}
              friend={friendship}
              key={friendship.id}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<UsersIcon className="h-6 w-6 text-[#667085]" />}
          title="You have no friends :("
          message="Search for people to add as friends."
        />
      )}
    </section>
  );
}
