import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { CreateUser } from "./create-user";
import { AuthorizedUserClient } from "./authorized-user-client";

export async function AuthorizedUsers() {
  const authorizedUsers = await fetchAuthorizedUsers();
  const sortedUsers = [...authorizedUsers].sort((a, b) => {
    const aValue = a.lastName || a.email;
    const bValue = b.lastName || b.email;
    return aValue.localeCompare(bValue);
  });

  return (
    <section>
      <h1 className="font-bold dark:text-slate-300">Authorized Users</h1>
      <p className="dark:text-slate-300">
        The following users have access to this application. Click a name to see
        their activity logs.
      </p>

      <div className="mt-4">
        <CreateUser />
      </div>

      <AuthorizedUserClient authorizedUsers={sortedUsers} />
    </section>
  );
}
