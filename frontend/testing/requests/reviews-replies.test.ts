import { replyToComment, editReply, deleteReply } from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

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

const { ContentEditor } = AuthorizedUserRoleTitle;
const author = () => authFixtures.as({ id: 5, roles: [] });
const authorEditor = () => authFixtures.as({ id: 5, roles: [ContentEditor] });
const reviewer = () => authFixtures.as({ id: 9, roles: [ContentEditor] });
const otherReviewer = () => authFixtures.as({ id: 10, roles: [ContentEditor] });
const stranger = () => authFixtures.as({ id: 6, roles: [] });

let fetchMock: jest.MockedFunction<typeof fetch>;

type Opts = {
  /** State of the review holding the target comment */
  state?: string;
  /** The target is a carried copy of root 4 */
  copy?: boolean;
  /** The target is itself a reply */
  isReply?: boolean;
  /** A sent resolve closes the thread */
  closed?: boolean;
  /** The target itself carries a resolvedAt (an unsent resolve) */
  resolved?: boolean;
  status?: string;
  missing?: boolean;
};

const TARGET = 21;
const ROOT = 4;

const droplet = (status: string) => ({
  id: 3,
  status,
  authorized_users: [{ id: 5 }],
});

/** The target row (id 21) and, for a copy, its root (id 4) on a sent review. */
function arrange(o: Opts = {}) {
  const row = (id: number, extra: object) => ({
    id,
    documentId: `comment-${id}`,
    field: "blocks",
    anchor: { quote: "q" },
    lesson: { id: 11, documentId: "lesson-11" },
    parent: null,
    carriedFrom: null,
    ...extra,
  });
  mockedFetchAPI.mockImplementation((async (path: string, cfg: any) => {
    if (path !== "/review-comments" || o.missing) return [];
    const filters = cfg.urlParams.filters;
    if (filters.$or) {
      const named = filters.$or[0].id.$eq;
      return o.closed && named === (o.copy ? ROOT : TARGET)
        ? [{ id: named }]
        : [];
    }
    const review = (state: string, id: number) => ({
      documentId: `review-${id}`,
      state,
      droplet: droplet(o.status ?? "draft"),
    });
    if (filters.id.$eq === ROOT) {
      return [row(ROOT, { review: review("sent", 70) })];
    }
    return [
      row(TARGET, {
        review: review(o.state ?? "sent", o.copy ? 71 : 70),
        resolvedAt: o.resolved ? "2026-11-04T00:00:00.000Z" : null,
        ...(o.copy && { carriedFrom: { id: ROOT } }),
        ...(o.isReply && { parent: { id: ROOT } }),
      }),
    ];
  }) as any);
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { id: 30, attributes: { id: 30, body: "hi" } } }),
  );
}

const sent = () => JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).data;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(author());
});

