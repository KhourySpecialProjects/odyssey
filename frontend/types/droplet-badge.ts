// Droplet badges (ODY-987): one picked badge per droplet, and up to 3 options
// kept until the creator picks one. Strapi: `api::droplet-badge.droplet-badge`.

/** A badge option as the creator sees it in the picker. */
export type BadgeOption = {
  id: number;
  title: string;
  emblemSvg: string;
};

/** A picked badge: the ribbon title and the emblem, for one droplet. */
export type PickedBadge = {
  dropletId: number;
  title: string;
  emblemSvg: string;
};

/** One option to store. `model` and `promptVersion` are at most 40 characters. */
export type BadgeOptionInput = {
  title: string;
  emblemSvg: string;
  model?: string;
  promptVersion?: string;
};

/** A stored option, as the save route returns it. */
export type SavedBadgeOption = BadgeOption & { documentId: string };

/** The badge `pickBadge` returns. */
export type PickedBadgeRecord = PickedBadge & {
  id: number;
  documentId: string;
  model: string | null;
  promptVersion: string | null;
};

export type BadgeError = "invalid" | "not_found" | "conflict" | "failed";

export type BadgeResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: BadgeError };
