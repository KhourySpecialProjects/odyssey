import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { FriendSuggestionsBlock } from "./friend-suggestions-block";

export async function FriendSuggestions() {
  const authorizedUsers = await fetchAuthorizedUsers();

  return (
    <section>
      <h1 className="font-bold">Friend Suggestions</h1>
      <p>A list of your people you may know.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {authorizedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {authorizedUsers.map((user) => (
              <FriendSuggestionsBlock user={user} key={user.id} />
            ))}
          </ul>
        ) : (
          <p>There are no authorized users.</p>
        )}
      </div>
    </section>
  );
}
