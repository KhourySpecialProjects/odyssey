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
        <p className="mt-4 text-lg leading-normal light:text-slate-600 text-balance hidden lg:block">
          Check out what&apos;s happening right now
        </p>
      </div>
      <div className="w-full px-4 sm:px-16">
        <FeedContainer announcements={announcements} authUser={authUser} />
      </div>
    </>
  );
}
