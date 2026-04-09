import { getCurrentUser } from "@/lib/auth/session";
import { EnrolledDropletsGrid } from "./enrolled-droplets-grid";
import { UserPlaylistsGrid } from "./user-playlists-grid";
import { ArchivedDropletsGrid } from "./archived-droplets-grid";
import {
  getCachedUserDashboardFull,
  getCachedUserGroups,
} from "@/lib/requests/cached";
import { notFound } from "next/navigation";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { UserGroups } from "./user-groups";
import { FavoriteDropletsGrid } from "./favorited-droplet-grid";
import { ArchivedPlaylistsGrid } from "./archived-playlists-grid";

export async function MyContent({
  searchParams,
  sortKey,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
  sortKey?: string;
}) {
  const contentType = (await searchParams)?.contentType || "droplets";
  const type = (await searchParams)?.type;
  const focusArea = (await searchParams)?.focusArea;
  const difficulty = (await searchParams)?.difficulty;
  const tags = (await searchParams)?.tags;
  const user = await getCurrentUser();

  if (!user || !user.email) {
    return notFound();
  }

  const authorizedUser = await getCachedUserDashboardFull(user.email);
  const allGroups = (await getCachedUserGroups(authorizedUser.id)).filter(
    (group) => group.members?.some((member) => member.id === authorizedUser.id),
  );
  const activeGroups = allGroups.filter(
    (group) =>
      !group.users_archived?.some((user) => user.id === authorizedUser.id) &&
      !group.isArchived,
  );
  const archivedGroups = allGroups.filter((group) =>
    group.users_archived?.some((user) => user.id === authorizedUser.id),
  );

  return (
    <div className="w-full">
      <div className="mt-6">
        {contentType === "droplets" ? (
          <EnrolledDropletsGrid
            sortKey={sortKey}
            tags={tags}
            type={type}
            focusArea={focusArea}
            difficulty={difficulty}
          />
        ) : contentType === "playlists" ? (
          <UserPlaylistsGrid sortKey={sortKey} />
        ) : contentType === "groups" ? (
          <>
            {activeGroups.length === 0 && (
              <Message className="mb-8">
                <MessageHeader
                  subtitle="No Results"
                  title="No Enrolled Groups"
                />
                <MessageDescription>
                  You haven&apos;t enrolled in any Groups yet.
                </MessageDescription>
              </Message>
            )}
            <UserGroups
              activeGroups={activeGroups}
              isArchived={false}
              sortKey={sortKey}
            />
          </>
        ) : contentType === "archived" ? (
          <>
            <div className="pb-2 text-xl font-bold">Droplets</div>
            <ArchivedDropletsGrid sortKey={sortKey} />
            <hr className="pb-2" />
            <div className="pb-2 text-xl font-bold">Playlists</div>
            <ArchivedPlaylistsGrid sortKey={sortKey} />
            <hr className="pb-2" />
            <div className="pb-2 text-xl font-bold">Groups</div>
            {archivedGroups.length === 0 && (
              <Message className="mb-8">
                <MessageHeader
                  subtitle="No Results"
                  title="No Archived Groups"
                />
                <MessageDescription>
                  You haven&apos;t archived any Groups yet.
                </MessageDescription>
              </Message>
            )}
            <UserGroups
              activeGroups={archivedGroups}
              isArchived={true}
              sortKey={sortKey}
            />
          </>
        ) : contentType === "favorited" ? (
          <FavoriteDropletsGrid sortKey={sortKey} />
        ) : null}
      </div>
    </div>
  );
}
