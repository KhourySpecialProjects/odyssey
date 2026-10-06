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

/**
 * Finishes voyage claims: moves "claimed" voyage nodes whose droplet matches
 * `dropletFilter` to "authored". Callers pass published droplets only, since a
 * claim is done once its droplet is published. Returns how many nodes changed.
 */
export async function markClaimedVoyageNodesAuthored(
  dropletFilter: Record<string, unknown>
): Promise<number> {
  const nodes = (await strapi.entityService.findMany('api::voyage-node.voyage-node', {
    filters: { claimStatus: 'claimed', droplet: dropletFilter },
    fields: ['id'],
  } as any)) as { id: number }[];

  for (const node of nodes) {
    await strapi.entityService.update('api::voyage-node.voyage-node', node.id, {
      data: { claimStatus: 'authored' },
    });
  }
  return nodes.length;
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
