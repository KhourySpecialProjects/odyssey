import { FriendRequests } from "@/components/friends/friend-requests";
import { FriendSuggestions } from "@/components/friends/friend-suggestions";
import { Friends } from "@/components/friends/friends";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import {
  fetchAuthorizedUsers,
  getAuthorizedUserByEmail,
} from "@/lib/requests/authorized-user";
import { USER_POPULATES } from "@/lib/requests/user-populates";
import { FriendSentRequests } from "@/components/friends/friend-sent-requests";
import { FriendSearch } from "@/components/friends/friend-search";
import {
  getSentRequestIds,
  fetchFriends,
  fetchSuggestionsById,
} from "@/lib/requests/friends";
import { BlockedUsers } from "@/components/friends/blocked-users";
import { FriendsSelector } from "@/components/friends/friends-selector";

export default async function AuthorProfileSettings({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const tab = (await searchParams)?.tab || "friends";

  const authorizedUsers = await fetchAuthorizedUsers();

  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const authorizedUser = await getAuthorizedUserByEmail(
    user.email,
    USER_POPULATES.social,
  );
  if (!authorizedUser) return notFound();

  const sentRequests = await getSentRequestIds(authorizedUser);
  const friends = (await fetchFriends(authorizedUser)).map((user) => user.id);

  const requestedAuthUsers = authorizedUsers
    .filter((user) => !sentRequests.includes(user.id))
    .map((user) => user.id);
  const friendedAuthUsers = authorizedUsers
    .filter((user) => !friends.includes(user.id))
    .map((user) => user.id);

  const friendsList = await fetchFriends(authorizedUser);
  const friendsLength = friendsList.length;
  const friendRequestsLength = authorizedUser.sent_requests.length;
  const friendReceivedRequestsLength = authorizedUser.received_requests.length;
  const friendBlockedLength = authorizedUser.blocked.length;
  const friendSuggestionsLength = await (
    await fetchSuggestionsById(authorizedUser.id)
  ).length;

  return (
    <div className="flex flex-col">
      <FriendSearch
        authUsers={authorizedUsers}
        curUser={authorizedUser}
        requestIds={requestedAuthUsers}
        friendIds={friendedAuthUsers}
      ></FriendSearch>

      <div className="flex flex-col">
        <FriendsSelector
          friends={friendsLength}
          recieved_requests={friendReceivedRequestsLength}
          suggestions={friendSuggestionsLength}
          sent_requests={friendRequestsLength}
          blocked={friendBlockedLength}
        />
        <div className="mt-6">
          {tab === "friends" ? (
            <Friends />
          ) : tab === "recieved_requests" ? (
            <FriendRequests
              noProfile={false}
              friendsPerPage={20}
              authUser={authorizedUser}
            />
          ) : tab === "suggestions" ? (
            <FriendSuggestions user={authorizedUser} />
          ) : tab === "sent_requests" ? (
            <FriendSentRequests />
          ) : (
            <BlockedUsers />
          )}
        </div>
      </div>
    </div>
  );
}
