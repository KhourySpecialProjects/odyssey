import { getCachedUserSocial } from "@/lib/requests/cached";
import { FriendSentRequestsBlock } from "./friend-sent-requests-block";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSend } from "@tabler/icons-react";

export async function FriendSentRequests() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();
  const sentRequests = authUser.sent_requests
    .filter(
      (friend) =>
        !authUser.blocked.some((blockedUser) => blockedUser.id === friend.id) &&
        !authUser.was_blocked.some(
          (blockedUser) => blockedUser.id === friend.id,
        ),
    )
    .sort((a, b) => a.lastName?.localeCompare(b.lastName));

  return (
    <section>
      {sentRequests.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {sentRequests.map((friendship) => (
            <FriendSentRequestsBlock
              user={authUser}
              request={friendship}
              key={friendship.id}
            />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={
            <IconSend
              className="h-7 w-7 text-[#475569] dark:text-slate-400"
              stroke={1.5}
            />
          }
          title="No sent requests"
          message="You haven't sent any friend requests."
        />
      )}
    </section>
  );
}
