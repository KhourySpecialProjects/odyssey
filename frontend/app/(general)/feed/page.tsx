
import { defaultSort, sorting } from "@/lib/globals";
import { Metadata } from "next";
import { FriendRequests } from "@/components/friends/friend-requests";
import { Feed } from "@/components/feed/feed";
import { FeedFilter } from "@/components/feed/feed-filter";

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
      <div className="flex flex-row justify-content ">
      <div className="w-1/4 h-200 text-center">
        <FriendRequests />
        </div>
      <div className="w-1/2 h-200 text-center text-xl font-bold">
        General Feed
        <Feed />
        </div>
      <div className="w-1/4 h-200 text-center text-xl font-bold flex flex-col items-center justify-center">
        Filters
        <FeedFilter />
        </div>
      </div>
    </>
  );
}
