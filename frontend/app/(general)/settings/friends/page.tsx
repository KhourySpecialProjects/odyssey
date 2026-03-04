import { FriendRequests } from "@/components/friends/friend-requests";
import { FriendSuggestions } from "@/components/friends/friend-suggestions";
import { Friends } from "@/components/friends/friends";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import {
  getAuthorizedUserByEmail,
} from "@/lib/requests/authorized-user";
import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { getCachedUserSocial } from "@/lib/requests/cached";
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

  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const authorizedUser = await getCachedUserSocial(user.email);
  if (!authorizedUser) return notFound();

  const sentRequests = await getSentRequestIds(authorizedUser);
  const friends = (await fetchFriends(authorizedUser)).map((user) => user.id);

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
        curUser={authorizedUser}
        requestIds={sentRequests}
        friendIds={friends}
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
