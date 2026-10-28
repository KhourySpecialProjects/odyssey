import {
  submitForReview,
  withdrawFromReview,
  sendFeedback,
  publishWithReview,
} from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { loadDropletForWrite } from "@/lib/auth/review-freeze";
import { revalidateTag } from "next/cache";
import { AuthorizedUserRoleTitle as Role } from "@/lib/globals";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/auth/review-freeze", () => ({
  loadDropletForWrite: jest.fn(),
}));
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedLoad = jest.mocked(loadDropletForWrite);
const mockedRevalidateTag = jest.mocked(revalidateTag);

const REVIEWER_ROLES = [Role.SysAdmin, Role.ContentEditor];
const AUTHOR_ID = 7;
const REVIEWER_ID = 9;
const author = () => authFixtures.as({ id: AUTHOR_ID, roles: [] });
const editor = (id = REVIEWER_ID) =>
  authFixtures.as({ id, roles: [Role.ContentEditor] });

let fetchMock: jest.MockedFunction<typeof fetch>;

const droplet = (overrides: object = {}) => ({
  id: 3,
  documentId: "doc3",
  name: "Droplet",
  inReview: true,
  status: "draft",
  originalDropletId: null as number | null,
  ownerIds: [AUTHOR_ID],
  ...overrides,
});

const tags = () => mockedRevalidateTag.mock.calls.map(([tag]) => tag);

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  fetchMock = mockGlobalFetch();
  fetchMock.mockResolvedValue(makeFetchResponse({ data: {} }));
  mockedLoad.mockResolvedValue(droplet());
});

type Case = {
  name: string;
  action: string;
  invoke: () => Promise<{ ok: boolean; error: unknown; data: unknown }>;
  caller: () => ReturnType<typeof authFixtures.as>;
  body: object;
  okData: object;
  okBody: object;
  tags: string[];
};

const submitCase: Case = {
  name: "submitForReview",
  action: "submit-review",
  invoke: () => submitForReview(3),
  caller: author,
  body: {},
  okBody: { data: { changed: true, round: 2 } },
  okData: { changed: true, round: 2 },
  tags: [CACHE_TAGS.droplets, CACHE_TAGS.allUserContent, CACHE_TAGS.review(3)],
};
const withdrawCase: Case = {
  name: "withdrawFromReview",
  action: "withdraw-review",
  invoke: () => withdrawFromReview(3),
  caller: author,
  body: {},
  okBody: { data: { changed: true } },
  okData: { changed: true },
  tags: submitCase.tags,
};
const sendCase: Case = {
  name: "sendFeedback",
  action: "send-feedback",
  invoke: () => sendFeedback(3, "Nice work"),
  caller: () => editor(),
  body: { reviewerId: REVIEWER_ID, summaryNote: "Nice work" },
  okBody: { data: { reviewId: 11 } },
  okData: { reviewId: 11 },
  tags: [...submitCase.tags, CACHE_TAGS.announcements],
};
const publishCase: Case = {
  name: "publishWithReview",
  action: "publish-review",
  invoke: () => publishWithReview(3),
  caller: () => editor(),
  body: { reviewerId: REVIEWER_ID, originalDropletId: null },
  okBody: { data: { slug: "my-droplet", reviewId: 11, dropletId: 3 } },
  okData: { slug: "my-droplet", reviewId: 11, dropletId: 3 },
  tags: [CACHE_TAGS.droplets, CACHE_TAGS.review(3), CACHE_TAGS.announcements],
};
const ALL = [submitCase, withdrawCase, sendCase, publishCase];

describeServerActionAuth("submitForReview", {
  requireRole: mockedRequireRole,
  invoke: () => submitForReview(3),
  mutations: () => [fetchMock],
  denial: { kind: "owner", nonOwner: editor(99), roles: [] },
  authorized: {
    as: author(),
    arrange: () => {
      mockedLoad.mockResolvedValue(droplet());
      fetchMock.mockResolvedValue(makeFetchResponse(submitCase.okBody));
    },
    expect: (r) => expect(r.ok).toBe(true),
  },
  expectDenied: (r, code) =>
    expect(r).toEqual({ ok: false, error: code, data: null }),
});

