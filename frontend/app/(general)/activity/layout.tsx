import { notFound } from "next/navigation";
import { FeedContainer } from "@/components/feed/feed-container";
import { ActivityGreeting } from "@/components/feed/activity-greeting";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUserSocial } from "@/lib/requests/cached";

export default async function ActivityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user?.email) return notFound();
  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();

  return (
    <div className="w-full">
      <FeedContainer authUser={authUser}>
        <div className="flex h-full flex-col px-4 py-6 md:px-8">
          <ActivityGreeting
            firstName={authUser.firstName}
            firstTime={authUser.firstTime}
          />
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </FeedContainer>
    </div>
  );
}
