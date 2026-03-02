import { Metadata } from "next";
import { FeedContainer } from "@/components/feed/feed-container";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { USER_POPULATES } from "@/lib/requests/user-populates";

export const metadata: Metadata = {
  title: "Feed",
  description: "Displays a user's feed.",
};
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function FeedPage() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getAuthorizedUserByEmail(
    user.email,
    USER_POPULATES.social,
  );

  return (
    <>
      <div className="mx-auto my-4 w-full max-w-7xl p-8 text-center">
        <h1 className="text-5xl font-bold">My Feed</h1>
        <p className="light:text-slate-600 mt-2 hidden text-lg leading-normal text-balance lg:block">
          Check out what&apos;s happening right now
        </p>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-16">
        <FeedContainer authUser={authUser} />
      </div>
    </>
  );
}
