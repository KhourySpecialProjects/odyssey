import {
  DROPLET_UID,
  LESSON_UID,
  DRAFT_GONE_MESSAGE,
  PublishEditError,
  lockDroplet,
  type DraftRef,
} from './publish-edit';

export type DeleteResult = { dropletId: number; lessonsDeleted: number };

/**
 * Deletes a droplet and all of its lessons in one transaction (ODY-211).
 * With `authorOnly`, it first refuses an in-review droplet (409) or a published
 * one (403), re-read under the row lock so a concurrent submit can't slip past.
 * Every lesson goes, even one shared with another droplet (the old behaviour).
 */
export async function deepDeleteDroplet(
  ref: DraftRef,
  authorOnly: boolean,
): Promise<DeleteResult> {
  return strapi.db.transaction(async () => {
    const found = await strapi
      .documents(DROPLET_UID)
      .findFirst({ filters: ref, fields: ['id'] });
    if (!found) throw new PublishEditError(404, DRAFT_GONE_MESSAGE);
    await lockDroplet(Number(found.id));
    const droplet = (await strapi.documents(DROPLET_UID).findFirst({
      filters: { id: found.id },
      fields: ['status', 'inReview'],
      populate: { lessons: { fields: ['id'] } },
    } as any)) as Record<string, any> | null;
    if (!droplet) throw new PublishEditError(404, DRAFT_GONE_MESSAGE);

    if (authorOnly) {
      if (droplet.inReview === true) {
        throw new PublishEditError(409, 'This droplet is in review.');
      }
      if (droplet.status === 'published') {
        throw new PublishEditError(
          403,
          'Only an admin or content editor can delete a published droplet.',
        );
      }
    }

    const lessons = (droplet.lessons ?? []) as { documentId: string }[];
    for (const lesson of lessons) {
      await strapi.documents(LESSON_UID).delete({ documentId: lesson.documentId });
    }
    await strapi
      .documents(DROPLET_UID)
      .delete({ documentId: droplet.documentId });
    return { dropletId: Number(found.id), lessonsDeleted: lessons.length };
  });
}
