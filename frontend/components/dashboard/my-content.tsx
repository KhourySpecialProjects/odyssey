import { getCurrentUser } from "@/lib/auth/session";
import { ContentSelector } from "./content-selector";
import { EnrolledDropletsGrid } from "./enrolled-droplets-grid";
import { UserPlaylistsGrid } from "./user-playlists-grid";
import { ArchivedDropletsGrid } from "./archived-droplets-grid";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { notFound } from "next/navigation";
import { getUserGroups } from "@/lib/requests/groups";
import { GroupCard } from "../group/group-card";
import {
  Message,
  MessageDescription,
  MessageHeader,
} from "@/components/message";

export async function MyContent({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const tab = (await searchParams)?.tab || "droplets";
  const user = await getCurrentUser();

  if (!user || !user.email) {
    return notFound();
  }

  const authorizedUser = await getAuthorizedUserByEmail(user.email);
  const allDroplets = await getEnrollmentsByAuthorizedUser(authorizedUser.id);
  const allPlaylists = authorizedUser.playlists?.length || 0;
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
  const activeDroplets = allDroplets.filter((drop) => !drop.isArchived).length;
  const archivedDroplets = allDroplets.length - activeDroplets;

  return (
    <div className="w-full">
      <ContentSelector
        droplets={activeDroplets}
        playlists={allPlaylists}
        groups={activeGroups.length}
        archived={archivedDroplets + archivedGroups.length}
      />
      <div className="mt-6">
        {tab === "droplets" ? (
          <EnrolledDropletsGrid />
        ) : tab === "playlists" ? (
          <UserPlaylistsGrid />
        ) : tab === "groups" ? (
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
            <div className="grid grid-flow-row auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeGroups.map((group) => (
                <div key={`group-${group.id}`} className="h-full pb-2">
                  <GroupCard
                    key={group.id}
                    group={group}
                    role={"member"}
                    isArchived={false}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="pb-2 text-xl font-bold">Droplets</div>
            <ArchivedDropletsGrid />
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
            <div className="mt-4 grid grid-flow-row grid-cols-1 gap-4 sm:grid-cols-2">
              {archivedGroups.map((group) => (
                <div key={`group-${group.id}`} className="h-full pb-2">
                  <GroupCard
                    key={group.id}
                    group={group}
                    role={"member"}
                    isArchived={true}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
