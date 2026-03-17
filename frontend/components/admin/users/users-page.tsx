import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { UsersPageClient } from "./users-page-client";

export async function UsersPage() {
  const users = await fetchAuthorizedUsers();
  const sortedUsers = [...users].sort((a, b) => {
    const aValue = a.lastName || a.email;
    const bValue = b.lastName || b.email;
    return aValue.localeCompare(bValue);
  });

  return (
    <div className="p-4">
      <UsersPageClient users={sortedUsers} />
    </div>
  );
}
