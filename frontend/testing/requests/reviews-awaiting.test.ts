import { getReviewsAwaitingReply } from "@/lib/requests/reviews";
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

const REVIEWER = 9;
const AUTHOR = 5;

type Cfg = {
  urlParams?: { filters?: Record<string, any> };
  next?: unknown;
  cache?: string;
};

const droplet = (id: number, authors = [AUTHOR]) => ({
  id,
  name: `Droplet ${id}`,
  slug: `droplet-${id}`,
  authorized_users: authors.map((a) => ({ id: a })),
});

type World = {
  mine?: object[];
  latest?: object[];
  tops?: object[];
  replies?: object[];
};

/** Routes fetchAPI by path and by the filters each step sends. */
function arrange(w: World) {
  mockedFetchAPI.mockImplementation((async (path: string, cfg: Cfg) => {
    const f = cfg.urlParams?.filters ?? {};
    if (path === "/reviews") return f.reviewer ? w.mine : w.latest;
    if (f.parent?.id?.$null) return w.tops ?? [];
    return w.replies ?? [];
  }) as any);
}

const reply = (id: number, parent: number, author: number, at: string) => ({
  id,
  createdAt: at,
  parent: { id: parent },
  author: { id: author },
});
const top = (id: number, review: number, carriedFrom?: number) => ({
  id,
  review: { id: review },
  carriedFrom: carriedFrom ? { id: carriedFrom } : null,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequireRole.mockResolvedValue(
    authFixtures.as({
      id: REVIEWER,
      roles: [AuthorizedUserRoleTitle.ContentEditor],
    }),
  );
});

describe("getReviewsAwaitingReply", () => {
  it("forbids a caller without a reviewer role, without fetching", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.wrongRole());
    const result = await getReviewsAwaitingReply();
    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("returns [] after one call when nothing was sent", async () => {
    arrange({ mine: [] });
    const result = await getReviewsAwaitingReply();
    expect(result).toEqual({ ok: true, error: null, data: [] });
    expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("filters step 1 by the caller, and never caches", async () => {
    arrange({
      mine: [{ id: 50, droplet: droplet(1) }],
      latest: [{ id: 50, droplet: { id: 1 } }],
      tops: [top(100, 50)],
      replies: [reply(200, 100, AUTHOR, "2026-01-01")],
    });
    await getReviewsAwaitingReply();
    expect(mockedFetchAPI).toHaveBeenCalledTimes(4);
    const [, first] = mockedFetchAPI.mock.calls[0] as [string, Cfg];
    expect(first.urlParams?.filters).toEqual({
      reviewer: { id: { $eq: REVIEWER } },
      state: { $eq: "sent" },
      droplet: { status: { $eq: "draft" }, inReview: { $eq: false } },
    });
    for (const [, cfg] of mockedFetchAPI.mock.calls as [string, Cfg][]) {
      expect(cfg.cache).toBe("no-store");
      expect(cfg.next).toBeUndefined();
    }
  });

  it("lists a waiting draft with its name, thread count and reply time", async () => {
    arrange({
      mine: [{ id: 50, droplet: droplet(1) }],
      latest: [{ id: 50, droplet: { id: 1 } }],
      tops: [top(100, 50), top(101, 50)],
      replies: [
        reply(200, 100, AUTHOR, "2026-01-01"),
        reply(201, 101, AUTHOR, "2026-01-03"),
      ],
    });
    const result = await getReviewsAwaitingReply();
    expect(result.data).toEqual([
      {
        dropletId: 1,
        name: "Droplet 1",
        slug: "droplet-1",
        threads: 2,
        lastReplyAt: "2026-01-03",
      },
    ]);
  });

  it("drops an own droplet", async () => {
    arrange({ mine: [{ id: 50, droplet: droplet(1, [REVIEWER]) }] });
    const result = await getReviewsAwaitingReply();
    expect(result.data).toEqual([]);
    expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("drops a droplet whose latest sent review is someone else's", async () => {
    arrange({
      mine: [{ id: 50, droplet: droplet(1) }],
      latest: [{ id: 60, droplet: { id: 1 } }],
    });
    const result = await getReviewsAwaitingReply();
    expect(result.data).toEqual([]);
    expect(mockedFetchAPI).toHaveBeenCalledTimes(2);
  });

  it("looks a carried comment's replies up by its root", async () => {
    arrange({
      mine: [{ id: 50, droplet: droplet(1) }],
      latest: [{ id: 50, droplet: { id: 1 } }],
      tops: [top(300, 50, 100)],
      replies: [reply(200, 100, AUTHOR, "2026-01-01")],
    });
    const result = await getReviewsAwaitingReply();
    expect(result.data).toHaveLength(1);
    const replyCall = (mockedFetchAPI.mock.calls as [string, Cfg][]).find(
      ([, c]) => c.urlParams?.filters?.parent?.id?.$in,
    );
    expect(replyCall?.[1].urlParams?.filters?.parent.id.$in).toEqual([100]);
  });

  it("sorts the longest waiting first", async () => {
    arrange({
      mine: [
        { id: 50, droplet: droplet(1) },
        { id: 51, droplet: droplet(2) },
      ],
      latest: [
        { id: 50, droplet: { id: 1 } },
        { id: 51, droplet: { id: 2 } },
      ],
      tops: [top(100, 50), top(101, 51)],
      replies: [
        reply(200, 100, AUTHOR, "2026-02-01"),
        reply(201, 101, AUTHOR, "2026-01-01"),
      ],
    });
    const result = await getReviewsAwaitingReply();
    expect(result.data?.map((r) => r.dropletId)).toEqual([2, 1]);
  });

  it("returns failed when a read throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockedFetchAPI.mockRejectedValue(new Error("boom"));
    const result = await getReviewsAwaitingReply();
    expect(result).toEqual({ ok: false, error: "failed", data: null });
  });
});
