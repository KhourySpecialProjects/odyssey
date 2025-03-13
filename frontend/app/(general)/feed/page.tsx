import { Metadata } from "next";
import { FriendRequests } from "@/components/friends/friend-requests";
import { FeedContainer } from "@/components/feed/feed-container";
import { notFound } from "next/navigation";
import { fetchAnnouncements } from "@/lib/requests/feed";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

export const metadata: Metadata = {
  title: "Feed",
  description: "Displays a user's feed.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(user.email);
  const announcements = await fetchAnnouncements(authUser);

  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-5xl font-bold">My Feed</h1>
      </div>
      <div className="flex flex-row items-start gap-4 px-4">
        <div className="flex justify-center w-1/4 text-center">
          <div className="dark:bg-slate-800 bg-slate-100 rounded-md p-4">
            <FriendRequests
              noProfile={true}
              friendsPerPage={5}
              authUser={authUser}
            ></FriendRequests>
          </div>
        </div>
        <div className="w-3/4 text-center">
          <FeedContainer announcements={announcements} />
        </div>
      </div>
    </>
  );
}
