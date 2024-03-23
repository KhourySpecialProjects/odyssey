import { Filter } from "@/components/explore/filter";
import { Sort } from "@/components/explore/sort";
import { defaultSort, DROPLET_FILTERS, sorting } from "@/lib/globals";
import { Metadata } from "next";
import { Suspense } from "react";
import { DropletsGrid } from "../../../components/explore/droplets-grid";
import { DropletsSkeleton } from "../../../components/explore/droplets-skeleton";
import { Search } from "../../../components/explore/search";

export const metadata: Metadata = {
  title: "Explore",
  description: "Discover which Droplets are available on Khoury Odyssey.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const {
    sort,
    q: searchValue,
    type,
    focusArea,
  } = searchParams as { [key: string]: string };
  const { label: sortLabel } =
    sorting.find((item) => item.slug === sort) || defaultSort;
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;

  return (
    <>
      <div className="my-4 w-full max-w-5xl p-8 mx-auto text-center">
        <h1 className="text-5xl font-bold">Explore</h1>
      </div>

      <div className="mt-4 mb-8 max-w-5xl mx-auto w-full bg-slate-50 p-4 rounded-md">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex flex-col sm:flex-row flex-1 items-center gap-2">
            {DROPLET_FILTERS.map((filter) => (
              <Filter
                key={filter.name}
                name={filter.name}
                label={filter.label}
                options={filter.options}
              />
            ))}
            <Sort options={sorting} defaultValue={defaultSort} />
          </div>

          <Search />
        </div>
      </div>

      <Suspense fallback={<DropletsSkeleton />}>
        <DropletsGrid
          searchValue={searchValue}
          type={type}
          focusArea={focusArea}
          sortKey={sortKey}
        />
      </Suspense>
    </>
  );
}
