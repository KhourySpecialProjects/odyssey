import { Metadata } from "next";
import { FriendRequests } from "@/components/friends/friend-requests";
import { Feed } from "@/components/feed/feed";
import { FeedFilter } from "@/components/feed/feed-filter";
import { FeedContainer } from "@/components/feed/feed-container";
import { fetchAnnouncements } from "@/lib/requests/feed";

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
  const announcements = await fetchAnnouncements();
  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-5xl font-bold">My Feed</h1>
      </div>
      <div className="flex flex-row justify-content ">
      <div className="flex justify-center w-1/4 h-200  text-center">
          <div className="w-5/6 bg-slate-100 rounded-2xl p-4">
            <FriendRequests noProfile={true}></FriendRequests>
          </div>
        </div>
          <div className="w-3/4 h-200 text-center">
          <FeedContainer announcements={announcements}/>
          </div>
      </div>
    </>
  );
}
