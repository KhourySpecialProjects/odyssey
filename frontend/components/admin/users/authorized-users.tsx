import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { AuthorizedUserBlock } from "./authorized-user";
import { CreateUser } from "./create-user";
import { AuthorizedUserClient } from "./authorized-user-client";


export async function AuthorizedUsers() {
  const authorizedUsers = await fetchAuthorizedUsers();

  return (
    <section>
      <h1 className="font-bold">Authorized Users</h1>
      <p>The following users have access to this application.</p>

      <div className="mt-4">
        <CreateUser />
      </div>

      <AuthorizedUserClient authorizedUsers={authorizedUsers} />
    </section>
  );
}
