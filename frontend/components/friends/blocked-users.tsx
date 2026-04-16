import { getCachedUserSocial } from "@/lib/requests/cached";
import { getCurrentUser } from "@/lib/auth/session";
import { notFound } from "next/navigation";
import { BlockedUsersBlock } from "./blocked-users-block";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBan } from "@tabler/icons-react";

export async function BlockedUsers() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return notFound();
  const authUser = await getCachedUserSocial(user.email);
  if (!authUser) return notFound();
  const blockedUsers = authUser.blocked;

  return (
    <section>
      {blockedUsers.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {blockedUsers.map((block) => (
            <BlockedUsersBlock user={authUser} blocked={block} key={block.id} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={
            <IconBan
              className="h-7 w-7 text-[#475569] dark:text-slate-400"
              stroke={1.5}
            />
          }
          title="No blocked users"
          message="You haven't blocked anyone."
        />
      )}
    </section>
  );
}
