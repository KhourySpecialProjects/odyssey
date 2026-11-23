// Fake Strapi documentIds for tests. jest.setup.ts mocks @/lib/strapi-document-id
// with these, so a raw numeric id in a URL or relation write fails assertions.

/** 5 -> "doc5". documentId strings and entities that carry one pass through. */
export function fakeDocumentId(ref: unknown): string {
  if (ref && typeof ref === "object") {
    const { documentId, id } = ref as {
      documentId?: string | null;
      id?: unknown;
    };
    return documentId ?? fakeDocumentId(id);
  }
  return /^\d+$/.test(String(ref)) ? `doc${ref}` : String(ref);
}

/** Re-installs the global mock, e.g. after jest.resetAllMocks() wipes it. */
export function installDocumentIdMock(): void {
  const m = jest.requireMock<typeof import("@/lib/strapi-document-id")>(
    "@/lib/strapi-document-id",
  );
  jest
    .mocked(m.resolveDocumentId)
    .mockImplementation(async (_c, ref) => fakeDocumentId(ref));
  jest
    .mocked(m.resolveDocumentIds)
    .mockImplementation(async (_c, refs) => refs.map(fakeDocumentId));
  jest
    .mocked(m.strapiEntryUrl)
    .mockImplementation(
      async (collection, ref, query) =>
        `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${collection}/${fakeDocumentId(ref)}${query ? `?${query}` : ""}`,
    );
}
