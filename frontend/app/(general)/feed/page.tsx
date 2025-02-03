import { Metadata } from "next";
import { FriendRequests } from "@/components/friends/friend-requests";
import { FeedContainer } from "@/components/feed/feed-container";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { RequestsPopupWrapper } from "@/components/friends/requests-popup-wrapper";
import { fetchAnnouncements, fetchNewestAnnouncements } from "@/lib/requests/feed";

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
  const newestAnnouncements = await fetchNewestAnnouncements();
  const announcements = await fetchAnnouncements();

  const user = await getCurrentUser();
  if (!user || !user?.email) return redirect("/");
  const authUser = await getAuthorizedUserByEmail(user.email);
  const friendRequests = authUser.received_requests.filter(
    (friend) =>
      !authUser.blocked.some((blockedUser) => blockedUser.id === friend.id) &&
      !authUser.was_blocked.some((blockedUser) => blockedUser.id === friend.id),
  );

  return (
    <>
      <div className="w-full p-8 mx-auto my-4 text-center max-w-7xl">
        <h1 className="text-5xl font-bold">My Feed</h1>
      </div>
      <div className="flex flex-row justify-content ">
        <div className="flex justify-center w-1/4 h-200  text-center">
          <div className="relative bg-slate-100 rounded-2xl p-4">
            <FriendRequests noProfile={true}></FriendRequests>

            {friendRequests.length ? (
              <div className="absolute top-[-50px] w-full">
                <RequestsPopupWrapper user={authUser} friendships={friendRequests}></RequestsPopupWrapper>
              </div>) : (
              <div></div>
            )}

          </div>
        </div>
          <div className="w-3/4 h-200 text-center">
          <FeedContainer announcements={announcements} newestAnnouncements={newestAnnouncements}/>
          </div>
      </div>
    </>
  );
}
