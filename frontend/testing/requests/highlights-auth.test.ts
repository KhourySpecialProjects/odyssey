// Auth and behaviour tests for the highlight write actions (ODY-785, ODY-508).
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
} from "@/lib/requests/highlights";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { revalidateTag } from "next/cache";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({
  requireRole: jest.fn(),
}));

jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedRevalidateTag = jest.mocked(revalidateTag);

let fetchMock: jest.MockedFunction<typeof fetch>;

const createInput = {
  text: "beta",
  position: { start: 6, end: 10 },
  color: "#f9a8d4" as const,
  blockId: 3,
  lessonId: 2,
};

/** A highlight record owned by authorized user 7. */
const highlightOwnedBySeven = () => [{ id: 5, authorized_user: { id: 7 } }];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  fetchMock = mockGlobalFetch();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describeServerActionAuth("createHighlight", {
  requireRole: mockedRequireRole,
  invoke: () => createHighlight(createInput),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      fetchMock.mockResolvedValue(
        makeFetchResponse({ data: { id: 11, attributes: { text: "beta" } } }),
      );
    },
    expect: (result) => {
      expect(result.ok).toBe(true);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("createHighlight", () => {
  it("saves the highlight to the session user, not a client-supplied id", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    fetchMock.mockResolvedValue(
      makeFetchResponse({
        data: { id: 11, attributes: { text: "beta", color: "#f9a8d4" } },
      }),
    );

    const result = await createHighlight(createInput);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/highlights"),
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      data: {
        text: "beta",
        position: { start: 6, end: 10 },
        color: "#f9a8d4",
        blockId: 3,
        lesson: 2,
        authorized_user: 7,
      },
    });
    expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.highlights(7));
    expect(result).toEqual({
      ok: true,
      error: null,
      data: expect.objectContaining({ id: 11, text: "beta" }),
    });
  });

  it("returns an error instead of throwing when Strapi answers not ok", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    fetchMock.mockResolvedValue(makeFetchResponse({}, 400));

    const result = await createHighlight(createInput);

    expect(result).toEqual({
      ok: false,
      error: "Failed to save highlight",
      data: null,
    });
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns an error instead of throwing on a network error", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    fetchMock.mockRejectedValue(new Error("Network timeout"));

    const result = await createHighlight(createInput);

    expect(result).toEqual({
      ok: false,
      error: "Failed to save highlight",
      data: null,
    });
  });
});

describeServerActionAuth("updateHighlight", {
  requireRole: mockedRequireRole,
  invoke: () => updateHighlight(5, { color: "#86efac" }),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
      fetchMock.mockResolvedValue(
        makeFetchResponse({
          data: { id: 5, attributes: { color: "#86efac" } },
        }),
      );
    },
    expect: (result) => {
      expect(result.ok).toBe(true);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("updateHighlight", () => {
  it("reads the record's owner first, with no cache", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));

    await updateHighlight(5, { color: "#86efac" });

    expect(mockedFetchAPI).toHaveBeenCalledWith("/highlights", {
      urlParams: expect.objectContaining({
        filters: { id: { $eq: 5 } },
        populate: { authorized_user: { fields: ["id"] } },
      }),
      next: { tags: [CACHE_TAGS.highlights(7)], revalidate: 0 },
    });
  });

  it("PUTs only the allowed changes and revalidates the caller's tag", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    fetchMock.mockResolvedValue(
      makeFetchResponse({
        data: { id: 5, attributes: { color: "#86efac", text: "x" } },
      }),
    );

    const result = await updateHighlight(5, {
      color: "#86efac",
      position: { start: 1, end: 4 },
      authorized_user: 99,
    } as Parameters<typeof updateHighlight>[1]);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/highlights/5"),
      expect.objectContaining({ method: "PUT" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toEqual({
      data: { color: "#86efac", position: { start: 1, end: 4 } },
    });
    expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.highlights(7));
    expect(result.ok).toBe(true);
    expect(result.data).toEqual(
      expect.objectContaining({ id: 5, color: "#86efac" }),
    );
  });

  it("does not let an admin edit someone else's highlight", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());

    const result = await updateHighlight(5, { color: "#86efac" });

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a missing highlight", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue([]);

    const result = await updateHighlight(5, { color: "#86efac" });

    expect(result).toEqual({
      ok: false,
      error: "Highlight not found",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an error when Strapi answers not ok", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    fetchMock.mockResolvedValue(makeFetchResponse({}, 500));

    const result = await updateHighlight(5, { color: "#86efac" });

    expect(result).toEqual({
      ok: false,
      error: "Failed to update highlight",
      data: null,
    });
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns an error instead of throwing when the lookup fails", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockRejectedValue(new Error("API down"));

    const result = await updateHighlight(5, { color: "#86efac" });

    expect(result).toEqual({
      ok: false,
      error: "Failed to update highlight",
      data: null,
    });
  });
});

describeServerActionAuth("deleteHighlight", {
  requireRole: mockedRequireRole,
  invoke: () => deleteHighlight(5),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
      fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));
    },
    expect: (result) => {
      expect(result.ok).toBe(true);
    },
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("deleteHighlight", () => {
  it("DELETEs the highlight and revalidates the caller's tag", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));

    const result = await deleteHighlight(5);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/highlights/5"),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.highlights(7));
    expect(result).toEqual({ ok: true, error: null, data: { id: 5 } });
  });

  it("does not let an admin delete someone else's highlight", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());

    const result = await deleteHighlight(5);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a missing highlight", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue([]);

    const result = await deleteHighlight(5);

    expect(result).toEqual({
      ok: false,
      error: "Highlight not found",
      data: null,
    });
  });

  it("returns an error when Strapi answers not ok", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    fetchMock.mockResolvedValue(makeFetchResponse({}, 404));

    const result = await deleteHighlight(5);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete highlight",
      data: null,
    });
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns an error instead of throwing on a network error", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    mockedFetchAPI.mockResolvedValue(highlightOwnedBySeven());
    fetchMock.mockRejectedValue(new Error("Connection reset"));

    const result = await deleteHighlight(5);

    expect(result).toEqual({
      ok: false,
      error: "Failed to delete highlight",
      data: null,
    });
  });
});
