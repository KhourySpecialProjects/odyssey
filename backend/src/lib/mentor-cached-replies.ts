// Saved Mentor replies (ODY-967): one shared reply per version, no student data.
// The Next.js server computes the key; this file only finds, stores and cleans up.
export const MENTOR_CACHED_REPLY_UID = 'api::mentor-cached-reply.mentor-cached-reply';
export const CACHED_REPLY_SCOPES = ['lesson', 'hint'] as const;
export type CachedReplyScope = (typeof CACHED_REPLY_SCOPES)[number];
export const CACHED_REPLY_TEXT_MAX = 20000;
/**
 * Another version in the same slot and droplet is deleted only once it's
 * this old. Two versions can be live at once (a Next instance whose 900 s
 * cache still holds the old lesson, or a rolling deploy with two prompt
 * versions); without this they would delete each other's rows in turn.
 */
export const SUPERSEDED_AFTER_MS = 60 * 60 * 1000;
const CLEANUP_LIMIT = 50;

export type StoreCachedReplyInput = {
  key: string;
  slot: string;
  scope: CachedReplyScope;
  dropletId: number;
  lessonId: number;
  promptVersion: string;
  model: string;
  text: string;
};

type Row = Record<string, any>;

const replies = () => strapi.documents(MENTOR_CACHED_REPLY_UID as any);

const rowOf = (key: string) =>
  replies().findFirst({ filters: { key }, fields: ['id', 'text'] } as any) as Promise<Row | null>;

/** The saved text for a key, or null */
export async function findCachedReply(key: string): Promise<string | null> {
  const row = await rowOf(key);
  return row ? (row.text as string) : null;
}

/** Best effort: deletes older versions of the same slot in the same droplet */
async function cleanUp({ key, slot, dropletId }: StoreCachedReplyInput, now: Date) {
  try {
    const stale = (await replies().findMany({
      filters: {
        slot,
        dropletId,
        key: { $ne: key },
        createdAt: { $lt: new Date(now.getTime() - SUPERSEDED_AFTER_MS).toISOString() },
      },
      fields: ['id'],
      limit: CLEANUP_LIMIT,
    } as any)) as Row[];
    for (const row of stale) await replies().delete({ documentId: row.documentId });
  } catch (err) {
    strapi.log.warn('Mentor cached reply clean-up failed.', err);
  }
}

/**
 * Saves a reply unless its key is already there. Two requests can race to the
 * same key: the unique index lets one win, and the loser re-reads. No
 * transaction: a failed insert inside one aborts it on Postgres.
 */
export async function storeCachedReply(
  input: StoreCachedReplyInput,
  now = new Date(),
): Promise<{ id: number; stored: boolean }> {
  const existing = await rowOf(input.key);
  if (existing) return { id: existing.id, stored: false };

  let created: Row;
  try {
    created = (await replies().create({
      data: {
        key: input.key,
        slot: input.slot,
        scope: input.scope,
        dropletId: input.dropletId,
        lessonId: input.lessonId,
        promptVersion: input.promptVersion,
        model: input.model,
        text: input.text,
      },
      fields: ['id'],
    } as any)) as Row;
  } catch (err) {
    const winner = await rowOf(input.key);
    if (winner) return { id: winner.id, stored: false };
    throw err;
  }

  await cleanUp(input, now);
  return { id: created.id, stored: true };
}
