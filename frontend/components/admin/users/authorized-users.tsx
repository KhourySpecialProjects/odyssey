import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { AuthorizedUserBlock } from "./authorized-user";
import { CreateUser } from "./create-user";

export type AuthorizedUser = {
  id: number;
  email: string;
  isAdmin: boolean;
  isEnabled: boolean;
};

export default async function AuthorizedUsers() {
  const authorizedUsers = await fetchAuthorizedUsers();

  return (
    <section>
      <h1 className="font-bold">Authorized Users</h1>
      <p>The following users have access to this application.</p>

      <div className="mt-4">
        <CreateUser />
      </div>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {authorizedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {authorizedUsers.map((user: AuthorizedUser) => (
              <AuthorizedUserBlock user={user} key={user.id} />
            ))}
          </ul>
        ) : (
          <p>There are no authorized users.</p>
        )}
      </div>
    </section>
  );
}
