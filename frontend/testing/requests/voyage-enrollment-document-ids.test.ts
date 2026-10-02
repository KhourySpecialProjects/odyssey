/**
 * ODY-601: voyage-enrollment requests address single entries and write
 * relations by documentId (Strapi v5). A non-identity mapping (N -> "docN")
 * proves the documentId, not the numeric id, reaches the URL / body.
 */

import {
  enrollInVoyage,
  enrollInVoyageDirect,
  unenrollFromVoyage,
  markVoyageNodeComplete,
  claimNodeForUser,
  unclaimVoyageDropletNode,
} from "@/lib/requests/voyage-enrollment";
import { fetchAPI } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { requireRole } from "@/lib/auth/require-role";
import { authFixtures } from "@/testing/helpers/server-action-auth";
import {
  resolveDocumentId,
  resolveDocumentIds,
  strapiEntryUrl,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
  STRAPI_RESPONSE_FORMAT_HEADER: {},
}));

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({ getCachedUser: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));

const toDoc = (ref: unknown): string =>
  ref && typeof ref === "object" && (ref as { documentId?: string }).documentId
    ? (ref as { documentId: string }).documentId
    : "doc" + (typeof ref === "object" ? (ref as { id: number }).id : ref);

const identity = (ref: unknown): string =>
  ref && typeof ref === "object"
    ? (ref as { documentId?: string }).documentId ??
      String((ref as { id: number }).id)
    : String(ref);

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

const fetchMock = jest.fn();
const mockedFetchAPI = jest.mocked(fetchAPI);

const okJson = (data: unknown) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data }),
  text: () => Promise.resolve(""),
});

const bodyOf = (call: unknown[]) =>
  JSON.parse((call[1] as { body: string }).body).data;

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  mockedFetchAPI.mockReset();
  useMapping(toDoc);
});

afterEach(() => {
  useMapping(identity);
});

describe("enrollInVoyage / enrollInVoyageDirect documentIds", () => {
  it("enrollInVoyage reads the voyage by documentId and sends user and voyage documentIds", async () => {
    (requireRole as jest.Mock).mockResolvedValue(authFixtures.as({ id: 42 }));
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 42 });
    mockedFetchAPI
      .mockResolvedValueOnce({
        id: 10,
        documentId: "voyDoc",
        status: "published",
      } as never)
      .mockResolvedValueOnce([] as never); // getVoyageEnrollment
    fetchMock.mockResolvedValueOnce(okJson({ id: 1 }));

    const result = await enrollInVoyage(10);

    expect(result.ok).toBe(true);
    expect(mockedFetchAPI.mock.calls[0][0]).toBe("/voyages/doc10");
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      authorizedUser: "doc42",
      voyage: "voyDoc",
    });
  });

  it("enrollInVoyageDirect sends user and voyage documentIds", async () => {
    mockedFetchAPI.mockResolvedValueOnce([] as never);
    fetchMock.mockResolvedValueOnce(okJson({ id: 1 }));

    const result = await enrollInVoyageDirect(42, 10);

    expect(result.ok).toBe(true);
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      authorizedUser: "doc42",
      voyage: "doc10",
    });
  });

  it("enrollInVoyageDirect returns a failure result when a related entry is gone", async () => {
    mockedFetchAPI.mockResolvedValueOnce([] as never);
    jest
      .mocked(resolveDocumentId)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));

    const result = await enrollInVoyageDirect(42, 10);

    expect(result).toEqual({
      ok: false,
      error: "Failed to enroll in voyage",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("unenrollFromVoyage documentIds", () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "s@x.edu" });
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 42 });
  });

  it("deletes completions and the enrollment by their own documentIds", async () => {
    mockedFetchAPI
      .mockResolvedValueOnce([{ id: 1, documentId: "enrDoc" }] as never)
      .mockResolvedValueOnce([
        { id: 3, documentId: "cDoc" },
        { id: 4 },
      ] as never);
    fetchMock.mockResolvedValue(okJson({ id: 1 }));

    const result = await unenrollFromVoyage(10);

    expect(result.ok).toBe(true);
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/\/api\/voyage-node-completions\/cDoc$/),
        expect.stringMatching(/\/api\/voyage-node-completions\/doc4$/),
        expect.stringMatching(/\/api\/voyage-enrollments\/enrDoc$/),
      ]),
    );
    // The enrollment entity carried a documentId: no lookup for it.
    expect(resolveDocumentId).not.toHaveBeenCalledWith(
      "voyage-enrollments",
      expect.anything(),
    );
  });

  it("returns the failure result when the enrollment is already gone", async () => {
    mockedFetchAPI
      .mockResolvedValueOnce([{ id: 1 }] as never)
      .mockResolvedValueOnce([] as never);
    jest
      .mocked(strapiEntryUrl)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));

    const result = await unenrollFromVoyage(10);

    expect(result).toEqual({
      ok: false,
      error: "Failed to unenroll from voyage.",
      data: null,
    });
  });
});

