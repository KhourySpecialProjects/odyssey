import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FeedContainer } from "@/components/feed/feed-container";
import { FeedCenterContent } from "@/components/feed/feed-center-content";
import { DropletFiltersButton } from "@/components/feed/droplet-filters-button";
import { MyContent } from "@/components/dashboard/my-content";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Sort } from "@/components/explore/sort";
import { Search } from "@/components/explore/search";
import { SearchProvider } from "@/contexts/SearchContext";
import { getCurrentUser } from "@/lib/auth/session";
import { defaultSort, playlistSorting, sorting } from "@/lib/globals";
import { getCachedUserSocial } from "@/lib/requests/cached";
import { getTags } from "@/lib/requests/tag";

export const metadata: Metadata = {
  title: "Feed",
  description: "Your personalized feed and content dashboard.",
};

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const DASHBOARD_TABS = new Set([
  "droplets",
  "playlists",
  "voyages",
  "groups",
  "archived",
  "favorited",
]);

const TAB_LABELS: Record<string, string> = {
  droplets: "Droplets",
  playlists: "Playlists",
  voyages: "Voyages",
  groups: "Groups",
  archived: "Archived",
  favorited: "Favorited",
};

const TAB_DESCRIPTIONS: Record<string, string> = {
  droplets: "View and manage your enrolled droplets.",
  playlists: "View and manage your saved playlists.",
  voyages: "View and manage your learning voyages.",
  groups: "View and manage your groups.",
  archived: "View and manage your archived content.",
  favorited: "View and manage your favorited droplets.",
};

export default async function FeedPage({ searchParams }: Props) {
  const params = await searchParams;
  const rawTab = (params?.tab as string) || "feed";
  const tab = DASHBOARD_TABS.has(rawTab) || rawTab === "feed" ? rawTab : "feed";
  const isFeedTab = !DASHBOARD_TABS.has(tab);

  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();

  const { sort } = (params || {}) as { [key: string]: string };
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;

  // Fetch tags for the combined filters button (only needed on droplets tab)
  const tagOptions =
    tab === "droplets"
      ? await getTags({ populate: { droplets: { fields: ["id"] } } }).then(
          (tags) =>
            tags
              .filter((t) =>
                t.droplets?.some(
                  (d) => !d.isHidden && d.status === "published",
                ),
              )
              .map((t) => ({ label: t.name, value: t.slug })),
        )
      : [];

  return (
    <div className="w-full">
      <FeedContainer authUser={authUser} isFeedTab={isFeedTab}>
        {isFeedTab ? (
          <FeedCenterContent authUser={authUser} />
        ) : (
          <SearchProvider>
            <div className="px-4 py-6 md:px-8">
              {/* Page header */}
              <div className="mb-6">
                <h1 className="text-3xl font-semibold text-black dark:text-white">
                  {TAB_LABELS[tab]}
                </h1>
                <p className="mt-1 text-sm text-[#475569] md:text-base dark:text-slate-400">
                  {TAB_DESCRIPTIONS[tab] || "View and manage your content."}
                </p>
              </div>

              {/* Search + filters row */}
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center">
                <Search />
                <div className="flex flex-1 flex-row flex-wrap items-center justify-end gap-2">
                  {tab === "droplets" ? (
                    <DropletFiltersButton
                      sortOptions={sorting}
                      defaultSort={defaultSort}
                      tagOptions={tagOptions}
                    />
                  ) : (
                    <Sort
                      options={playlistSorting}
                      defaultValue={defaultSort}
                    />
                  )}
                </div>
              </div>

              {/* Content grid */}
              <Suspense fallback={<DropletsSkeleton />}>
                <MyContent
                  searchParams={{ ...params, contentType: tab }}
                  sortKey={sortKey}
                />
              </Suspense>
            </div>
          </SearchProvider>
        )}
      </FeedContainer>
    </div>
  );
}
