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
import {
  getSentRequestIds,
  fetchFriends,
  fetchSuggestionsById,
} from "@/lib/requests/friends";
import { BlockedUsers } from "@/components/friends/blocked-users";
import { ComponentDropdown } from "@/components/friends/component-dropdown";

export default async function AuthorProfileSettings({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const selectedTab = (await searchParams).tab;

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

  const friendsList = await fetchFriends(authorizedUser);
  const friendsLength = friendsList.length;
  const friendRequestsLength = authorizedUser.sent_requests.length;
  const friendReceivedRequestsLength = authorizedUser.received_requests.length;
  const friendBlockedLength = authorizedUser.blocked.length;
  const friendSuggestionsLength = await (
    await fetchSuggestionsById(authorizedUser.id)
  ).length;

  const content = {
    [`Friends (${friendsLength})`]: <Friends />,
    [`Friend Requests (${friendReceivedRequestsLength})`]: (
      <FriendRequests
        noProfile={false}
        friendsPerPage={20}
        authUser={authorizedUser}
      />
    ),
    [`People You May Know (${friendSuggestionsLength})`]: (
      <FriendSuggestions user={authorizedUser} />
    ),
    [`Sent Requests (${friendRequestsLength})`]: <FriendSentRequests />,
    [`Blocked Users (${friendBlockedLength})`]: <BlockedUsers />,
  };

  return (
    <div className="flex flex-col">
      <FriendSearch
        authUsers={authorizedUsers}
        curUser={authorizedUser}
        requestIds={requestedAuthUsers}
        friendIds={friendedAuthUsers}
      ></FriendSearch>

      <div className="hidden md:flex md:flex-col">
        <AdminSelector content={content} initialTab={selectedTab}/>
      </div>

      <div className="flex flex-col md:hidden">
        <ComponentDropdown content={content} />
      </div>
    </div>
  );
}
