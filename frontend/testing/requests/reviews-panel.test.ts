import { getReviewPanel, unconfirmScores } from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { revalidateTag } from "next/cache";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { makeFetchResponse, mockGlobalFetch } from "@/lib/testing/mock-helpers";

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
const author = () =>
  authFixtures.as({ id: 5, roles: [AuthorizedUserRoleTitle.ContentEditor] });

type Cfg = {
  urlParams?: {
    filters?: Record<string, any>;
    populate?: Record<string, any>;
    pagination?: { page?: number; pageSize?: number };
    sort?: string[];
    fields?: string[];
  };
  next?: unknown;
  cache?: string;
};

const quote = (text: string, blockId: string, start: number) => ({
  v: 1,
  field: "blocks",
  blockId,
  start,
  end: start + text.length,
  quote: text,
  prefix: "",
  suffix: "",
});

const finding = {
  id: "8-1",
  quote: "beta",
  reason: "Vague.",
  lessonId: 11,
  anchor: quote("beta", "b2", 0),
};

const LESSONS = [
  {
    id: 11,
    name: "One",
    orderIndex: 0,
    blocksVersion: "v2",
    blocksV2: [
      { id: "b1", content: [{ type: "text", text: "alpha" }] },
      { id: "b2", content: [{ type: "text", text: "beta" }] },
    ],
  },
  { id: 12, name: "Two", orderIndex: 1, blocksVersion: "v1", blocks: [] },
];

function arrange(
  opts: {
    droplets?: object[];
    review?: object | null;
    scores?: object[];
    comments?: object[];
    runs?: object[];
  } = {},
) {
  const review =
    opts.review === undefined
      ? { id: 70, round: 2, state: "open" }
      : opts.review;
  mockedFetchAPI.mockImplementation((async (path: string) => {
    if (path === "/droplets") {
      return (
        opts.droplets ?? [
          {
            id: 3,
            inReview: true,
            reviewRound: 2,
            authorized_users: [{ id: 5 }],
            lessons: LESSONS,
          },
        ]
      );
    }
    if (path === "/review-criteria") {
      return [{ id: 2, name: "Tone", order: 0, active: true }];
    }
    if (path === "/reviews") return review ? [review] : [];
    if (path === "/review-scores") return opts.scores ?? [];
    if (path === "/review-comments") return opts.comments ?? [];
    if (path === "/ai-scoring-runs") return opts.runs ?? [];
    return [];
  }) as any);
}

const callsTo = (p: string) =>
  mockedFetchAPI.mock.calls.filter(([path]) => path === p) as [string, Cfg][];

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(reviewer());
});

