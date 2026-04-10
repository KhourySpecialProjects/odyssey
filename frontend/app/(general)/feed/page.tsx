import { Metadata } from "next";
import { FeedContainer } from "@/components/feed/feed-container";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";

export const metadata: Metadata = {
  title: "Feed",
  description: "Displays a user's feed.",
};
export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();

  return (
    <div className="w-full">
      <FeedContainer authUser={authUser} />
    </div>
  );
}
