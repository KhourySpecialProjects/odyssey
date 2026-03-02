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
import { getCachedUserDashboard } from "@/lib/requests/cached";
import { getEnrollmentsByAuthorizedUser } from "@/lib/requests/enrollment";
import { getUserGroups } from "@/lib/requests/groups";
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
  const authorizedUser = await getCachedUserDashboard(user.email);
  const archivedPlaylists = authorizedUser.playlists?.filter((playlist) =>
    playlist.users_archived?.some((user) => user.id === authorizedUser.id),
  );
  const allEnrollments = await getEnrollmentsByAuthorizedUser(
    authorizedUser.id,
  );
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
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="light:text-slate-900 text-3xl font-bold tracking-tight sm:text-4xl">
          Dashboard
        </h1>
        <p className="light:text-slate-600 mt-4 text-lg leading-normal text-balance">
          View and manage your enrolled content
        </p>
      </div>

      <div className="mx-auto mt-4 mb-8 w-full max-w-7xl px-4 xl:p-0">
        <div className="flex flex-col gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 dark:border-slate-500 dark:bg-slate-800">
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

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-1 flex-row flex-wrap items-center gap-2">
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
            <Search />
          </div>
        </div>
      </div>

      <div className="mx-auto mb-8 w-full max-w-7xl px-4 xl:p-0">
        <Suspense fallback={<DropletsSkeleton />}>
          <MyContent searchParams={params} sortKey={sortKey} />
        </Suspense>
      </div>
    </SearchProvider>
  );
}
