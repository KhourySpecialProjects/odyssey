/**
 * Ids must be plain positive integers. The writes resolve their target through
 * `strapiEntryUrl`, which also accepts `{ id, documentId }` objects and prefers
 * the documentId, so an object could point the check at one record and the
 * write at another. Refuse anything else before any lookup.
 */
export function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}
