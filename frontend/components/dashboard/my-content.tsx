import { getCurrentUser } from "@/lib/auth/session";
import { EnrolledDropletsGrid } from "./enrolled-droplets-grid";
import { UserPlaylistsGrid } from "./user-playlists-grid";
import { ArchivedDropletsGrid } from "./archived-droplets-grid";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { notFound } from "next/navigation";
import { getUserGroups } from "@/lib/requests/groups";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";
import { UserGroups } from "./user-groups";
import { FavoriteDropletsGrid } from "./favorited-droplet-grid";

export async function MyContent({
  searchParams,
  sortKey,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
  sortKey?: string;
}) {
  const contentType = (await searchParams)?.contentType || "droplets";
  console.log(contentType);
  const type = (await searchParams)?.type;
  const focusArea = (await searchParams)?.focusArea;
  const tags = (await searchParams)?.tags;
  const user = await getCurrentUser();

  if (!user || !user.email) {
    return notFound();
  }

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const allGroups = (await getUserGroups(authorizedUser.id)).filter((group) =>
    group.members?.some((member) => member.id === authorizedUser.id),
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
        />
      ) : contentType === "playlists" ? (
        <UserPlaylistsGrid sortKey={sortKey} />
      ) : contentType === "groups" ? (
        <>
          {activeGroups.length === 0 && (
            <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
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
          <div className="pb-2 text-xl font-bold">Groups</div>
          {archivedGroups.length === 0 && (
            <Message className="mb-8 rounded-md border border-dashed border-slate-200 dark:border-slate-500 dark:bg-slate-800">
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
      ) : null}  {/* Added the final case */}
    </div>
  </div>
);
}
