// Server-side helper that turns Strapi numeric ids into documentIds.
//
// Strapi v5 single-entry REST routes (/api/<collection>/:id) and relation
// writes expect a documentId. Callers still hold numeric ids (from fetched
// data, the session, FormData, stored integer columns), so this module
// resolves them.
//
// Deliberately NOT a "use server" file: that would expose every export as a
// public Server Action. Do not import it from "use client" files.

import { fetchAPI } from "@/lib/utils";

export type StrapiCollection =
  | "access-requests"
  | "announcements"
  | "authorized-users"
  | "authorized-user-roles"
  | "creation-requests"
  | "datasets"
  | "droplets"
  | "droplet-lessons"
  | "due-dates"
  | "enrollments"
  | "friendships"
  | "galleries"
  | "groups"
  | "highlights"
  | "lessons"
  | "notes"
  | "playlists"
  | "reports"
  | "tags"
  | "voyages"
  | "voyage-enrollments"
  | "voyage-nodes"
  | "voyage-node-completions";

/** A numeric id, a documentId string, or an object carrying either. */
export type EntryRef =
  | number
  | string
  | { id?: number | string | null; documentId?: string | null };

export class StrapiEntryNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StrapiEntryNotFoundError";
  }
}

/**
 * A ref that cannot name any entry (null, undefined, NaN, "", or an object
 * with no id). It extends StrapiEntryNotFoundError so call sites' existing
 * not-found handling covers it, matching the 404 Strapi used to return for an
 * empty id.
 */
export class InvalidEntryRefError extends StrapiEntryNotFoundError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidEntryRefError";
  }
}

// Strapi's cuid2 documentIds are lowercase letters and digits. Anything else
// would be spliced into a URL path, so refuse it.
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9]+$/;

const MAX_CACHE_ENTRIES = 5000;
const BATCH_SIZE = 100;

// The id -> documentId mapping never changes for the life of a row, so a
// plain in-memory map is safe. Failures are never stored.
const cache = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

type NormalizedRef = { documentId: string } | { id: number };

function normalizeRef(
  collection: StrapiCollection,
  ref: EntryRef,
): NormalizedRef {
  const bad = () =>
    new InvalidEntryRefError(
      `Invalid ${collection} reference: ${JSON.stringify(ref) ?? String(ref)}`,
    );

  if (ref === null || ref === undefined) throw bad();

  if (typeof ref === "object") {
    if (ref.documentId) {
      if (!DOCUMENT_ID_PATTERN.test(ref.documentId)) throw bad();
      return { documentId: ref.documentId };
    }
    if (ref.id === null || ref.id === undefined) throw bad();
    return normalizeRef(collection, ref.id);
  }

  if (typeof ref === "number") {
    if (!Number.isFinite(ref)) throw bad();
    return { id: ref };
  }

  if (ref === "") throw bad();
  if (/^\d+$/.test(ref)) return { id: Number(ref) };
  if (!DOCUMENT_ID_PATTERN.test(ref)) throw bad();
  return { documentId: ref };
}

function remember(
  collection: StrapiCollection,
  id: number,
  documentId: string,
) {
  const key = `${collection}:${id}`;
  if (!cache.has(key) && cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, documentId);
}

async function lookupOne(
  collection: StrapiCollection,
  id: number,
): Promise<string> {
  const entries = await fetchAPI<{ documentId?: string }[] | null>(
    `/${collection}`,
    {
      urlParams: {
        filters: { id: { $eq: id } },
        fields: ["documentId"],
        pagination: { pageSize: 1 },
      },
      cache: "no-store",
    },
  );
  const documentId = entries?.[0]?.documentId;
  if (!documentId) {
    throw new StrapiEntryNotFoundError(
      `No ${collection} entry found with id ${id}`,
    );
  }
  remember(collection, id, documentId);
  return documentId;
}

export async function resolveDocumentId(
  collection: StrapiCollection,
  ref: EntryRef,
): Promise<string> {
  const normalized = normalizeRef(collection, ref);
  if ("documentId" in normalized) return normalized.documentId;

  const key = `${collection}:${normalized.id}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = lookupOne(collection, normalized.id).finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

export async function resolveDocumentIds(
  collection: StrapiCollection,
  refs: EntryRef[],
): Promise<string[]> {
  const normalized = refs.map((ref) => normalizeRef(collection, ref));

  // Collect this call's results locally. The shared cache is capped, so
  // concurrent inserts during the awaits below could evict entries we need.
  const resolved = new Map<number, string>();
  const toLookUp = new Set<number>();
  for (const n of normalized) {
    if (!("id" in n)) continue;
    const cached = cache.get(`${collection}:${n.id}`);
    if (cached) resolved.set(n.id, cached);
    else toLookUp.add(n.id);
  }

  const ids = [...toLookUp];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const chunk = ids.slice(i, i + BATCH_SIZE);
    const entries = await fetchAPI<
      { id?: number; documentId?: string }[] | null
    >(`/${collection}`, {
      urlParams: {
        filters: { id: { $in: chunk } },
        fields: ["documentId", "id"],
        pagination: { pageSize: BATCH_SIZE },
      },
      cache: "no-store",
    });
    for (const entry of entries ?? []) {
      if (entry?.id !== undefined && entry.documentId) {
        resolved.set(entry.id, entry.documentId);
        remember(collection, entry.id, entry.documentId);
      }
    }
  }

  const missing = ids.filter((id) => !resolved.has(id));
  if (missing.length > 0) {
    throw new StrapiEntryNotFoundError(
      `No ${collection} entry found with id ${missing.join(", ")}`,
    );
  }

  return normalized.map((n) =>
    "documentId" in n ? n.documentId : resolved.get(n.id)!,
  );
}

export async function strapiEntryUrl(
  collection: StrapiCollection,
  ref: EntryRef,
  query?: string,
): Promise<string> {
  const documentId = await resolveDocumentId(collection, ref);
  const base = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${collection}/${documentId}`;
  return query ? `${base}?${query}` : base;
}

/** Tests only. */
export function clearDocumentIdCache(): void {
  cache.clear();
  inFlight.clear();
}