describe("getReviewPanel", () => {
  it("requires a System Admin or Content Editor", async () => {
    arrange();
    await getReviewPanel(3);
    expect(mockedRequireRole).toHaveBeenCalledWith(ROLES);
  });

  it("refuses an author without reading anything but the droplet", async () => {
    mockedRequireRole.mockResolvedValue(author());
    arrange();

    const result = await getReviewPanel(3);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(callsTo("/review-scores")).toHaveLength(0);
  });

  it("refuses a bad id", async () => {
    expect(await getReviewPanel(0)).toEqual({
      ok: false,
      error: "invalid_input",
      data: null,
    });
  });

  it("returns null when the droplet is not in review", async () => {
    arrange({
      droplets: [
        { id: 3, inReview: false, reviewRound: 2, authorized_users: [] },
      ],
    });

    expect(await getReviewPanel(3)).toEqual({
      ok: true,
      error: null,
      data: null,
    });
  });

  it("answers not_found for a missing droplet", async () => {
    arrange({ droplets: [] });
    expect(await getReviewPanel(3)).toEqual({
      ok: false,
      error: "not_found",
      data: null,
    });
  });

  it("returns null before the first review round", async () => {
    arrange({
      droplets: [
        { id: 3, inReview: true, reviewRound: 0, authorized_users: [] },
      ],
    });
    expect(await getReviewPanel(3)).toEqual({
      ok: true,
      error: null,
      data: null,
    });
    expect(callsTo("/reviews")).toHaveLength(0);
  });

  it("answers failed when a fetch throws", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockedFetchAPI.mockRejectedValue(new Error("boom"));
    expect(await getReviewPanel(3)).toEqual({
      ok: false,
      error: "failed",
      data: null,
    });
  });

  it("finds the caller's review by key and lists active criteria by order", async () => {
    arrange();

    await getReviewPanel(3);

    expect(callsTo("/reviews")[0][1].urlParams?.filters).toEqual({
      key: { $eq: "3:9:2" },
    });
    const criteria = callsTo("/review-criteria")[0][1].urlParams;
    expect(criteria?.filters).toEqual({ active: { $eq: true } });
    expect(criteria?.sort).toEqual(["order:asc"]);
  });

  it("parses lesson and criterion ids from the score key", async () => {
    arrange({
      scores: [
        {
          id: 1,
          key: "70:11:2",
          criterionName: "Tone",
          value: null,
          aiValue: 2,
          aiRationale: "Because",
          aiFindings: [finding],
        },
        { id: 2, key: "70:overall:2", criterionName: "Tone", value: 4 },
      ],
    });

    const result = await getReviewPanel(3);

    expect(result.data?.scores).toEqual([
      expect.objectContaining({
        lessonId: 11,
        criterionId: 2,
        aiValue: 2,
        aiRationale: "Because",
        aiFindings: [finding],
      }),
      expect.objectContaining({
        lessonId: null,
        criterionId: 2,
        value: 4,
        aiValue: null,
        aiFindings: null,
      }),
    ]);
    expect(callsTo("/review-scores")[0][1].urlParams?.fields).toEqual(
      expect.arrayContaining(["aiFindings", "aiRationale"]),
    );
  });

  it("computes positions for comments and findings and returns no comments", async () => {
    arrange({
      scores: [
        {
          id: 1,
          key: "70:11:2",
          value: null,
          aiValue: 2,
          aiFindings: [finding],
        },
      ],
      comments: [
        {
          id: 7,
          field: "blocks",
          anchor: quote("alpha", "b1", 0),
          lesson: { id: 11 },
        },
        { id: 9, field: "description", anchor: quote("x", "", 0) },
      ],
    });

    const result = await getReviewPanel(3);

    expect(result.data).not.toHaveProperty("comments");
    expect(result.data?.positions).toEqual({
      c7: { order: [0, 0] },
      "f8-1": { order: [1, 0] },
    });
  });

  it("returns the highest-id run with its progress", async () => {
    const run = {
      id: 4,
      runState: "running",
      progress: { done: [11], current: "overall" },
      failedLessons: [],
      startedAt: "2026-10-29T00:00:00.000Z",
      finishedAt: null,
      error: null,
    };
    arrange({ runs: [run] });

    const result = await getReviewPanel(3);

    expect(result.data?.latestRun).toEqual(run);
    const cfg = callsTo("/ai-scoring-runs")[0][1].urlParams;
    expect(cfg?.sort).toEqual(["id:desc"]);
    expect(cfg?.pagination).toEqual({ pageSize: 1 });
    expect(cfg?.filters).toEqual({ review: { id: { $eq: 70 } } });
  });

  it("drops malformed findings and keeps the good ones", async () => {
    const { anchor: _anchor, ...noAnchor } = finding;
    arrange({
      scores: [
        {
          id: 1,
          key: "70:11:2",
          value: null,
          aiValue: 2,
          aiFindings: [noAnchor, finding],
        },
        { id: 2, key: "70:overall:2", value: null, aiFindings: "oops" },
      ],
    });

    const result = await getReviewPanel(3);

    expect(result.ok).toBe(true);
    expect(result.data?.scores[0].aiFindings).toEqual([finding]);
    expect(result.data?.scores[1].aiFindings).toBeNull();
    expect(result.data?.positions).toEqual({ "f8-1": { order: [1, 0] } });
  });

  it("nulls malformed run progress and failedLessons", async () => {
    arrange({
      runs: [
        {
          id: 4,
          runState: "running",
          progress: {},
          failedLessons: "x",
          error: null,
        },
      ],
    });

    const result = await getReviewPanel(3);

    expect(result.ok).toBe(true);
    expect(result.data?.latestRun).toEqual(
      expect.objectContaining({
        runState: "running",
        progress: null,
        failedLessons: null,
      }),
    );
  });

  it("returns criteria with no review yet", async () => {
    arrange({ review: null });

    const result = await getReviewPanel(3);

    expect(result.data).toMatchObject({
      review: null,
      scores: [],
      latestRun: null,
      positions: {},
    });
    expect(result.data?.criteria).toHaveLength(1);
    expect(callsTo("/review-scores")).toHaveLength(0);
  });

  it("never reads from cache", async () => {
    arrange({ scores: [{ id: 1, key: "70:11:2" }] });

    await getReviewPanel(3);

    for (const [, cfg] of mockedFetchAPI.mock.calls as [string, Cfg][]) {
      expect(cfg.cache).toBe("no-store");
      expect(cfg.next).toBeUndefined();
    }
  });
});

const SCORE = { id: 30, key: "7:4:2", criterionName: "Tone", value: null };

describeServerActionAuth("unconfirmScores", {
  requireRole: mockedRequireRole,
  invoke: () => unconfirmScores(7, 4),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => {
      fetchMock.mockResolvedValue(
        makeFetchResponse({ data: { dropletId: 3, scores: [SCORE] } }),
      );
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result: any, code: string) =>
    expect(result).toEqual({ ok: false, error: code, data: null }),
});

describe("unconfirmScores", () => {
  it("posts to unconfirm with the session user and revalidates", async () => {
    fetchMock.mockResolvedValue(
      makeFetchResponse({ data: { dropletId: 3, scores: [SCORE] } }),
    );

    const result = await unconfirmScores(7, null);

    expect(result).toEqual({ ok: true, error: null, data: [SCORE] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/review-scores\/unconfirm$/);
    expect(JSON.parse(String(init?.body))).toEqual({
      reviewId: 7,
      lessonId: null,
      userId: 9,
    });
    expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.review(3));
  });

  it("refuses a bad reviewId", async () => {
    expect(await unconfirmScores(0, 4)).toMatchObject({
      error: "invalid_input",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