describeServerActionAuth("replyToComment", {
  requireRole: mockedRequireRole,
  invoke: () => replyToComment(TARGET, "Thanks"),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: stranger(),
    roles: [],
    arrange: () => arrange(),
  },
  authorized: {
    as: author(),
    arrange: () => arrange(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("replyToComment", () => {
  it.each([
    ["an author, in or out of review (G13)", author, {}],
    ["an author with a Content Editor role, as an author", authorEditor, {}],
    [
      "the comment's reviewer on a carried copy",
      reviewer,
      {
        state: "open",
        copy: true,
      },
    ],
    ["a different reviewer on a sent comment", otherReviewer, {}],
  ])("accepts %s", async (_n, who, opts: Opts) => {
    mockedRequireRole.mockResolvedValue(who());
    arrange(opts);

    const result = await replyToComment(TARGET, " Thanks ");

    expect(result.ok).toBe(true);
    expect(sent()).toEqual({
      review: "review-70",
      parent: opts.copy ? "comment-4" : "comment-21",
      field: "blocks",
      anchor: { quote: "q" },
      lesson: "lesson-11",
      body: "Thanks",
      author: expect.any(String),
    });
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("attaches a copy's reply to the root, not the copy", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ state: "open", copy: true });

    await replyToComment(TARGET, "x");

    expect(sent()).toMatchObject({ parent: "comment-4", review: "review-70" });
  });

  it.each([
    [
      "an author on an open-review copy",
      author,
      { state: "open", copy: true },
      "review_closed",
    ],
    [
      "a reviewer on a fresh unsent comment",
      reviewer,
      { state: "open" },
      "review_closed",
    ],
    [
      "an author with a Content Editor role on an open-review copy",
      authorEditor,
      { state: "open", copy: true },
      "review_closed",
    ],
    ["a closed thread", author, { closed: true }, "review_closed"],
    [
      "a copy whose root thread is closed",
      reviewer,
      { state: "open", copy: true, closed: true },
      "review_closed",
    ],
    ["a published droplet", author, { status: "published" }, "review_closed"],
    ["a reply to a reply", author, { isReply: true }, "invalid_input"],
    ["a role-less non-author", stranger, {}, "forbidden"],
    ["a missing comment", author, { missing: true }, "not_found"],
  ])("refuses %s", async (_n, who, opts: Opts, code) => {
    mockedRequireRole.mockResolvedValue(who());
    arrange(opts);

    expect(await replyToComment(TARGET, "x")).toEqual({
      ok: false,
      error: code,
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts a reply on a copy resolved in an unsent round", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ state: "open", copy: true, resolved: true });

    expect((await replyToComment(TARGET, "x")).ok).toBe(true);
    const closedCall = mockedFetchAPI.mock.calls.find(
      ([, cfg]) => (cfg as any).urlParams.filters.$or,
    );
    const filters = (closedCall![1] as any).urlParams.filters;
    expect(filters.$or).toEqual([
      { id: { $eq: ROOT } },
      { carriedFrom: { id: { $eq: ROOT } } },
    ]);
    expect(filters.review).toEqual({ state: { $in: ["sent", "published"] } });
  });

  it("returns the saved reply with its parent and mine set", async () => {
    arrange();

    const result = await replyToComment(TARGET, "x");

    expect(result.data).toMatchObject({
      id: 30,
      parent: { id: TARGET },
      mine: true,
    });
  });

  it.each(["", "   "])(
    "rejects the blank body %j without a fetch",
    async (b) => {
      expect(await replyToComment(TARGET, b)).toEqual({
        ok: false,
        error: "invalid_input",
        data: null,
      });
      expect(mockedFetchAPI).not.toHaveBeenCalled();
    },
  );

  it("returns failed when the POST fails", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    arrange();
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 500 } }, 500),
    );

    expect((await replyToComment(TARGET, "x")).error).toBe("failed");
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

type OwnOpts = {
  authorId?: number;
  parent?: boolean;
  closed?: boolean;
  later?: boolean;
  status?: string;
};

/** Reply 21 (parent root 4, by user 5) with optional closure / later reply. */
function arrangeOwn(o: OwnOpts = {}) {
  mockedFetchAPI.mockImplementation((async (path: string, cfg: any) => {
    if (path !== "/review-comments") return [];
    const filters = cfg.urlParams.filters;
    if (filters.$or) return o.closed ? [{ id: ROOT }] : [];
    if (filters.id.$gt !== undefined) return o.later ? [{ id: 25 }] : [];
    return [
      {
        id: TARGET,
        documentId: "comment-21",
        parent: o.parent === false ? null : { id: ROOT },
        author: { id: o.authorId ?? 5 },
        review: {
          documentId: "review-70",
          state: "sent",
          droplet: droplet(o.status ?? "draft"),
        },
      },
    ];
  }) as any);
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { id: 21, attributes: { id: 21, body: "e" } } }),
  );
}

describe.each([
  ["editReply", () => editReply(TARGET, " New ")],
  ["deleteReply", () => deleteReply(TARGET)],
])("%s", (name, invoke) => {
  const isEdit = name === "editReply";

  it.each([
    ["the author with no later other reply", author, {}],
    ["a reviewer who wrote it", reviewer, { authorId: 9 }],
  ])("allows %s", async (_n, who, opts: OwnOpts) => {
    mockedRequireRole.mockResolvedValue(who());
    arrangeOwn(opts);

    const result = await invoke();

    expect(result.ok).toBe(true);
    expect(fetchMock.mock.calls.at(-1)?.[1]?.method).toBe(
      isEdit ? "PUT" : "DELETE",
    );
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("only counts later replies by someone else", async () => {
    arrangeOwn();

    await invoke();

    const call = mockedFetchAPI.mock.calls.find(
      ([, cfg]) => (cfg as any).urlParams.filters.id?.$gt !== undefined,
    );
    expect((call![1] as any).urlParams.filters).toEqual({
      parent: { id: { $eq: ROOT } },
      id: { $gt: TARGET },
      author: { id: { $ne: 5 } },
    });
  });

  it.each([
    ["someone else's reply", author, { authorId: 6 }, "forbidden"],
    ["a later reply by another person", author, { later: true }, "conflict"],
    ["a closed thread", author, { closed: true }, "review_closed"],
    ["a published droplet", author, { status: "published" }, "review_closed"],
    ["a top-level comment", author, { parent: false }, "invalid_input"],
    ["a role-less non-author", stranger, { authorId: 6 }, "forbidden"],
    [
      "someone else's reply on a published droplet",
      author,
      { authorId: 6, status: "published" },
      "forbidden",
    ],
    [
      "someone else's reply in a closed thread",
      author,
      { authorId: 6, closed: true },
      "forbidden",
    ],
    [
      "someone else's top-level comment",
      author,
      { authorId: 6, parent: false },
      "invalid_input",
    ],
  ])("refuses %s", async (_n, who, opts: OwnOpts, code) => {
    mockedRequireRole.mockResolvedValue(who());
    arrangeOwn(opts);

    const result = await invoke();

    expect(result).toMatchObject({ ok: false, error: code, data: null });
    if (code === "conflict") {
      expect((result as any).message).toBe("Someone has replied since.");
    }
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});

it("editReply rejects a blank body", async () => {
  expect(await editReply(TARGET, "  ")).toMatchObject({
    error: "invalid_input",
  });
  expect(mockedFetchAPI).not.toHaveBeenCalled();
});
