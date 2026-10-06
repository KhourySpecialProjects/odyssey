/**
 * ODY-601: voyage requests address single entries and write relations by
 * documentId (Strapi v5). A non-identity mapping (N -> "docN") proves the
 * documentId, not the numeric id, reaches the URL / body.
 */

import {
  createVoyageWithNodes,
  publishVoyage,
  updateVoyageWithNodes,
  deleteVoyage,
  archiveVoyage,
} from "@/lib/requests/voyage";
import { fetchAPI } from "@/lib/utils";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";
import { installDocumentIdMock } from "@/lib/testing/document-id-mock";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
  STRAPI_RESPONSE_FORMAT_HEADER: {},
}));

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));

jest.mock("@/lib/validations/voyage", () => ({
  VoyageTreeSchema: {
    safeParse: jest.fn((input: unknown) => ({ success: true, data: input })),
  },
}));

const toDoc = (ref: unknown): string =>
  ref && typeof ref === "object" && (ref as { documentId?: string }).documentId
    ? (ref as { documentId: string }).documentId
    : "doc" + (typeof ref === "object" ? (ref as { id: number }).id : ref);

const urlFor =
  (map: (ref: unknown) => string) =>
  async (collection: string, ref: unknown, query?: string) =>
    `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/${collection}/${map(ref)}${query ? `?${query}` : ""}`;

function useMapping(map: (ref: unknown) => string) {
  jest.mocked(resolveDocumentId).mockImplementation(async (_c, r) => map(r));
  jest
    .mocked(resolveDocumentIds)
    .mockImplementation(async (_c, refs) => refs.map(map));
  jest.mocked(strapiEntryUrl).mockImplementation(urlFor(map) as never);
}

const admin = {
  ok: true as const,
  user: {
    id: 1,
    email: "a@test.com",
    roles: [AuthorizedUserRoleTitle.SysAdmin],
  },
};
const faculty = {
  ok: true as const,
  user: {
    id: 10,
    email: "f@test.com",
    roles: [AuthorizedUserRoleTitle.Faculty],
  },
};

const okJson = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data }),
});

const fetchMock = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  useMapping(toDoc);
});

afterEach(() => {
  installDocumentIdMock();
});

const mainNode = (playlistId: number) => ({
  localId: `local-${playlistId}`,
  nodeType: "playlist" as const,
  playlistId,
  dropletId: null,
  label: `Node ${playlistId}`,
  isMainPath: true,
  branchType: "required" as const,
  parentLocalId: null,
  orderIndex: 0,
});

describe("createVoyageWithNodes documentIds", () => {
  it("sends author, voyage, playlist, droplet and parentNode as documentIds", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    fetchMock
      .mockResolvedValueOnce(
        okJson({ id: 99, documentId: "voyDoc", slug: "v" }),
      )
      .mockResolvedValueOnce(okJson({ id: 10, documentId: "nodeDoc" }))
      .mockResolvedValueOnce(okJson({ id: 11, documentId: "nodeDoc2" }))
      .mockResolvedValueOnce(okJson({ id: 12, documentId: "nodeDoc3" }));

    const result = await createVoyageWithNodes({
      name: "V",
      authorId: 3,
      nodes: [
        mainNode(5),
        {
          ...mainNode(0),
          localId: "d",
          nodeType: "droplet",
          playlistId: null,
          dropletId: 42,
          orderIndex: 1,
        },
        {
          ...mainNode(7),
          localId: "branch",
          isMainPath: false,
          parentLocalId: "local-5",
        },
      ],
    });

    expect(result.ok).toBe(true);
    const bodies = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).data);
    expect(bodies[0].authors).toEqual({ connect: ["doc3"] });
    expect(bodies[1]).toMatchObject({ voyage: "voyDoc", playlist: "doc5" });
    expect(bodies[2]).toMatchObject({ voyage: "voyDoc", droplet: "doc42" });
    expect(bodies[3]).toMatchObject({
      voyage: "voyDoc",
      playlist: "doc7",
      parentNode: "nodeDoc",
    });
    // The voyage and parent node already carried a documentId: no lookup.
    expect(resolveDocumentId).not.toHaveBeenCalledWith("voyages", 99);
    expect(resolveDocumentId).not.toHaveBeenCalledWith("voyage-nodes", 10);
  });

  it("cleans up using the voyage documentId when a node fails", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    fetchMock
      .mockResolvedValueOnce(
        okJson({ id: 99, documentId: "voyDoc", slug: "v" }),
      )
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: { message: "boom" } }),
      })
      .mockResolvedValueOnce({ ok: true });

    const result = await createVoyageWithNodes({
      name: "V",
      nodes: [mainNode(5)],
    });

    expect(result).toEqual({ ok: false, error: "boom", data: null });
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/api\/voyages\/voyDoc$/);
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });

  it("returns a creation error when a related playlist no longer exists", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    fetchMock.mockResolvedValueOnce(okJson({ id: 99, documentId: "voyDoc" }));
    jest
      .mocked(resolveDocumentIds)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));
    fetchMock.mockResolvedValueOnce({ ok: true });

    const result = await createVoyageWithNodes({
      name: "V",
      nodes: [mainNode(5)],
    });

    expect(result).toEqual({
      ok: false,
      error: "Failed to create voyage node",
      data: null,
    });
  });
});

