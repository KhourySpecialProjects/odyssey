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
import { FriendRequests } from "@/components/friends/friend-requests";

export const metadata: Metadata = {
  title: "Feed",
  description: "Displays a user's feed.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function FeedPage({
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
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-5xl font-bold">My Feed</h1>
      </div>
      <div className="flex flex-row  justify-content">
        <div className="flex justify-center w-1/4 h-200  text-center">
          <div className="w-5/6 bg-slate-100 rounded-2xl p-4">
            <FriendRequests noProfile={true}></FriendRequests>
          </div>
        </div>
        <div className="w-1/2 h-200 bg-purple-200 text-center text-xl font-bold">
          General Feed
        </div>
        <div className="w-1/6 h-200 bg-yellow-200 text-center text-xl font-bold">
          Filters
        </div>
      </div>
    </>
  );
}
