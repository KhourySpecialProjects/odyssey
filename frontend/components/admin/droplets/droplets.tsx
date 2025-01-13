import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { DropletBlock } from "./droplet-block";
import { CreateDroplet } from "./create-droplet";

export async function Droplets() {
  const authorizedUsers = await fetchAuthorizedUsers();

  return (
    <section>
      <h1 className="font-bold">Droplets</h1>
      <p>The following droplets have been created.</p>

      <div className="mt-4">
        <CreateDroplet />
      </div>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {authorizedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {authorizedUsers.map((user) => (
              <DropletBlock user={user} key={user.id} />
            ))}
          </ul>
        ) : (
          <p>There are no authorized users.</p>
        )}
      </div>
    </section>
  );
}