describe("publishVoyage documentIds", () => {
  it("admin: PUTs to the voyage documentId", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    fetchMock.mockResolvedValueOnce({ ok: true });

    const result = await publishVoyage(5);

    expect(result).toEqual({ ok: true, error: null });
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/voyages\/doc5$/);
  });

  it("admin: returns the not-found result when the voyage is gone", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    jest
      .mocked(strapiEntryUrl)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));

    const result = await publishVoyage(5);

    expect(result).toEqual({ ok: false, error: "Not Found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("faculty: reads by documentId and reuses the fetched voyage's documentId for the PUT", async () => {
    (requireRole as jest.Mock).mockResolvedValue(faculty);
    jest.mocked(fetchAPI).mockResolvedValueOnce({
      id: 5,
      documentId: "voyDoc",
      authors: [{ id: 10 }],
    } as never);
    fetchMock.mockResolvedValueOnce({ ok: true });

    await publishVoyage(5);

    expect(jest.mocked(fetchAPI).mock.calls[0][0]).toBe("/voyages/doc5");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/voyages\/voyDoc$/);
  });
});

describe("updateVoyageWithNodes documentIds", () => {
  it("PUTs by documentId, deletes nodes by their documentId and re-creates with documentIds", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    jest.mocked(fetchAPI).mockResolvedValueOnce([
      { id: 1, documentId: "mainDoc", isMainPath: true },
      { id: 2, documentId: "branchDoc", isMainPath: false },
    ] as never);
    fetchMock
      .mockResolvedValueOnce(okJson({ id: 5, documentId: "voyDoc", slug: "v" }))
      .mockResolvedValueOnce({ ok: true }) // delete branch
      .mockResolvedValueOnce({ ok: true }) // delete main
      .mockResolvedValueOnce(okJson({ id: 20, documentId: "newNode" }));

    const result = await updateVoyageWithNodes({
      id: 5,
      name: "V",
      nodes: [mainNode(8)],
    });

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/voyages\/doc5$/);
    expect(fetchMock.mock.calls[1][0]).toMatch(
      /\/api\/voyage-nodes\/branchDoc$/,
    );
    expect(fetchMock.mock.calls[2][0]).toMatch(/\/api\/voyage-nodes\/mainDoc$/);
    expect(JSON.parse(fetchMock.mock.calls[3][1].body).data).toMatchObject({
      voyage: "voyDoc",
      playlist: "doc8",
    });
  });

  it("treats a node that no longer exists as already deleted", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    jest
      .mocked(fetchAPI)
      .mockResolvedValueOnce([{ id: 1, isMainPath: true }] as never);
    fetchMock
      .mockResolvedValueOnce(okJson({ id: 5, documentId: "voyDoc", slug: "v" }))
      .mockResolvedValueOnce(okJson({ id: 20, documentId: "newNode" }));
    jest.mocked(strapiEntryUrl).mockImplementation(async (collection, ref) => {
      if (collection === "voyage-nodes" && (ref as { id: number }).id === 1) {
        throw new StrapiEntryNotFoundError("gone");
      }
      return `http://x/api/${collection}/${toDoc(ref)}`;
    });

    const result = await updateVoyageWithNodes({
      id: 5,
      name: "V",
      nodes: [mainNode(8)],
    });

    expect(result.ok).toBe(true);
  });

  it("returns the not-found result when the voyage is gone", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    jest
      .mocked(strapiEntryUrl)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));

    const result = await updateVoyageWithNodes({
      id: 5,
      name: "V",
      nodes: [],
    });

    expect(result).toEqual({ ok: false, error: "Not Found", data: null });
  });
});

describe("deleteVoyage / archiveVoyage documentIds", () => {
  it("deleteVoyage (admin) DELETEs the documentId", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    fetchMock.mockResolvedValueOnce(okJson({ id: 5 }));

    await deleteVoyage(5);

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/voyages\/doc5$/);
  });

  it("deleteVoyage returns the failure result when the voyage is gone", async () => {
    (requireRole as jest.Mock).mockResolvedValue(admin);
    jest
      .mocked(strapiEntryUrl)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));

    const result = await deleteVoyage(5);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete voyage.",
      data: null,
    });
  });

  it("archiveVoyage reads by documentId and PUTs with the fetched documentId", async () => {
    (requireRole as jest.Mock).mockResolvedValue(faculty);
    jest.mocked(fetchAPI).mockResolvedValueOnce({
      id: 5,
      documentId: "voyDoc",
      authors: [{ id: 10 }],
    } as never);
    fetchMock.mockResolvedValueOnce({ ok: true });

    const result = await archiveVoyage(5, true);

    expect(result).toEqual({ success: true });
    expect(jest.mocked(fetchAPI).mock.calls[0][0]).toBe("/voyages/doc5");
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/voyages\/voyDoc$/);
  });
});
