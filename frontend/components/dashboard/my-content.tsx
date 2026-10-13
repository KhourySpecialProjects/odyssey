import { getCurrentUser } from "@/lib/auth/session";
import { EnrolledDropletsGrid } from "./enrolled-droplets-grid";
import { UserPlaylistsGrid } from "./user-playlists-grid";
import { ArchivedDropletsGrid } from "./archived-droplets-grid";
import {
  getCachedUserDashboardFull,
  getCachedUserGroups,
  getCachedVoyageEnrollmentsByUser,
} from "@/lib/requests/cached";
import { notFound } from "next/navigation";
import { UserGroups } from "./user-groups";
import { EmptyState } from "@/components/ui/empty-state";
import { IconUsers, IconArchive, IconMap } from "@tabler/icons-react";
import { FavoriteDropletsGrid } from "./favorited-droplet-grid";
import { ArchivedPlaylistsGrid } from "./archived-playlists-grid";
import { ArchivedVoyagesGrid } from "./archived-voyages-grid";
import { VoyageCard } from "@/components/voyages/voyage-card";

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
      !group.users_archived?.some((user) => user.id === authorizedUser.id),
  );
  const archivedGroups = allGroups.filter((group) =>
    group.users_archived?.some((user) => user.id === authorizedUser.id),
  );

  const voyageEnrollments = await getCachedVoyageEnrollmentsByUser(
    authorizedUser.id,
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
              <EmptyState
                icon={
                  <IconUsers
                    className="h-7 w-7 text-[#475569] dark:text-slate-400"
                    stroke={1.5}
                  />
                }
                title="No enrolled groups"
                message="You haven't enrolled in any groups yet."
                className="min-h-[calc(100vh-var(--header-h)-196px)]"
              />
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
            <div className="mt-6 pb-2 text-xl font-bold">Playlists</div>
            <ArchivedPlaylistsGrid sortKey={sortKey} />
            <div className="mt-6 pb-2 text-xl font-bold">Voyages</div>
            <ArchivedVoyagesGrid />
            <div className="mt-6 pb-2 text-xl font-bold">Groups</div>
            {archivedGroups.length === 0 && (
              <EmptyState
                icon={
                  <IconArchive
                    className="h-7 w-7 text-[#475569] dark:text-slate-400"
                    stroke={1.5}
                  />
                }
                title="No archived groups"
                message="You haven't archived any groups yet."
              />
            )}
            <UserGroups
              activeGroups={archivedGroups}
              isArchived={true}
              sortKey={sortKey}
            />
          </>
        ) : contentType === "voyages" ? (
          voyageEnrollments.filter((e) => e.voyage).length === 0 ? (
            <EmptyState
              icon={
                <IconMap
                  className="h-7 w-7 text-[#475569] dark:text-slate-400"
                  stroke={1.5}
                />
              }
              title="No enrolled voyages"
              message="You haven't enrolled in any voyages yet."
              className="min-h-[calc(100vh-var(--header-h)-196px)]"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {voyageEnrollments
                .filter((e) => e.voyage)
                .map((enrollment) => (
                  <VoyageCard key={enrollment.id} voyage={enrollment.voyage!} />
                ))}
            </div>
          )
        ) : contentType === "favorited" ? (
          <FavoriteDropletsGrid sortKey={sortKey} />
        ) : null}
      </div>
    </div>
  );
}
