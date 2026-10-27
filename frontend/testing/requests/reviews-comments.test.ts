import {
  addComment,
  editComment,
  deleteComment,
  resolveComment,
} from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import {
  mockGlobalFetch,
  makeFetchResponse,
  makeEmptyResponse,
} from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
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

const ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.ContentEditor,
];
const reviewer = () =>
  authFixtures.as({ id: 9, roles: [AuthorizedUserRoleTitle.ContentEditor] });
const admin = () =>
  authFixtures.as({ id: 9, roles: [AuthorizedUserRoleTitle.SysAdmin] });

let fetchMock: jest.MockedFunction<typeof fetch>;

const anchor = {
  v: 1 as const,
  field: "blocks" as const,
  quote: "hello",
  prefix: "",
  suffix: "",
};
const validInput = {
  reviewId: 7,
  lessonId: 4,
  field: "blocks" as const,
  anchor,
  body: "Fix this",
};
const overviewInput = {
  reviewId: 7,
  lessonId: null,
  field: "overview" as const,
  anchor: { ...anchor, field: "overview" as const },
  body: "Fix this",
};

type Opts = {
  state?: string;
  reviewerId?: number;
  authorId?: number;
  lessons?: object[];
  review?: object | null;
  commentDroplet?: number;
};

/** Routes fetchAPI by path and mocks a successful raw write. */
function arrange(o: Opts = {}) {
  const state = o.state ?? "open";
  mockedFetchAPI.mockImplementation((async (path: string) => {
    if (path === "/reviews") {
      if (o.review === null) return [];
      return [
        {
          id: 7,
          documentId: "review-7",
          state,
          droplet: { id: 3 },
          reviewer: { id: o.reviewerId ?? 9 },
          ...o.review,
        },
      ];
    }
    if (path === "/review-comments") {
      return [
        {
          id: 21,
          documentId: "comment-21",
          resolvedAt: null,
          author: { id: o.authorId ?? 9 },
          review: { state, droplet: { id: o.commentDroplet ?? 3 } },
        },
      ];
    }
    if (path === "/lessons") {
      return o.lessons ?? [{ id: 4, documentId: "lesson-4" }];
    }
    return [];
  }) as any);
  fetchMock.mockResolvedValue(
    makeFetchResponse({
      data: { id: 30, attributes: { id: 30, body: "saved" } },
    }),
  );
}

function sentBodies(): any[] {
  return fetchMock.mock.calls.map(([, init]) =>
    init?.body ? JSON.parse(String(init.body)).data : undefined,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(reviewer());
});

const expectDenied = (result: any, code: string) =>
  expect(result).toEqual({ ok: false, error: code, data: null });

