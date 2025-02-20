import { fetchAuthorizedUsers } from "@/lib/requests/authorized-user";
import { FriendSuggestionsBlock } from "./friend-suggestions-block";
import { fetchSuggestionsById } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";

export async function FriendSuggestions({ user }: { user: AuthorizedUser }) {
  const authorizedUsers = await fetchAuthorizedUsers();

  return (
    <section className="mt-4">
      <h1 className="font-bold">Friend Suggestions</h1>
      <p>A list of your people you may know.</p>

      <div className="p-4 mt-4 rounded-md bg-slate-100">
        {authorizedUsers.length > 0 ? (
          <ul className="divide-y divide-slate-200 dark:divide-slate-700 md:space-y-4">
            {(await fetchSuggestionsById(user.id)).map((suggestedUser) => (
              <FriendSuggestionsBlock
                curUser={user}
                suggUser={suggestedUser}
                display={false}
                requested={false}
                key={`${user.id} / ${suggestedUser.id}`}
              />
            ))}
          </ul>
        ) : (
          <p>There are no friend suggestions.</p>
        )}
      </div>
    </section>
  );
}
