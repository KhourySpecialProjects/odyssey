import { Suspense } from "react";
import { DropletFiltersButton } from "./droplet-filters-button";
import { MyContent } from "@/components/dashboard/my-content";
import { DropletsSkeleton } from "@/components/explore/droplets-skeleton";
import { Sort } from "@/components/explore/sort";
import { Search } from "@/components/explore/search";
import { SearchProvider } from "@/contexts/SearchContext";
import { defaultSort, playlistSorting, sorting } from "@/lib/globals";
import { getTags } from "@/lib/requests/tag";

type ContentType =
  | "droplets"
  | "playlists"
  | "voyages"
  | "archived"
  | "favorited";

type Props = {
  contentType: ContentType;
  searchParams: { [key: string]: string | string[] | undefined };
};

export async function ActivityTabContent({ contentType, searchParams }: Props) {
  const { sort } = searchParams as { [key: string]: string };
  const { sortKey } = sorting.find((item) => item.slug === sort) || defaultSort;

  const tagOptions =
    contentType === "droplets"
      ? await getTags({
          populate: {
            droplets: { fields: ["id", "isHidden", "status"] },
          },
        }).then((tags) =>
          tags
            .filter((t) =>
              t.droplets?.some((d) => !d.isHidden && d.status === "published"),
            )
            .map((t) => ({ label: t.name, value: t.slug })),
        )
      : [];

  return (
    <SearchProvider>
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center">
        <Search />
        <div className="flex flex-1 flex-row flex-wrap items-center justify-end gap-2">
          {contentType === "droplets" ? (
            <DropletFiltersButton
              sortOptions={sorting}
              defaultSort={defaultSort}
              tagOptions={tagOptions}
            />
          ) : (
            <Sort options={playlistSorting} defaultValue={defaultSort} />
          )}
        </div>
      </div>

      <Suspense fallback={<DropletsSkeleton />}>
        <MyContent
          searchParams={{ ...searchParams, contentType }}
          sortKey={sortKey}
        />
      </Suspense>
    </SearchProvider>
  );
}
