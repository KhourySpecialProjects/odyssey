import {
  generateSlug,
  markClaimedVoyageNodesAuthored,
} from '../../../../lib/lifecycle-utils';
import { DropletStatus } from '../../types';

module.exports = {
  async beforeCreate(event) {
    event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
    // Server-owned submission counter; client values are ignored.
    event.params.data.reviewRound = event.params.data.inReview === true ? 1 : 0;
  },

  async beforeUpdate(event) {
    if (event.params.data.regenerateSlug) {
      event.params.data.slug = await generateSlug('api::droplet.droplet', event.params.data);
    }
    delete event.params.data.regenerateSlug;

    // Server-owned counter: drop any client value, then bump when inReview turns true.
    delete event.params.data.reviewRound;

    const data = event.params.data;
    if ('status' in data || data.inReview === true) {
      // Resolve the row by numeric id, else documentId (Query Engine callers). Neither: skip, so
      // afterUpdate sees no previousStatus and nothing bumps.
      const { id, documentId } = event.params.where ?? {};
      const filters = id !== undefined ? { id } : documentId ? { documentId } : null;
      const existing = filters
        ? await strapi.documents('api::droplet.droplet').findFirst({
            filters,
            fields: ['status', 'inReview', 'reviewRound'],
          })
        : null;
      // Only capture previous status when the update touches the status field.
      if ('status' in data && filters) {
        event.state = { previousStatus: existing ? (existing.status as DropletStatus) : null };
      }
      if (data.inReview === true && existing && existing.inReview !== true) {
        data.reviewRound = (existing.reviewRound ?? 0) + 1;
      }
    }
  },

  async afterUpdate(event) {
    const { result } = event;
    const prevStatus = event.state?.previousStatus as DropletStatus | null | undefined;

    // Publishing a claimed voyage droplet finishes the claim. Logged instead of
    // thrown: the droplet is already saved, so the publish must not fail here.
    if (result.status === 'published' && prevStatus !== undefined && prevStatus !== 'published') {
      try {
        await markClaimedVoyageNodesAuthored({ id: result.id });
      } catch (error) {
        strapi.log.error(`Could not mark voyage claims authored for droplet ${result.id}`, error);
      }
    }
  },
};
