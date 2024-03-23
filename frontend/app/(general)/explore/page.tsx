import { Filter } from "@/components/explore/filter";
import { defaultSort, sorting } from "@/lib/globals";
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
          <div className="flex flex-col sm:flex-row flex-1 items-center">
            <Filter name="type" />
            <span className="ml-2 ">Sorting by {sortLabel}</span>
          </div>

          <Search />
        </div>
      </div>

      <Suspense fallback={<DropletsSkeleton />}>
        <DropletsGrid searchValue={searchValue} type={type} sortKey={sortKey} />
      </Suspense>
    </>
  );
}
