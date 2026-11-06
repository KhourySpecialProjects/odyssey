import { getReviewForDroplet } from "@/lib/requests/reviews";
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

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);

const reviewer = () =>
  authFixtures.as({ id: 9, roles: [AuthorizedUserRoleTitle.ContentEditor] });
const author = () => authFixtures.as({ id: 5, roles: [] });
const authorWith = (role: AuthorizedUserRoleTitle) =>
  authFixtures.as({ id: 5, roles: [role] });
const stranger = () => authFixtures.as({ id: 6, roles: [] });

type Cfg = {
  urlParams?: {
    filters?: Record<string, any>;
    populate?: Record<string, any>;
    pagination?: { page?: number; pageSize?: number };
    sort?: string[];
    fields?: string[];
  };
  next?: { tags?: string[] };
  cache?: string;
};

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

/** Routes fetchAPI by path; `review: null` means the filter finds nothing. */
function arrange(opts: {
  review?: object | null;
  comments?: number;
  scores?: number;
  scoreRows?: object[];
  droplets?: object[];
  replies?: object[];
  topRows?: object[];
}) {
  const review =
    opts.review === undefined
      ? { id: 70, round: 1, state: "sent" }
      : opts.review;
  mockedFetchAPI.mockImplementation((async (path: string, cfg: Cfg) => {
    const { page = 1, pageSize = 25 } = cfg.urlParams?.pagination ?? {};
    const slice = (total: number) =>
      rows(total).slice((page - 1) * pageSize, page * pageSize);
    if (path === "/droplets") {
      return opts.droplets ?? [{ id: 3, authorized_users: [{ id: 5 }] }];
    }
    if (path === "/reviews") return review ? [review] : [];
    if (path === "/review-comments") {
      if (cfg.urlParams?.filters?.parent) return opts.replies ?? [];
      return opts.topRows ?? slice(opts.comments ?? 0);
    }
    if (path === "/review-scores") {
      return opts.scoreRows ?? slice(opts.scores ?? 0);
    }
    return [];
  }) as any);
}

const callsTo = (p: string) =>
  mockedFetchAPI.mock.calls.filter(([path]) => path === p) as [string, Cfg][];
const topCalls = () =>
  callsTo("/review-comments").filter(([, c]) => !c.urlParams?.filters?.parent);
const replyCalls = () =>
  callsTo("/review-comments").filter(([, c]) => c.urlParams?.filters?.parent);

beforeEach(() => jest.clearAllMocks());

