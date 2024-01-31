import { fetchAuthorizedUsers } from "@/lib/data";
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

      <div className="mt-4 bg-slate-100 p-4 rounded-md">
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 md:space-y-4">
          {authorizedUsers.map((user: AuthorizedUser) => (
            <AuthorizedUserBlock user={user} key={user.id} />
          ))}
        </ul>
      </div>
    </section>
  );
}
