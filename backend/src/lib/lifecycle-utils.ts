/**
 * Shared lifecycle utilities
 */

/**
 * Generates a UID slug for a given content type and data payload.
 * Wraps the content-manager UID service so lifecycle files don't repeat the call.
 */
export async function generateSlug(contentTypeUID: string, data: object): Promise<string> {
  return strapi.service('plugin::content-manager.uid').generateUIDField({
    contentTypeUID,
    field: 'slug',
    data,
  });
}

/** Capitalizes the first character of a string. */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a person's display name from optional first/last name fields with an
 * email fallback. Shared across lifecycle files that deal with user relations.
 */
export function formatPersonName({
  firstName,
  lastName,
  email,
}: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const full = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return full.length > 0 ? full : email;
}
