// Badge store (ODY-987). A droplet has at most one picked badge, plus up to 3
// options kept until the creator picks one. Only the Next.js server calls the
// routes (service token). No two rows share an emblem: `emblemHash` is the
// sha256 of the normalized SVG, behind the unique index droplet_badges_emblem_hash_uq.
import { createHash } from 'crypto';

export const DROPLET_BADGE_UID = 'api::droplet-badge.droplet-badge';
const DROPLET_UID = 'api::droplet.droplet';
const USER_UID = 'api::authorized-user.authorized-user';

export const MAX_OPTIONS = 3;
export const MAX_TITLE = 60;
export const MAX_SVG = 12288;
export const MAX_META = 40;
export const MAX_PICKED_LOOKUP = 100;

/** Thrown with the HTTP status the controller should answer with. */
export class BadgeError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Row = Record<string, any>;

export type BadgeOptionInput = {
  title: string;
  emblemSvg: string;
  model?: string;
  promptVersion?: string;
};

/** True when the text, once trimmed, starts with `<svg` and ends with `</svg>`. */
export const looksLikeSvg = (svg: string): boolean => {
  const trimmed = svg.trim();
  return trimmed.startsWith('<svg') && trimmed.endsWith('</svg>');
};

/** Drops the XML prolog and comments, closes gaps between tags and trims. */
export function normalizeSvg(svg: string): string {
  return svg
    .replace(/<\?xml[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();
}

/** sha256 hex of the normalized SVG: the emblem's fingerprint. */
export const emblemHash = (svg: string): string =>
  createHash('sha256').update(normalizeSvg(svg)).digest('hex');

/** A unique-index or unique-validation failure, whichever the driver or Strapi raised. */
function isUniqueViolation(err: unknown): boolean {
  let cur: any = err;
  for (let depth = 0; cur && depth < 4; depth++) {
    const text = `${cur.message ?? ''} ${cur.constraint ?? ''}`;
    if (
      cur.code === '23505' ||
      /unique constraint failed|duplicate key|droplet_badges_emblem_hash_uq|must be unique/i.test(text)
    ) {
      return true;
    }
    cur = cur.cause ?? cur.originalError;
  }
  return false;
}

const findDroplet = (id: number) =>
  strapi.documents(DROPLET_UID as any).findFirst({ filters: { id }, fields: ['id'] } as any) as Promise<Row | null>;

/** Locks the droplet's row, so saves and picks for one droplet run one at a time. */
async function lockDroplet(dropletId: number) {
  await strapi.db.queryBuilder(DROPLET_UID).select(['id']).where({ id: dropletId }).forUpdate().first().execute();
}

const badgeRows = (dropletId: number, status?: 'option' | 'picked'): Promise<Row[]> =>
  strapi.db.query(DROPLET_BADGE_UID).findMany({
    where: { droplet: { id: dropletId }, ...(status && { status }) },
    orderBy: { id: 'asc' },
  });

/** Reruns `fn` once on a concurrent-write error (a lock timeout or an aborted transaction). */
async function retryOnce<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof BadgeError) throw err;
    return fn();
  }
}

export type SaveBadgeOptionsInput = {
  dropletId: number;
  userId: number;
  options: BadgeOptionInput[];
};

/**
 * Replaces the droplet's stored options with these. Refuses once a badge is
 * picked, and refuses any emblem another badge or option already has.
 */
