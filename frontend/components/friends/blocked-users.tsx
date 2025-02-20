import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { BlockedUsersBlock } from "./blocked-users-block";

export async function BlockedUsers() {
  const user = await getCurrentUser();
  if (!user || !user?.email) return redirect("/");
  const authUser = await getAuthorizedUserByEmail(user.email);
  const blockedUsers = authUser.blocked;

  return (
    <section className="mt-4">
      <h1 className="font-bold">Blocked Users</h1>
      <p>A list of people you have blocked.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {blockedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {blockedUsers.map((block) => (
              <BlockedUsersBlock
                user={authUser}
                blocked={block}
                key={block.id}
              />
            ))}
          </ul>
        ) : (
          <p>You have no blocked users</p>
        )}
      </div>
    </section>
  );
}
