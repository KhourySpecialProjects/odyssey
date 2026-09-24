// Shown above search results when nothing matched exactly and the list is
// close matches instead (see lib/search.ts)
export function CloseMatchesNote({ query }: { query: string }) {
  return (
    <p
      role="status"
      className="mb-4 text-sm text-slate-600 dark:text-slate-400"
    >
      No exact matches for &ldquo;{query.trim()}&rdquo;. Showing close matches.
    </p>
  );
}