describe("getReviewForDroplet", () => {
  it("returns unauthenticated without fetching", async () => {
    mockedRequireRole.mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    } as any);
    const result = await getReviewForDroplet(3);
    expect(result).toEqual({ ok: false, error: "unauthenticated", data: null });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("rejects an invalid id", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    const result = await getReviewForDroplet(0);
    expect(result).toEqual({ ok: false, error: "invalid_input", data: null });
  });

  it("forbids a student who is not an author, before any review fetch", async () => {
    mockedRequireRole.mockResolvedValue(stranger());
    arrange({});
    const result = await getReviewForDroplet(3);
    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(callsTo("/reviews")).toHaveLength(0);
  });

  it("forbids a non-reviewer when the droplet is missing", async () => {
    mockedRequireRole.mockResolvedValue(author());
    arrange({ droplets: [] });
    const result = await getReviewForDroplet(3);
    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(callsTo("/reviews")).toHaveLength(0);
  });

  it("reads author ownership uncached with authorized_users populated", async () => {
    mockedRequireRole.mockResolvedValue(author());
    arrange({});
    await getReviewForDroplet(3);
    const cfg = callsTo("/droplets")[0][1];
    expect(cfg.cache).toBe("no-store");
    expect(cfg.next).toBeUndefined();
    expect(cfg.urlParams?.populate).toHaveProperty("authorized_users");
  });

  it("returns null for the author when only an open review exists", async () => {
    mockedRequireRole.mockResolvedValue(author());
    arrange({ review: null });
    const result = await getReviewForDroplet(3);
    expect(result).toEqual({ ok: true, error: null, data: null });
    expect(callsTo("/reviews")[0][1].urlParams?.filters?.state).toEqual({
      $in: ["sent", "published"],
    });
    expect(callsTo("/review-comments")).toHaveLength(0);
    expect(callsTo("/review-scores")).toHaveLength(0);
  });

  it("pages all 130 comments for the author after send", async () => {
    mockedRequireRole.mockResolvedValue(author());
    arrange({ comments: 130 });
    const result = await getReviewForDroplet(3);
    expect(result.ok && result.data?.comments).toHaveLength(130);
    const calls = topCalls();
    expect(calls.map(([, c]) => c.urlParams?.pagination?.page)).toEqual([1, 2]);
    expect(calls[0][1].urlParams?.sort).toEqual(["id:asc"]);
  });

  it("returns all 40 comments to a reviewer with pageSize 100", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ comments: 40 });
    const result = await getReviewForDroplet(3);
    expect(result.ok && result.data?.comments).toHaveLength(40);
    const calls = topCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][1].urlParams?.pagination?.pageSize).toBe(100);
  });

  it("gives a non-author reviewer only the latest sent or published review", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ scores: 101 });
    const result = await getReviewForDroplet(3);
    expect(result.ok && result.data?.scores).toHaveLength(101);
    const cfg = callsTo("/reviews")[0][1];
    expect(cfg.urlParams?.filters?.state).toEqual({
      $in: ["sent", "published"],
    });
    expect(cfg.urlParams?.sort).toEqual(["round:desc", "id:desc"]);
    expect(cfg.urlParams?.pagination?.pageSize).toBe(1);
  });

  it.each([
    ["an author", author],
    ["a reviewer", reviewer],
  ])("hides AI fields and unconfirmed scores from %s", async (_n, who) => {
    mockedRequireRole.mockResolvedValue(who());
    arrange({
      scoreRows: [
        {
          id: 1,
          criterionName: "Clarity",
          value: 4,
          key: "k",
          aiFindings: [{ id: "x" }],
        },
      ],
    });
    const result = await getReviewForDroplet(3);
    const cfg = callsTo("/review-scores")[0][1];
    expect(cfg.urlParams?.filters?.value).toEqual({ $notNull: true });
    expect(cfg.urlParams?.fields).not.toContain("aiValue");
    expect(cfg.urlParams?.fields).not.toContain("aiRationale");
    expect(cfg.urlParams?.fields).not.toContain("aiFindings");
    expect(cfg.urlParams?.fields).toContain("value");
    expect(result.ok && result.data?.scores?.[0]).toMatchObject({
      value: 4,
      aiValue: null,
      aiRationale: null,
      aiFindings: null,
    });
  });

  it.each([
    ["Content Editor", AuthorizedUserRoleTitle.ContentEditor],
    ["System Admin", AuthorizedUserRoleTitle.SysAdmin],
    ["Faculty", AuthorizedUserRoleTitle.Faculty],
  ])("gives a %s author the author-safe view", async (_n, role) => {
    mockedRequireRole.mockResolvedValue(authorWith(role));
    arrange({
      scoreRows: [{ id: 1, criterionName: "Clarity", value: 4, key: "k" }],
    });
    const result = await getReviewForDroplet(3);
    expect(callsTo("/droplets")).toHaveLength(1);
    expect(callsTo("/reviews")[0][1].urlParams?.filters?.state).toEqual({
      $in: ["sent", "published"],
    });
    const cfg = callsTo("/review-scores")[0][1];
    expect(cfg.urlParams?.filters?.value).toEqual({ $notNull: true });
    expect(cfg.urlParams?.fields).not.toContain("aiValue");
    expect(cfg.urlParams?.fields).not.toContain("aiRationale");
    expect(result.ok && result.data?.scores?.[0]).toMatchObject({
      aiValue: null,
      aiRationale: null,
    });
  });

  it("threads replies by root id, uncached, and drops reply rows from tops", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({
      topRows: [
        { id: 1 },
        { id: 2, carriedFrom: { id: 1 } },
        { id: 8, parent: { id: 1 } },
      ],
      replies: [
        { id: 9, parent: { id: 1 }, author: { id: 9 } },
        { id: 8, parent: { id: 1 }, author: { id: 5 } },
      ],
    });
    const result = await getReviewForDroplet(3);
    const comments = result.ok ? result.data?.comments ?? [] : [];
    expect(comments.map((c) => c.id)).toEqual([1, 2]);
    for (const c of comments) {
      expect(c.replies?.map((r) => [r.id, r.mine])).toEqual([
        [8, false],
        [9, true],
      ]);
    }
    const calls = replyCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][1].urlParams?.filters).toEqual({
      parent: { id: { $in: [1] } },
      review: { state: { $in: ["sent", "published"] } },
    });
    expect(calls[0][1].cache).toBe("no-store");
    expect(calls[0][1].next).toBeUndefined();
  });

  it("tags reads with the droplet tag and never sets cache", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ comments: 1, scores: 1 });
    await getReviewForDroplet(3);
    for (const cfg of [
      callsTo("/reviews")[0][1],
      topCalls()[0][1],
      callsTo("/review-scores")[0][1],
    ]) {
      expect(cfg.next?.tags).toEqual(["review-3"]);
      expect(cfg.cache).toBeUndefined();
    }
  });

  it("stops paging at the 50-page cap", async () => {
    mockedRequireRole.mockResolvedValue(reviewer());
    arrange({ comments: 100 * 60 });
    const result = await getReviewForDroplet(3);
    expect(topCalls()).toHaveLength(50);
    expect(result.ok && result.data?.comments).toHaveLength(5000);
  });

  it("logs and returns failed when a fetch throws", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    mockedRequireRole.mockResolvedValue(reviewer());
    mockedFetchAPI.mockRejectedValue(new Error("boom"));
    const result = await getReviewForDroplet(3);
    expect(result).toEqual({ ok: false, error: "failed", data: null });
    expect(spy).toHaveBeenCalledWith(
      "getReviewForDroplet failed",
      expect.any(Error),
    );
    spy.mockRestore();
  });
});
