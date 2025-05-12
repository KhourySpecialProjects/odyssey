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
    <div className="relative flex flex-col">
      <h1 className="font-bold">Friend Requests</h1>
      <p>A list of your friend requests.</p>
      <div className="mt-4 rounded-md bg-slate-100 p-4">
        {friendships.length > 0 ? (
          <ul className="divide-y divide-slate-200 md:space-y-4 dark:divide-slate-700">
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
