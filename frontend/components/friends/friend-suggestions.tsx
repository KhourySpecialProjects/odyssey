import { FriendSuggestionsBlock } from "./friend-suggestions-block";
import { fetchSuggestionsById } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";

export async function FriendSuggestions({ user }: { user: AuthorizedUser }) {
  const suggestions = await fetchSuggestionsById(user.id);

  return (
    <section className="md:mt-4">
      <h1 className="font-bold">Friend Suggestions</h1>
      <p>A list of people you may know.</p>

      <div className="mt-4 rounded-md bg-slate-100 p-1 md:p-4 dark:bg-slate-800">
        {suggestions.length > 0 ? (
          <ul className="divide-y divide-slate-200 md:space-y-4 dark:divide-slate-700">
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
          <p className="dark:text-slate-300">
            There are no friend suggestions.
          </p>
        )}
      </div>
    </section>
  );
}
