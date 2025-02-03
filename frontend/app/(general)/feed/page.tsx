import { Metadata } from "next";
import { FriendRequests } from "@/components/friends/friend-requests";
import { FeedContainer } from "@/components/feed/feed-container";
import { fetchAnnouncements, fetchNewestAnnouncements } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

export const metadata: Metadata = {
  title: "Feed",
  description: "Displays a user's feed.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function FeedPage() {
  const newestAnnouncements = await fetchNewestAnnouncements();
  const announcements = await fetchAnnouncements();
  const user = await getCurrentUser();
  let authorizedUser = null;

  if (user?.email) {
    try {
      authorizedUser = await getAuthorizedUserByEmail(user.email);
    } catch (error) {
      console.error("Error fetching authorized user:", error);
    }
  }
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
          <FeedContainer announcements={announcements} newestAnnouncements={newestAnnouncements}/>
          </div>
      </div>
    </>
  );
}
