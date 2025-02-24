import { DropletsGrid } from "@/components/explore/droplets-grid";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Filter } from "@/components/explore/filter";
import { Search } from "@/components/explore/search";
import { Sort } from "@/components/explore/sort";
import { TagFilter } from "@/components/explore/tag-filter";
import { defaultSort, DROPLET_FILTERS, sorting } from "@/lib/globals";
import { Metadata } from "next";
import { Suspense } from "react";
import { ContentTypeSelector } from "@/components/explore/content-type-selector";
import { PlaylistsGrid } from "@/components/explore/playlists-grid";

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
    q: searchValue,
    type,
    focusArea,
    tags,
    contentType = "droplets",
  } = (await searchParams) as { [key: string]: string };
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;
  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl" suppressHydrationWarning>
        <h1 className="text-5xl font-bold">Explore</h1>       
      </div>

      <div className="w-full px-4 mx-auto mt-4 mb-8 max-w-7xl xl:p-0">
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-slate-50 border-slate-200">
          <ContentTypeSelector />

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-row flex-wrap items-center flex-1 gap-2">
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
              <Sort options={sorting} defaultValue={defaultSort} />
            </div>
            <Search />
          </div>
        </div>
      </div>
      <div className="w-full px-4 mx-auto mb-8 max-w-7xl xl:p-0">
        {contentType === "droplets" ? (
          <Suspense fallback={<DropletsSkeleton />}>
            <DropletsGrid
              searchValue={searchValue}
              type={type}
              focusArea={focusArea}
              tags={tags}
              sortKey={sortKey}
            />
          </Suspense>
        ) : (
          <Suspense fallback={<DropletsSkeleton />}>
            <PlaylistsGrid searchValue={searchValue} sortKey={sortKey} />
          </Suspense>
        )}
      </div>
    </>
  );
}