export async function saveBadgeOptions(input: SaveBadgeOptionsInput) {
  const { dropletId, userId, options } = input;
  const droplet = await findDroplet(dropletId);
  if (!droplet) throw new BadgeError(404, 'Droplet not found');
  const user = (await strapi.documents(USER_UID as any).findFirst({
    filters: { id: userId },
    fields: ['id'],
  } as any)) as Row | null;
  if (!user) throw new BadgeError(404, 'User not found');

  const hashes = options.map((option) => emblemHash(option.emblemSvg));
  if (new Set(hashes).size !== hashes.length) {
    throw new BadgeError(409, 'Two options share an emblem');
  }

  try {
    return await strapi.db.transaction(async () => {
      await lockDroplet(dropletId);
      if ((await badgeRows(dropletId, 'picked')).length > 0) {
        throw new BadgeError(409, 'Badge already picked');
      }
      await strapi.db.query(DROPLET_BADGE_UID).deleteMany({ where: { droplet: { id: dropletId }, status: 'option' } });

      const taken = await strapi.db.query(DROPLET_BADGE_UID).count({ where: { emblemHash: { $in: hashes } } });
      if (taken > 0) throw new BadgeError(409, 'Emblem already used');

      const saved: Row[] = [];
      for (const [i, option] of options.entries()) {
        const row = (await strapi.documents(DROPLET_BADGE_UID as any).create({
          data: {
            droplet: droplet.documentId,
            status: 'option',
            title: option.title,
            emblemSvg: option.emblemSvg,
            emblemHash: hashes[i],
            model: option.model,
            promptVersion: option.promptVersion,
            createdByUser: user.documentId,
          },
        } as any)) as Row;
        saved.push(row);
      }
      return saved.map((row) => ({
        id: Number(row.id),
        documentId: row.documentId as string,
        title: row.title as string,
        emblemSvg: row.emblemSvg as string,
      }));
    });
  } catch (err) {
    // A concurrent save with the same emblem lost at the unique index.
    if (!(err instanceof BadgeError) && isUniqueViolation(err)) {
      throw new BadgeError(409, 'Emblem already used');
    }
    throw err;
  }
}

export type PickBadgeInput = { dropletId: number; optionId: number };

/** Makes one of the droplet's options the picked badge and deletes the others. */
export async function pickBadge(input: PickBadgeInput) {
  const { dropletId, optionId } = input;

  const once = () =>
    strapi.db.transaction(async () => {
      await lockDroplet(dropletId);
      const rows = await badgeRows(dropletId);
      const option = rows.find((row) => Number(row.id) === optionId && row.status === 'option');
      if (!option) throw new BadgeError(404, 'Option not found');
      if (rows.some((row) => row.status === 'picked')) throw new BadgeError(409, 'Badge already picked');

      const picked = (await strapi.documents(DROPLET_BADGE_UID as any).update({
        documentId: option.documentId,
        data: { status: 'picked' },
      } as any)) as Row;
      await strapi.db.query(DROPLET_BADGE_UID).deleteMany({
        where: { droplet: { id: dropletId }, status: 'option', id: { $ne: optionId } },
      });
      return {
        id: Number(picked.id),
        documentId: picked.documentId as string,
        dropletId,
        title: picked.title as string,
        emblemSvg: picked.emblemSvg as string,
        model: (picked.model ?? null) as string | null,
        promptVersion: (picked.promptVersion ?? null) as string | null,
      };
    });

  return retryOnce(once);
}

/** The picked badges of these droplets; droplets with none are left out. */
export async function getPickedBadges(dropletIds: number[]) {
  const rows: Row[] = await strapi.db.query(DROPLET_BADGE_UID).findMany({
    where: { status: 'picked', droplet: { id: { $in: dropletIds } } },
    populate: { droplet: { select: ['id'] } },
    orderBy: { id: 'asc' },
  });
  return rows.map((row) => ({
    dropletId: Number(row.droplet.id),
    title: row.title as string,
    emblemSvg: row.emblemSvg as string,
  }));
}

/** The droplet's stored options; none once a badge is picked. */
export async function getBadgeOptions(dropletId: number) {
  const rows = await badgeRows(dropletId);
  if (rows.some((row) => row.status === 'picked')) return [];
  return rows
    .filter((row) => row.status === 'option')
    .map((row) => ({ id: Number(row.id), title: row.title as string, emblemSvg: row.emblemSvg as string }));
}

/** Deletes every badge and option of a droplet (the droplet's own delete calls this). */
export async function deleteDropletBadges(dropletId: number) {
  await strapi.db.query(DROPLET_BADGE_UID).deleteMany({ where: { droplet: { id: dropletId } } });
}