describe("markVoyageNodeComplete documentIds", () => {
  beforeEach(() => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "s@x.edu" });
    (getCachedUser as jest.Mock).mockResolvedValue({ id: 42 });
  });

  function arrangeUntilCompletionPost() {
    mockedFetchAPI
      .mockResolvedValueOnce([{ id: 5, documentId: "enrDoc" }] as never) // enrollmentCheck
      .mockResolvedValueOnce([] as never); // existing completion
  }

  it("sends node, enrollment and user documentIds and PUTs the enrollment by documentId", async () => {
    arrangeUntilCompletionPost();
    mockedFetchAPI
      .mockResolvedValueOnce([
        { id: 5, completionPercentage: 0, voyage: { id: 10 } },
      ] as never)
      .mockResolvedValueOnce([
        { id: 7, branchType: "required", nodeType: "playlist" },
      ] as never)
      .mockResolvedValueOnce([{ id: 99, voyageNode: { id: 7 } }] as never);
    fetchMock
      .mockResolvedValueOnce(okJson({ id: 99 }))
      .mockResolvedValueOnce(okJson({ id: 5 }));

    const result = await markVoyageNodeComplete(7, 5);

    expect(result.ok).toBe(true);
    expect(bodyOf(fetchMock.mock.calls[0])).toMatchObject({
      voyageNode: "doc7",
      voyageEnrollment: "enrDoc",
      authorizedUser: "doc42",
    });
    expect(fetchMock.mock.calls[1][0]).toMatch(
      /\/api\/voyage-enrollments\/enrDoc$/,
    );
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
  });

  it("returns the mark-complete failure when a related entry is gone", async () => {
    arrangeUntilCompletionPost();
    jest
      .mocked(resolveDocumentId)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));

    const result = await markVoyageNodeComplete(7, 5);

    expect(result).toEqual({
      ok: false,
      error: "Failed to mark node as complete",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("claim / unclaim voyage node documentIds", () => {
  it("claimNodeForUser connects the claimer by documentId and PUTs the node by its documentId", async () => {
    (requireRole as jest.Mock).mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValueOnce([
      {
        id: 1,
        documentId: "nodeDoc",
        label: "N",
        nodeType: "droplet",
        claimStatus: "unclaimed",
        voyage: { name: "V" },
      },
    ] as never);
    fetchMock
      .mockResolvedValueOnce(
        okJson({ id: 55, documentId: "dropDoc", slug: "n-v" }),
      )
      .mockResolvedValueOnce(okJson({ id: 1 }));

    const result = await claimNodeForUser(1, 7);

    expect(result.ok).toBe(true);
    expect(bodyOf(fetchMock.mock.calls[0]).authorized_users).toEqual({
      connect: ["doc7"],
    });
    expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/voyage-nodes\/nodeDoc$/);
    expect(bodyOf(fetchMock.mock.calls[1])).toMatchObject({
      droplet: "dropDoc",
      claimedBy: "doc7",
      claimStatus: "claimed",
    });
  });

  it("claimNodeForUser keeps the old retries-exhausted error when the claimer is gone", async () => {
    (requireRole as jest.Mock).mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValueOnce([
      {
        id: 1,
        label: "N",
        nodeType: "droplet",
        claimStatus: "unclaimed",
        voyage: { name: "V" },
      },
    ] as never);
    jest
      .mocked(resolveDocumentId)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("gone"));

    const result = await claimNodeForUser(1, 7);

    expect(result).toEqual({
      ok: false,
      error: "Failed to create droplet after retries",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("unclaimVoyageDropletNode PUTs the node by its documentId", async () => {
    (requireRole as jest.Mock).mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValueOnce([
      {
        id: 1,
        documentId: "nodeDoc",
        claimStatus: "claimed",
        claimedBy: { id: 7 },
      },
    ] as never);
    fetchMock.mockResolvedValueOnce(okJson({ id: 1 }));

    const result = await unclaimVoyageDropletNode(1);

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/voyage-nodes\/nodeDoc$/);
  });
});
