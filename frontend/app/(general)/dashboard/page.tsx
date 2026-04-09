import { FilterSelector } from "@/components/dashboard/filter-selector";
import { MyContent } from "@/components/dashboard/my-content";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Filter } from "@/components/explore/filter";
import { Search } from "@/components/explore/search";
import { Sort } from "@/components/explore/sort";
import { TagFilter } from "@/components/explore/tag-filter";
import { SearchProvider } from "@/contexts/SearchContext";
import { getCurrentUser } from "@/lib/auth/session";
import {
  defaultSort,
  DROPLET_FILTERS,
  playlistSorting,
  sorting,
} from "@/lib/globals";
import {
  getCachedUserDashboardFull,
  getCachedEnrollmentsFavorites,
  getCachedUserGroups,
  getCachedVoyageEnrollmentsByUser,
} from "@/lib/requests/cached";
import { VoyageCard } from "@/components/voyages/voyage-card";
import { notFound } from "next/navigation";
import { Suspense } from "react";

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardRoute({ searchParams }: Props) {
  const params = await searchParams;
  const { sort, contentType = "droplets" } = (await searchParams) as {
    [key: string]: string;
  };
  const user = await getCurrentUser();

  if (!user || !user.email) {
    return notFound();
  }
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;
  const authorizedUser = await getCachedUserDashboardFull(user.email);
  const archivedPlaylists = authorizedUser.playlists?.filter((playlist) =>
    playlist.users_archived?.some((user) => user.id === authorizedUser.id),
  );
  const [allEnrollments, allGroupsRaw, voyageEnrollments] = await Promise.all([
    getCachedEnrollmentsFavorites(authorizedUser.id),
    getCachedUserGroups(authorizedUser.id),
    getCachedVoyageEnrollmentsByUser(authorizedUser.id),
  ]);
  const allPlaylists = authorizedUser.playlists?.length || 0;
  const allGroups = allGroupsRaw.filter((group) =>
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
  const activeDroplets = allEnrollments.filter(
    (drop) => !drop.isArchived,
  ).length;
  const archivedDroplets = allEnrollments.length - activeDroplets;

  const favoritedDroplets = allEnrollments.filter((enrollment) =>
    enrollment.droplet.usersFavorited?.some(
      (user) => user.id === authorizedUser.id,
    ),
  ).length;

  return (
    <SearchProvider>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-[56px] md:py-8">
        <div className="mb-6">
          <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
            Dashboard
          </h1>
          <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
            View and manage your enrolled content
          </p>
        </div>

        <div className="mb-6">
          <FilterSelector
            droplets={activeDroplets}
            playlists={allPlaylists}
            groups={activeGroups.length}
            archived={
              archivedDroplets +
              archivedGroups.length +
              (archivedPlaylists?.length || 0)
            }
            favorited={favoritedDroplets}
          />
        </div>

        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center">
          <Search />
          <div className="flex flex-1 flex-row flex-wrap items-center justify-end gap-2">
            {contentType === "droplets" &&
              DROPLET_FILTERS.map((filter) => (
                <Filter
                  key={filter.name}
                  name={filter.name}
                  label={filter.label}
                  options={filter.options}
                />
              ))}
            {contentType === "droplets" && <TagFilter />}
            {contentType === "droplets" && (
              <Sort options={sorting} defaultValue={defaultSort} />
            )}
            {contentType !== "droplets" && (
              <Sort options={playlistSorting} defaultValue={defaultSort} />
            )}
          </div>
        </div>

        <div className="mb-8">
          <Suspense fallback={<DropletsSkeleton />}>
            <MyContent searchParams={params} sortKey={sortKey} />
          </Suspense>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Enrolled Voyages</h2>
          {voyageEnrollments.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No enrolled voyages yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {voyageEnrollments.map(
                (enrollment) =>
                  enrollment.voyage && (
                    <VoyageCard
                      key={enrollment.id}
                      voyage={enrollment.voyage}
                    />
                  ),
              )}
            </div>
          )}
        </div>
      </div>
    </SearchProvider>
  );
}
