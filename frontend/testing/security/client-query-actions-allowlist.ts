/**
 * Server Actions that accept caller-chosen Strapi query options (populate,
 * fields, filters, sort) AND are imported by a "use client" module. Their
 * action IDs ship to every browser, so anyone can call them with any query
 * (ODY-640).
 *
 * This list may only shrink. Do not add entries for new code: pass the data
 * from a Server Component, or add a narrow action with a fixed query.
 * ODY-511 ("stop passing client-supplied Strapi queries") owns removing the
 * entries below. See docs/agent/server-action-auth.md.
 */
export const CLIENT_QUERY_ACTIONS: Record<string, `ODY-${number}`> = {
  "lib/requests/droplet.ts#getDropletById": "ODY-511",
  "lib/requests/droplet.ts#getDropletBySlug": "ODY-511",
  "lib/requests/droplet.ts#getDroplets": "ODY-511",
  "lib/requests/enrollment.ts#getEnrollmentsByAuthorizedUser": "ODY-511",
  "lib/requests/groups.ts#getGroupByID": "ODY-511",
  "lib/requests/highlights.ts#getHighlights": "ODY-511",
  "lib/requests/notes.ts#getNotesByAuthorizedUserAndLesson": "ODY-511",
  "lib/requests/playlist.ts#getPlaylists": "ODY-511",
};
