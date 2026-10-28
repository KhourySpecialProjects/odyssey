import { getMyReview } from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { authFixtures } from "@/testing/helpers/server-action-auth";

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

const { SysAdmin, ContentEditor } = AuthorizedUserRoleTitle;
const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);

/** Editor 9 reviews droplet 3, which user 5 wrote. */
const reviewer = () => authFixtures.as({ id: 9, roles: [ContentEditor] });

type Cfg = {
  urlParams?: {
    filters?: Record<string, any>;
    pagination?: { page?: number; pageSize?: number };
  };
};

/** Routes fetchAPI by path; `review: null` means no review has that key. */
function arrange(
  opts: { review?: object | null; comments?: number; droplet?: object } = {},
) {
  const review = opts.review === undefined ? { id: 70, round: 2 } : opts.review;
  mockedFetchAPI.mockImplementation((async (path: string, cfg: Cfg) => {
    const { page = 1, pageSize = 25 } = cfg.urlParams?.pagination ?? {};
    if (path === "/droplets") {
      return [
        {
          id: 3,
          documentId: "d3",
          inReview: true,
          reviewRound: 2,
          authorized_users: [{ id: 5 }],
          ...opts.droplet,
        },
      ];
    }
    if (path === "/reviews") return review ? [review] : [];
    if (path === "/review-comments") {
      return Array.from({ length: opts.comments ?? 0 }, (_, i) => ({
        id: i + 1,
      })).slice((page - 1) * pageSize, page * pageSize);
    }
    return [];
  }) as any);
}

const callsTo = (p: string) =>
  mockedFetchAPI.mock.calls.filter(([path]) => path === p) as [string, Cfg][];

beforeEach(() => jest.clearAllMocks());

describe("getMyReview", () => {
  it("refuses a signed-out caller without fetching", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.loggedOut());

    expect(await getMyReview(3)).toEqual({
      ok: false,
      error: "unauthenticated",
      data: null,
    });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("is for reviewer roles only", async () => {
    mockedRequireRole.mockResolvedValue({
      ok: false,
      error: "forbidden",
    } as any);

    expect((await getMyReview(3)).error).toBe("forbidden");
    expect(mockedRequireRole).toHaveBeenCalledWith([SysAdmin, ContentEditor]);
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("refuses an author of the droplet, whatever their role", async () => {
    mockedRequireRole.mockResolvedValue(
      authFixtures.as({ id: 5, roles: [SysAdmin] }),
    );
    arrange();

    expect(await getMyReview(3)).toEqual({
      ok: false,
      error: "forbidden",
      data: null,
    });
    expect(callsTo("/reviews")).toHaveLength(0);
  });

  it("refuses an id that isn't a positive integer", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());

    expect((await getMyReview({ id: 3 } as never)).error).toBe("invalid_input");
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("returns the caller's own review for the current round, with its comments", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ comments: 2 });

    const result = await getMyReview(3);

    expect(result).toEqual({
      ok: true,
      error: null,
      data: { id: 70, round: 2, comments: [{ id: 1 }, { id: 2 }] },
    });
    // By key, so another reviewer's review of the same droplet never matches
    const [[, reviewCfg]] = callsTo("/reviews");
    expect(reviewCfg.urlParams?.filters).toEqual({ key: { $eq: "3:9:2" } });
    const [[, commentCfg]] = callsTo("/review-comments");
    expect(commentCfg.urlParams?.filters).toEqual({
      review: { id: { $eq: 70 } },
    });
  });

  it("returns every comment, past one page", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ comments: 130 });

    const result = await getMyReview(3);

    expect(result.data?.comments).toHaveLength(130);
    expect(callsTo("/review-comments").length).toBeGreaterThan(1);
  });

  it("returns null when the caller hasn't opened a review, and opens none", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ review: null });

    expect(await getMyReview(3)).toEqual({ ok: true, error: null, data: null });
    expect(callsTo("/review-comments")).toHaveLength(0);
    expect(
      mockedFetchAPI.mock.calls.every(([path]) =>
        ["/droplets", "/reviews"].includes(path as string),
      ),
    ).toBe(true);
  });

  it("returns null before the first round, without looking for a review", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ droplet: { inReview: false, reviewRound: 0 } });

    expect(await getMyReview(3)).toEqual({ ok: true, error: null, data: null });
    expect(callsTo("/reviews")).toHaveLength(0);
  });

  it("returns not_found for a missing droplet", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    mockedFetchAPI.mockResolvedValue([]);

    expect((await getMyReview(3)).error).toBe("not_found");
  });
});
