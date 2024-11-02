import { DropletsGrid } from "@/components/explore/droplets-grid";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Filter } from "@/components/explore/filter";
import { Search } from "@/components/explore/search";
import { Sort } from "@/components/explore/sort";
import { TagFilter } from "@/components/explore/tag-filter";
import { defaultSort, DROPLET_FILTERS, sorting } from "@/lib/globals";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Explore Droplets",
  description: "Discover which Droplets are available on Khoury Odyssey.",
};

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
  } = (await searchParams) as { [key: string]: string };
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;

  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-5xl font-bold">Explore Droplets</h1>
      </div>

      <div className="w-full px-4 mx-auto mt-4 mb-8 max-w-7xl xl:p-0">
        <div className="flex flex-col gap-2 p-4 border rounded-md bg-slate-50 md:flex-row md:items-center border-slate-200">
          <div className="flex flex-row flex-wrap items-center flex-1 gap-2">
            {DROPLET_FILTERS.map((filter) => (
              <Filter
                key={filter.name}
                name={filter.name}
                label={filter.label}
                options={filter.options}
              />
            ))}
            <TagFilter />
            <Sort options={sorting} defaultValue={defaultSort} />
          </div>

          <Search />
        </div>
      </div>

      <div className="w-full px-4 mx-auto mb-8 max-w-7xl xl:p-0">
        <Suspense fallback={<DropletsSkeleton />}>
          <DropletsGrid
            searchValue={searchValue}
            type={type}
            focusArea={focusArea}
            tags={tags}
            sortKey={sortKey}
          />
        </Suspense>
      </div>
    </>
  );
}
