import { markAddressed } from "@/lib/requests/reviews";
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

// The droplet's author, as a Faculty member or as a reviewer role
const author = () =>
  authFixtures.as({ id: 5, roles: [AuthorizedUserRoleTitle.Faculty] });
const authorAdmin = () =>
  authFixtures.as({ id: 5, roles: [AuthorizedUserRoleTitle.SysAdmin] });
const reviewer = () =>
  authFixtures.as({ id: 9, roles: [AuthorizedUserRoleTitle.ContentEditor] });

let fetchMock: jest.MockedFunction<typeof fetch>;

type Opts = {
  state?: string;
  round?: number;
  reviewRound?: number;
  inReview?: boolean;
  authors?: number[];
  missing?: boolean;
};

/** A comment on a review of droplet 3, looked up by fetchAPI. */
function arrange(o: Opts = {}) {
  mockedFetchAPI.mockImplementation((async (path: string) => {
    if (path !== "/review-comments" || o.missing) return [];
    return [
      {
        id: 21,
        documentId: "comment-21",
        author: { id: 9 },
        review: {
          state: o.state ?? "sent",
          round: o.round ?? 1,
          droplet: {
            id: 3,
            inReview: o.inReview ?? false,
            reviewRound: o.reviewRound ?? 1,
            authorized_users: (o.authors ?? [5]).map((id) => ({ id })),
          },
        },
      },
    ];
  }) as any);
  fetchMock.mockResolvedValue(
    makeFetchResponse({
      data: { id: 21, attributes: { id: 21, addressedAt: "now" } },
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
  mockedRequireRole.mockResolvedValue(author());
});

const expectDenied = (result: any, code: string) =>
  expect(result).toEqual({ ok: false, error: code, data: null });

describeServerActionAuth("markAddressed", {
  requireRole: mockedRequireRole,
  invoke: () => markAddressed(21),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99 }),
    arrange: () => arrange(),
  },
  authorized: {
    as: author(),
    arrange: () => arrange(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describe("markAddressed (ODY-807)", () => {
  it("sets addressedAt to now, on the fetched comment, and revalidates its droplet", async () => {
    arrange();

    const result = await markAddressed(21);

    expect(result.ok).toBe(true);
    const [[url, init]] = fetchMock.mock.calls;
    expect(String(url)).toContain("/api/review-comments/comment-21");
    expect(init?.method).toBe("PUT");
    expect(Object.keys(sentBodies()[0])).toEqual(["addressedAt"]);
    expect(typeof sentBodies()[0].addressedAt).toBe("string");
    expect(mockedRevalidateTag).toHaveBeenCalledWith("review-3");
  });

  it("clears addressedAt with false", async () => {
    arrange();

    await markAddressed(21, false);

    expect(sentBodies()[0]).toEqual({ addressedAt: null });
  });

  it("lets an author mark their droplet whatever their role", async () => {
    arrange();
    mockedRequireRole.mockResolvedValue(authorAdmin());

    expect((await markAddressed(21)).ok).toBe(true);
  });

  it("refuses a reviewer who isn't an author, even the comment's writer", async () => {
    arrange();
    mockedRequireRole.mockResolvedValue(reviewer());

    expectDenied(await markAddressed(21), "forbidden");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an open review, which the creator never sees", async () => {
    arrange({ state: "open" });

    expectDenied(await markAddressed(21), "review_closed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a published review", async () => {
    arrange({ state: "published" });

    expectDenied(await markAddressed(21), "review_closed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses once the draft is back in review, when the comment has been carried", async () => {
    arrange({ inReview: true, reviewRound: 2, round: 1 });

    expectDenied(await markAddressed(21), "review_closed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses a comment from an earlier round", async () => {
    arrange({ round: 1, reviewRound: 2 });

    expectDenied(await markAddressed(21), "review_closed");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns not_found for a missing comment", async () => {
    arrange({ missing: true });

    expectDenied(await markAddressed(21), "not_found");
  });

  it("rejects a bad id or flag without any fetch", async () => {
    arrange();

    expectDenied(await markAddressed("21" as any), "invalid_input");
    expectDenied(await markAddressed(21, "yes" as any), "invalid_input");
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("reads the comment uncached", async () => {
    arrange();

    await markAddressed(21);

    const [[, cfg]] = mockedFetchAPI.mock.calls;
    expect(cfg).toMatchObject({ cache: "no-store" });
  });

  it("returns failed when the PUT fails", async () => {
    arrange();
    fetchMock.mockResolvedValue(makeFetchResponse({}, 500));
    jest.spyOn(console, "error").mockImplementation(() => {});

    expectDenied(await markAddressed(21), "failed");
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});