describeServerActionAuth("withdrawFromReview", {
  requireRole: mockedRequireRole,
  invoke: () => withdrawFromReview(3),
  mutations: () => [fetchMock],
  denial: { kind: "owner", nonOwner: editor(99), roles: [] },
  authorized: {
    as: author(),
    arrange: () => {
      mockedLoad.mockResolvedValue(droplet());
      fetchMock.mockResolvedValue(makeFetchResponse(withdrawCase.okBody));
    },
    expect: (r) => expect(r.ok).toBe(true),
  },
  expectDenied: (r, code) =>
    expect(r).toEqual({ ok: false, error: code, data: null }),
});

describeServerActionAuth("sendFeedback", {
  requireRole: mockedRequireRole,
  invoke: () => sendFeedback(3, "Nice"),
  mutations: () => [fetchMock],
  denial: { kind: "role", roles: REVIEWER_ROLES },
  authorized: {
    as: editor(),
    arrange: () => {
      mockedLoad.mockResolvedValue(droplet());
      fetchMock.mockResolvedValue(makeFetchResponse(sendCase.okBody));
    },
    expect: (r) => expect(r.ok).toBe(true),
  },
  expectDenied: (r, code) =>
    expect(r).toEqual({ ok: false, error: code, data: null }),
});

describeServerActionAuth("publishWithReview", {
  requireRole: mockedRequireRole,
  invoke: () => publishWithReview(3),
  mutations: () => [fetchMock],
  denial: { kind: "role", roles: REVIEWER_ROLES },
  authorized: {
    as: editor(),
    arrange: () => {
      mockedLoad.mockResolvedValue(droplet());
      fetchMock.mockResolvedValue(makeFetchResponse(publishCase.okBody));
    },
    expect: (r) => expect(r.ok).toBe(true),
  },
  expectDenied: (r, code) =>
    expect(r).toEqual({ ok: false, error: code, data: null }),
});

describe("who may call each review workflow action", () => {
  const admin = () => authFixtures.as({ id: 50, roles: [Role.SysAdmin] });
  const authorEditor = () =>
    authFixtures.as({ id: AUTHOR_ID, roles: [Role.ContentEditor] });

  it.each([submitCase, withdrawCase])(
    "$name: an author may, a non-author Admin and an Editor may not",
    async (c) => {
      mockedRequireRole.mockResolvedValue(author());
      expect((await c.invoke()).ok).toBe(true);

      for (const caller of [admin(), editor(99)]) {
        fetchMock.mockClear();
        mockedRequireRole.mockResolvedValue(caller);
        expect(await c.invoke()).toEqual({
          ok: false,
          error: "forbidden",
          data: null,
        });
        expect(fetchMock).not.toHaveBeenCalled();
      }
    },
  );

  it.each([submitCase, withdrawCase])(
    "$name: an author who is also an Editor may",
    async (c) => {
      mockedRequireRole.mockResolvedValue(authorEditor());
      expect((await c.invoke()).ok).toBe(true);
    },
  );

  it.each([sendCase, publishCase])(
    "$name: a non-author Editor and Admin may; an author Editor may not",
    async (c) => {
      for (const caller of [editor(), admin()]) {
        mockedRequireRole.mockResolvedValue(caller);
        expect((await c.invoke()).ok).toBe(true);
      }

      fetchMock.mockClear();
      mockedRequireRole.mockResolvedValue(authorEditor());
      expect(await c.invoke()).toEqual({
        ok: false,
        error: "forbidden",
        data: null,
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );
});

describe.each(ALL)("$name request", (c) => {
  beforeEach(() => {
    mockedRequireRole.mockResolvedValue(c.caller());
    fetchMock.mockResolvedValue(makeFetchResponse(c.okBody));
  });

  it("makes one POST to the route by the fresh read's documentId", async () => {
    mockedLoad.mockResolvedValue(droplet({ documentId: "docFresh" }));

    const result = await c.invoke();

    expect(result).toEqual({ ok: true, error: null, data: c.okData });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(
      new RegExp(`/api/droplets/docFresh/${c.action}$`),
    );
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject({ "Strapi-Response-Format": "v4" });
    expect(JSON.parse(String(init?.body))).toEqual(c.body);
    expect(mockedLoad).toHaveBeenCalledWith(3);
  });

  it("answers not_found and posts nothing without a documentId", async () => {
    mockedLoad.mockResolvedValue(droplet({ documentId: null }));
    expect(await c.invoke()).toMatchObject({ ok: false, error: "not_found" });
    mockedLoad.mockResolvedValue(null);
    expect(await c.invoke()).toMatchObject({ ok: false, error: "not_found" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("revalidates its tags on success", async () => {
    await c.invoke();
    expect(tags()).toEqual(expect.arrayContaining(c.tags));
  });

  it("maps a 409 to conflict with the message, and revalidates nothing", async () => {
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "Already sent." } }, 409),
    );
    expect(await c.invoke()).toEqual({
      ok: false,
      error: "conflict",
      data: null,
      message: "Already sent.",
    });
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("maps a 404 and a 400 without revalidating", async () => {
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "Gone." } }, 404),
    );
    expect(await c.invoke()).toMatchObject({
      error: "not_found",
      message: "Gone.",
    });
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { message: "Bad." } }, 400),
    );
    expect(await c.invoke()).toMatchObject({
      error: "invalid_input",
      message: "Bad.",
    });
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("maps a 500 with a message to failed, and revalidates", async () => {
    fetchMock.mockResolvedValue(
      makeFetchResponse(
        { error: { message: "Boom. Nothing was changed." } },
        500,
      ),
    );
    expect(await c.invoke()).toMatchObject({
      ok: false,
      error: "failed",
      message: "Boom. Nothing was changed.",
    });
    expect(tags()).toEqual(expect.arrayContaining(c.tags));
  });

  it("maps a 500 with no message to unconfirmed, and revalidates", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse(null, 502));
    expect(await c.invoke()).toMatchObject({ ok: false, error: "unconfirmed" });
    expect(tags()).toEqual(expect.arrayContaining(c.tags));
  });

  it("maps a rejected fetch to unconfirmed, and revalidates", async () => {
    fetchMock.mockRejectedValue(new Error("socket hang up"));
    expect(await c.invoke()).toMatchObject({ ok: false, error: "unconfirmed" });
    expect(tags()).toEqual(expect.arrayContaining(c.tags));
  });
});

