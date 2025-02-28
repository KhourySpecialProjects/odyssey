"use client";

import { AuthorizedUser } from "@/types";
import { FriendRequestFeedBlock } from "./friend-request-feed-block";

export function RequestsPopup({
  user,
  friendships,
  showPopup,
}: {
  user: AuthorizedUser | null;
  friendships: AuthorizedUser[] | null;
  showPopup: boolean;
}) {
  if (!user || !friendships) return null;

  return (
    <div className="flex flex-col relative">
      <h1 className="font-bold dark:text-slate-300">Friend Requests</h1>
      <p className="dark:text-slate-300">A list of your friend requests.</p>
      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {friendships.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {showPopup
              ? friendships.map((friendship) => (
                  <FriendRequestFeedBlock
                    user={user}
                    request={friendship}
                    key={friendship.id}
                  />
                ))
              : friendships
                  .slice(0, 5)
                  .map((friendship) => (
                    <FriendRequestFeedBlock
                      user={user}
                      request={friendship}
                      key={friendship.id}
                    />
                  ))}
          </ul>
        ) : (
          <p>You have no friends</p>
        )}
      </div>
    </div>
  );
}