describeServerActionAuth("addComment", {
  requireRole: mockedRequireRole,
  invoke: () => addComment(validInput),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => arrange(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describeServerActionAuth("editComment", {
  requireRole: mockedRequireRole,
  invoke: () => editComment(21, "new"),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => arrange(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describeServerActionAuth("deleteComment", {
  requireRole: mockedRequireRole,
  invoke: () => deleteComment(21),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => {
      arrange();
      fetchMock.mockResolvedValue(makeEmptyResponse(204));
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describeServerActionAuth("resolveComment", {
  requireRole: mockedRequireRole,
  invoke: () => resolveComment(21),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => arrange(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describe("addComment", () => {
  it("writes relations from fetched rows, never a client documentId", async () => {
    arrange();

    const result = await addComment({
      ...validInput,
      documentId: "evil",
      review: { id: 99, documentId: "evil" },
    } as any);

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/review-comments$/);
    expect(init?.method).toBe("POST");
    expect(sentBodies()[0]).toEqual({
      review: "review-7",
      lesson: "lesson-4",
      field: "blocks",
      anchor,
      body: "Fix this",
      author: "doc9",
    });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain("evil");
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("checks the lesson belongs to the review's droplet", async () => {
    arrange();

    await addComment(validInput);

    expect(mockedFetchAPI).toHaveBeenCalledWith(
      "/lessons",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: {
            id: { $eq: 4 },
            droplets: { id: { $eq: 3 } },
          },
        }),
        cache: "no-store",
      }),
    );
  });

  it("returns invalid_input when the lesson isn't in the droplet", async () => {
    arrange({ lessons: [] });

    expectDenied(await addComment(validInput), "invalid_input");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("omits lesson for a droplet-level comment", async () => {
    arrange();

    await addComment(overviewInput);

    expect(sentBodies()[0]).not.toHaveProperty("lesson");
    expect(mockedFetchAPI).not.toHaveBeenCalledWith(
      "/lessons",
      expect.anything(),
    );
  });

  it("refuses another reviewer's review", async () => {
    arrange({ reviewerId: 12 });

    expectDenied(await addComment(validInput), "forbidden");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses another reviewer's review even for a SysAdmin", async () => {
    mockedRequireRole.mockResolvedValue(admin());
    arrange({ reviewerId: 12 });

    expectDenied(await addComment(validInput), "forbidden");
  });

  it("returns review_closed for a sent review", async () => {
    arrange({ state: "sent" });

    expectDenied(await addComment(validInput), "review_closed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not_found for a missing review or droplet", async () => {
    arrange({ review: null });
    expectDenied(await addComment(validInput), "not_found");

    arrange({ review: { droplet: null } });
    expectDenied(await addComment(validInput), "not_found");
  });

  it("rejects an invalid anchor without any fetch", async () => {
    const bad = { ...validInput, anchor: { ...anchor, v: 2 } };

    expectDenied(await addComment(bad as any), "invalid_input");
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns failed when the POST fails", async () => {
    arrange();
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 500 } }, 500),
    );

    expectDenied(await addComment(validInput), "failed");
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});

describe("editComment", () => {
  it("PUTs to the fetched comment's documentId", async () => {
    arrange();

    const result = await editComment(21, "  new  ");

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/review-comments\/comment-21$/);
    expect(init?.method).toBe("PUT");
    expect(sentBodies()[0]).toEqual({ body: "new" });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("rejects an object id and an empty body without any fetch", async () => {
    arrange();

    expectDenied(
      await editComment({ id: 21, documentId: "evil" } as any, "x"),
      "invalid_input",
    );
    expectDenied(await editComment(21, "   "), "invalid_input");
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("another reviewer's comment", () => {
  it.each([
    ["ContentEditor", reviewer],
    ["SysAdmin", admin],
  ])("%s can't edit or delete it", async (_name, as) => {
    mockedRequireRole.mockResolvedValue(as());
    arrange({ authorId: 12 });

    expectDenied(await editComment(21, "x"), "forbidden");
    expectDenied(await deleteComment(21), "forbidden");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("can still be resolved", async () => {
    arrange({ authorId: 12 });

    const result = await resolveComment(21);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("closed review", () => {
  it("refuses all four writes without a fetch", async () => {
    arrange({ state: "sent" });

    expectDenied(await addComment(validInput), "review_closed");
    expectDenied(await editComment(21, "x"), "review_closed");
    expectDenied(await deleteComment(21), "review_closed");
    expectDenied(await resolveComment(21), "review_closed");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});

describe("deleteComment", () => {
  it("DELETEs the fetched comment and reads the 204", async () => {
    arrange();
    fetchMock.mockResolvedValue(makeEmptyResponse(204));

    const result = await deleteComment(21);

    expect(result).toEqual({ ok: true, error: null, data: { id: 21 } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/review-comments\/comment-21$/);
    expect(init?.method).toBe("DELETE");
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("returns failed when the DELETE fails", async () => {
    arrange();
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 500 } }, 500),
    );

    expectDenied(await deleteComment(21), "failed");
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});

describe("resolveComment", () => {
  it("sets resolvedAt to now by default", async () => {
    arrange();

    await resolveComment(21);

    expect(typeof sentBodies()[0].resolvedAt).toBe("string");
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("clears resolvedAt with false", async () => {
    arrange();

    await resolveComment(21, false);

    expect(sentBodies()[0]).toEqual({ resolvedAt: null });
  });

  it("rejects a non-boolean flag", async () => {
    arrange();

    expectDenied(await resolveComment(21, "no" as any), "invalid_input");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("error handling", () => {
  it("logs and returns failed when a lookup throws", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedFetchAPI.mockRejectedValue(new Error("boom"));

    expectDenied(await editComment(21, "x"), "failed");
    expectDenied(await addComment(validInput), "failed");
    expect(spy).toHaveBeenCalledWith("editComment failed", expect.any(Error));
    expect(spy).toHaveBeenCalledWith("addComment failed", expect.any(Error));
    spy.mockRestore();
  });

  it("logs the status and path when a write is not ok", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    arrange();
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 500 } }, 500),
    );

    expectDenied(await addComment(validInput), "failed");
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/api/review-comments"),
      500,
      expect.anything(),
    );
    expect(JSON.stringify(spy.mock.calls)).not.toContain("Bearer");
    spy.mockRestore();
  });
});

describe("lookups and tags inside writes", () => {
  it("makes every lookup uncached", async () => {
    arrange();
    await addComment(validInput);
    await editComment(21, "x");
    for (const p of ["/reviews", "/review-comments", "/lessons"]) {
      const calls = mockedFetchAPI.mock.calls.filter(([path]) => path === p);
      expect(calls.length).toBeGreaterThan(0);
      for (const [, cfg] of calls) {
        expect(cfg).toMatchObject({ cache: "no-store" });
        expect(cfg).not.toHaveProperty("next");
      }
    }
  });

  it("revalidates the fetched review's droplet, not the input's", async () => {
    arrange({ review: { droplet: { id: 4 } }, commentDroplet: 4 });
    await addComment(validInput);
    await editComment(21, "x");
    expect(mockedRevalidateTag).toHaveBeenCalledTimes(2);
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-4");
    expect(mockedRevalidateTag).not.toHaveBeenCalledWith("review-3");
  });
});