describe("workflow-specific behavior", () => {
  it("submit: an in-review droplet still POSTs, and changed:false is ok", async () => {
    mockedRequireRole.mockResolvedValue(author());
    mockedLoad.mockResolvedValue(droplet({ inReview: true }));
    fetchMock.mockResolvedValue(
      makeFetchResponse({ data: { changed: false, round: 2 } }),
    );

    const result = await submitForReview(3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      error: null,
      data: { changed: false, round: 2 },
    });
  });

  it("withdraw: changed:false is ok", async () => {
    mockedRequireRole.mockResolvedValue(author());
    fetchMock.mockResolvedValue(
      makeFetchResponse({ data: { changed: false } }),
    );

    expect(await withdrawFromReview(3)).toEqual({
      ok: true,
      error: null,
      data: { changed: false },
    });
  });

  it("send: omits an empty note, and rejects one over 5000 characters", async () => {
    mockedRequireRole.mockResolvedValue(editor());
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { reviewId: 1 } }));

    await sendFeedback(3, "");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      reviewerId: REVIEWER_ID,
    });

    fetchMock.mockClear();
    expect(await sendFeedback(3, "x".repeat(5001))).toEqual({
      ok: false,
      error: "invalid_input",
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("publish: sends the read's originalDropletId and flushes both review tags", async () => {
    mockedRequireRole.mockResolvedValue(editor());
    mockedLoad.mockResolvedValue(droplet({ originalDropletId: 40 }));
    fetchMock.mockResolvedValue(
      makeFetchResponse({ data: { slug: "live", reviewId: 5, dropletId: 40 } }),
    );

    await publishWithReview(3);

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      reviewerId: REVIEWER_ID,
      originalDropletId: 40,
    });
    expect(tags()).toEqual(
      expect.arrayContaining([
        CACHE_TAGS.review(3),
        CACHE_TAGS.review(40),
        CACHE_TAGS.announcements,
        CACHE_TAGS.lesson,
      ]),
    );
  });

  it("rejects a bad id without reading or posting", async () => {
    mockedRequireRole.mockResolvedValue(author());

    expect(await submitForReview(0)).toEqual({
      ok: false,
      error: "invalid_input",
      data: null,
    });
    expect(mockedLoad).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
