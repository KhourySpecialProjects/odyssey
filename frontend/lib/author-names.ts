type Named = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

/**
 * A person's name from whichever parts they have, never "null" (ODY-526). With
 * no name at all, the part of their email before the @.
 */
export function formatName({ firstName, lastName, email }: Named): string {
  const name = [firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  return name || email?.split("@")[0] || "";
}

/** Every author's name, leaving out those with nothing to show. */
export function authorNames(authors: Named[] | null | undefined): string[] {
  return (authors ?? []).map(formatName).filter(Boolean);
}

/**
 * Who made a droplet, in one line: "Jane Doe", "Jane Doe and John Smith" or
 * "Jane Doe + 2 more" (ODY-863). Null when there is no one to show.
 */
export function authorByline(
  authors: Named[] | null | undefined,
): string | null {
  const names = authorNames(authors);
  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]} + ${names.length - 1} more`;
}

/**
 * Whether a search matches a droplet's name or one of its authors' names, so
 * searching "Frank Anderson" finds their droplets (ODY-863).
 */
export function matchesDropletSearch(
  droplet: { name: string; authorized_users?: Named[] | null },
  query: string,
): boolean {
  const search = query.trim().toLowerCase();
  if (!search) return true;
  return [droplet.name, ...authorNames(droplet.authorized_users)].some((text) =>
    text.toLowerCase().includes(search),
  );
}
