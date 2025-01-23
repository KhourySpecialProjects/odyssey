import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { FriendBlock } from "./friend-block";

export async function Friends() {
  const authorizedUsers = await fetchAuthorizedUsers();

  return (
    <section>
      <h1 className="font-bold">Friends</h1>
      <p>A list of your friends.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {authorizedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {authorizedUsers.map((user) => (
              <FriendBlock user={user} key={user.id} />
            ))}
          </ul>
        ) : (
          <p>You have no friends &#58;&#40;.</p>
        )}
      </div>
    </section>
  );
}
