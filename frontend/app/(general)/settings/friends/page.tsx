import { FriendRequests } from "@/components/friends/friend-requests";
import { FriendSuggestions } from "@/components/friends/friend-suggestions";
import { Friends } from "@/components/friends/friends";
import { AdminSelector } from "@/components/shared/selector";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import {
  fetchAuthorizedUsers,
  getAuthorizedUserByEmail,
} from "@/lib/requests/authorized-user";
import { FriendSentRequests } from "@/components/friends/friend-sent-requests";
import { FriendSearch } from "@/components/friends/friend-search";
import { getSentRequestIds, fetchFriends } from "@/lib/requests/friends";
import { BlockedUsers } from "@/components/friends/blocked-users";
import { FriendDropdown } from "@/components/friends/friend-dropdown";

export default async function AuthorProfileSettings() {
  const authorizedUsers = await fetchAuthorizedUsers();

  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) return notFound();

  const sentRequests = await getSentRequestIds(authorizedUser);
  const friends = (await fetchFriends(authorizedUser)).map((user) => user.id);

  const requestedAuthUsers = authorizedUsers
    .filter((user) => !sentRequests.includes(user.id))
    .map((user) => user.id);
  const friendedAuthUsers = authorizedUsers
    .filter((user) => !friends.includes(user.id))
    .map((user) => user.id);

  return (
    <div className="flex flex-col">
      <FriendSearch
        authUsers={authorizedUsers}
        curUser={authorizedUser}
        requestIds={requestedAuthUsers}
        friendIds={friendedAuthUsers}
      ></FriendSearch>

      <div className="hidden md:flex md:flex-col">
        <AdminSelector
          content={{
            Friends: <Friends />,
            "Friend Requests": (
              <FriendRequests
                key={1}
                noProfile={false}
                friendsPerPage={20}
                authUser={authorizedUser}
              />
            ),
            "People You May Know": <FriendSuggestions user={authorizedUser} />,
            "Sent Requests": <FriendSentRequests />,
            "Blocked Users": <BlockedUsers />,
          }}
        />
      </div>

      <div className="flex flex-col md:hidden">
        <FriendDropdown
          content={{
            Friends: <Friends />,
            "Friend Requests": (
              <FriendRequests
                noProfile={false}
                friendsPerPage={20}
                authUser={authorizedUser}
              />
            ),
            "People You May Know": <FriendSuggestions user={authorizedUser} />,
            "Sent Requests": <FriendSentRequests />,
            "Blocked Users": <BlockedUsers />,
          }}
        />
      </div>
    </div>
  );
}
