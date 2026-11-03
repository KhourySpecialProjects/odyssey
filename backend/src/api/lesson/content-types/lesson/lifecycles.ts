import { generateSlug } from '../../../../lib/lifecycle-utils';
import { Lesson } from '../../types';

const LESSON_UID = 'api::lesson.lesson';
// static routes beside [lessonSlug]: /draft/d/[slug]/scan, /d/[slug]/recap, /present
const RESERVED_LESSON_SLUGS = new Set(['scan', 'recap', 'present']);

/** Generates a lesson slug, suffixing " lesson" to the name when the result is reserved. */
async function lessonSlug(data: { name?: string }): Promise<string> {
  const slug = await generateSlug(LESSON_UID, data);
  if (!RESERVED_LESSON_SLUGS.has(slug)) return slug;
  return generateSlug(LESSON_UID, { ...data, name: `${data.name} lesson` });
}

module.exports = {
  async beforeCreate(event) {
    const { data } = event.params;

    if (!data.blocks && !data.blocksV2) {
      throw new Error('Lesson must have either blocks or blocksV2 content');
    }

    event.params.data.slug = await lessonSlug(event.params.data);
  },

  async beforeUpdate(event) {
    const { data } = event.params;

    if ('blocks' in data || 'blocksV2' in data) {
      // Before hooks only know the numeric row id, so use findFirst on id.
      const existing = (await strapi.documents(LESSON_UID).findFirst({
        filters: { id: event.params.where.id },
        fields: ['blocksV2'],
        populate: { blocks: true },
      })) as unknown as Lesson | null;

      const finalBlocks = 'blocks' in data ? data.blocks : existing?.blocks;
      const finalBlocksV2 =
        'blocksV2' in data ? data.blocksV2 : existing?.blocksV2;
      const hasBlocks = Array.isArray(finalBlocks)
        ? finalBlocks.length > 0
        : Boolean(finalBlocks);

      if (!hasBlocks && !finalBlocksV2) {
        throw new Error('Lesson must have either blocks or blocksV2 content');
      }
    }

    if (event.params.data.regenerateSlug) {
      event.params.data.slug = await lessonSlug(event.params.data);
    }
    // An admin hand edit to a reserved slug is remapped.
    if (
      typeof data.slug === 'string' &&
      RESERVED_LESSON_SLUGS.has(data.slug.toLowerCase())
    ) {
      data.slug = await lessonSlug({ ...data, name: data.slug });
    }
    delete event.params.data.regenerateSlug;
  },
};
