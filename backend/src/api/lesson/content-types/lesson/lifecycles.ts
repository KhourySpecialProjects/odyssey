import { generateSlug } from '../../../../lib/lifecycle-utils';
import { Lesson } from '../../types';

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    if (!data.blocks && !data.blocksV2) {
      throw new Error('Lesson must have either blocks or blocksV2 content');
    }

    event.params.data.slug = await generateSlug('api::lesson.lesson', event.params.data);
  },

  async beforeUpdate(event) {
    const { data } = event.params;

    if ('blocks' in data || 'blocksV2' in data) {
      const existing = (await strapi.entityService.findOne(
        'api::lesson.lesson',
        event.params.where.id,
        { fields: ['blocksV2'], populate: { blocks: true } }
      )) as Lesson | null;

      const finalBlocks = 'blocks' in data ? data.blocks : existing?.blocks;
      const finalBlocksV2 = 'blocksV2' in data ? data.blocksV2 : existing?.blocksV2;
      const hasBlocks = Array.isArray(finalBlocks)
        ? finalBlocks.length > 0
        : Boolean(finalBlocks);

      if (!hasBlocks && !finalBlocksV2) {
        throw new Error('Lesson must have either blocks or blocksV2 content');
      }
    }

    if (event.params.data.regenerateSlug) {
      event.params.data.slug = await generateSlug('api::lesson.lesson', event.params.data);
    }
    delete event.params.data.regenerateSlug;
  },
};
