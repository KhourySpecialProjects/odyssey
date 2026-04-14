import { FriendSuggestionsBlock } from "./friend-suggestions-block";
import { fetchSuggestionsById } from "@/lib/requests/friends";
import { AuthorizedUser } from "@/types";
import { EmptyState } from "@/components/ui/empty-state";
import { IconSparkles } from "@tabler/icons-react";

export async function FriendSuggestions({ user }: { user: AuthorizedUser }) {
  const suggestions = await fetchSuggestionsById(user.id);

  return (
    <section>
      {suggestions.length > 0 ? (
        <ul className="divide-y divide-slate-200 dark:divide-slate-700">
          {suggestions.map((suggestedUser) => (
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
        <EmptyState
          icon={
            <IconSparkles
              className="h-7 w-7 text-[#475569] dark:text-slate-400"
              stroke={1.5}
            />
          }
          title="No suggestions"
          message="We don't have any friend suggestions for you right now."
        />
      )}
    </section>
  );
}
