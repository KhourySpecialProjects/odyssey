import { DropletsGrid } from "@/components/explore/droplets-grid";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Filter } from "@/components/explore/filter";
import { Search } from "@/components/explore/search";
import { Sort } from "@/components/explore/sort";
import { TagFilter } from "@/components/explore/tag-filter";
import {
  defaultSort,
  DROPLET_FILTERS,
  playlistSorting,
  sorting,
} from "@/lib/globals";
import { Metadata } from "next";
import { Suspense } from "react";
import { ContentTypeSelector } from "@/components/explore/content-type-selector";
import { PlaylistsGrid } from "@/components/explore/playlists-grid";
import { VoyagesGrid } from "@/components/explore/voyages-grid";
import { getDroplets } from "@/lib/requests/droplet";
import { getPlaylists } from "@/lib/requests/playlist";
import { getVoyages } from "@/lib/requests/voyage";
import { SearchProvider } from "@/contexts/SearchContext";

// Fields read by DropletTile / SortedDropletsGrid. Keep in sync with those
// components; full lesson content is never needed for tiles.
const DROPLET_TILE_FIELDS = [
  "name",
  "slug",
  "type",
  "focusArea",
  "difficulty",
  "description",
  "averageRating",
  "status",
  "createdAt",
];
const DROPLET_TILE_POPULATE = {
  lessons: { fields: ["id"] },
  tags: { fields: ["name", "slug"] },
  authorized_users: { fields: ["id"] },
};

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover content on Khoury Odyssey.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const {
    sort,
    type,
    focusArea,
    tags,
    contentType = "droplets",
  } = (await searchParams) as { [key: string]: string };
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;
  const dropletFilters = {
    $and: [
      { status: { $eq: "published" } },
      { isHidden: false },
      type
        ? { $or: type.split(",").map((val) => ({ type: { $eq: val } })) }
        : {},
      focusArea
        ? {
            $or: focusArea
              .split(",")
              .map((val) => ({ focusArea: { $eq: val } })),
          }
        : {},
      tags
        ? {
            $or: tags
              .split(",")
              .map((val) => ({ tags: { slug: { $eq: val } } })),
          }
        : {},
    ],
  };
  const playlistFilters = { $and: [{ isPublic: true }] };

  // Only the active tab needs full tile data; the other tabs only feed the
  // counts in ContentTypeSelector, so they fetch ids alone.
  const [droplets, playlists, voyages] = await Promise.all([
    contentType === "droplets"
      ? getDroplets({
          filters: dropletFilters,
          fields: DROPLET_TILE_FIELDS,
          populate: DROPLET_TILE_POPULATE,
        })
      : getDroplets({ filters: dropletFilters, fields: ["id"], populate: {} }),
    contentType === "playlists"
      ? getPlaylists({
          filters: playlistFilters,
          populate: {
            droplets: {
              fields: ["id"],
              populate: { lessons: { fields: ["id"] } },
            },
            authorized_users: { fields: ["id"] },
          },
        })
      : getPlaylists({
          filters: playlistFilters,
          fields: ["id"],
          populate: {},
        }),
    getVoyages(),
  ]);

  return (
    <SearchProvider>
      <div className="mx-auto w-full max-w-7xl px-4 py-4 md:px-[56px] md:py-8">
        <div className="mb-6">
          <h1 className="text-4xl leading-tight font-semibold text-black dark:text-white">
            Explore
          </h1>
          <p className="mt-3 text-sm text-[#475569] md:text-[20px] dark:text-slate-400">
            Discover Droplets, Playlists, and Voyages
          </p>
        </div>

        <div className="mb-6">
          <ContentTypeSelector
            droplets={droplets.length}
            playlists={playlists.length}
            voyages={voyages.length}
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
            {contentType === "playlists" && (
              <Sort options={playlistSorting} defaultValue={defaultSort} />
            )}
          </div>
        </div>

        <div>
          {contentType === "droplets" ? (
            <Suspense fallback={<DropletsSkeleton />}>
              <DropletsGrid droplets={droplets} sortKey={sortKey} />
            </Suspense>
          ) : contentType === "voyages" ? (
            <Suspense fallback={<DropletsSkeleton />}>
              <VoyagesGrid voyages={voyages} />
            </Suspense>
          ) : (
            <Suspense fallback={<DropletsSkeleton />}>
              <PlaylistsGrid playlists={playlists} sortKey={sortKey} />
            </Suspense>
          )}
        </div>
      </div>
    </SearchProvider>
  );
}
