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
 * `refuseInReview` and `refusePublished` are re-read under the row lock, so a
 * concurrent submit can't slip past: in review is 409, published is 403, and
 * nothing is deleted. A lesson another droplet still uses is kept.
 */
export type DeleteFlags = { refuseInReview: boolean; refusePublished: boolean };

export async function deepDeleteDroplet(
  ref: DraftRef,
  { refuseInReview, refusePublished }: DeleteFlags,
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
      populate: {
        lessons: { fields: ['id'], populate: { droplets: { fields: ['id'] } } },
      },
    } as any)) as Record<string, any> | null;
    if (!droplet) throw new PublishEditError(404, DRAFT_GONE_MESSAGE);

    if (refuseInReview && droplet.inReview === true) {
      throw new PublishEditError(409, 'This droplet is in review.');
    }
    if (refusePublished && droplet.status === 'published') {
      throw new PublishEditError(
        403,
        'Only an admin or content editor can delete a published droplet.',
      );
    }

    const lessons = (droplet.lessons ?? []) as Record<string, any>[];
    let lessonsDeleted = 0;
    for (const lesson of lessons) {
      const sharedElsewhere = (lesson.droplets ?? []).some(
        (d: Record<string, any>) => d.id !== found.id,
      );
      if (sharedElsewhere) continue;
      await strapi.documents(LESSON_UID).delete({ documentId: lesson.documentId });
      lessonsDeleted += 1;
    }
    await strapi
      .documents(DROPLET_UID)
      .delete({ documentId: droplet.documentId });
    return { dropletId: Number(found.id), lessonsDeleted };
  });
}
