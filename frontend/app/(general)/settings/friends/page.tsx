import { Droplets } from "@/components/admin/droplets/droplets";
import { Playlists } from "@/components/admin/playlists/playlists";
import { Reports } from "@/components/admin/reports/reports";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { FriendRequests } from "@/components/friends/friend-requests";
import { FriendSuggestions } from "@/components/friends/friend-suggestions";
import { Friends } from "@/components/friends/friends";
import { AuthorDroplets } from "@/components/settings/author-droplets";
import { BioCard } from "@/components/settings/bio-card";
import { AdminSelector } from "@/components/shared/selector";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorByAuthorizedUserEmail } from "@/lib/requests/author";
import { getInitials } from "@/lib/utils";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  fetchAuthorizedUsers,
  getAuthorizedUserByEmail,
} from "@/lib/requests/authorized-user";
import { FriendSentRequests } from "@/components/friends/friend-sent-requests";
import { FriendSearch } from "@/components/friends/friend-search";
import { getSentRequest, getSentRequestIds, fetchFriends } from "@/lib/requests/friends";

export default async function AuthorProfileSettings() {
  const authorizedUsers = await fetchAuthorizedUsers();

  const user = await getCurrentUser();
  if (!user?.email) return notFound();

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  if (!authorizedUser) return notFound();

  const sentRequests = await getSentRequestIds(authorizedUser);
  const friends = (await fetchFriends(authorizedUser)).map((user) => user.id);

  const requestedAuthUsers = authorizedUsers.filter((user) => !sentRequests.includes(user.id)).map((user) => user.id);
  const friendedAuthUsers = authorizedUsers.filter((user) => !friends.includes(user.id)).map((user) => user.id);

  return (
    <div>
      <FriendSearch
        authUsers={authorizedUsers}
        curUser={authorizedUser}
        requestIds={requestedAuthUsers}
        friendIds={friendedAuthUsers}
      ></FriendSearch>

      <AdminSelector
        content={{
          Friends: <Friends />,
          "Friend Requests": <FriendRequests />,
          "People You May Know": <FriendSuggestions user={authorizedUser} />,
          "Sent Requests": <FriendSentRequests />,
        }}
      />
    </div>
  );
}
