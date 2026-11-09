import { revalidateTag } from "next/cache";
import {
  dismissScanFlag,
  getLatestOverviewScan,
  getScanDismissals,
  runOverviewScan,
  undoScanFlagDismissal,
} from "@/lib/requests/overview-scan";
import { scanDroplet } from "@/lib/overview-scan/scan";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { makeFetchResponse, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/overview-scan/scan", () => ({ scanDroplet: jest.fn() }));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);
const mockedScan = jest.mocked(scanDroplet);
const mockedRevalidate = jest.mocked(revalidateTag);

const { User, ContentCreator, Faculty, ContentEditor, SysAdmin } =
  AuthorizedUserRoleTitle;

const RUN = {
  rulesVersion: "v1",
  passed: 1,
  needsAttention: 2,
  couldNotCheck: 3,
  results: [],
};
const droplet = { id: 7, documentId: "d7", authorized_users: [{ id: 7 }] };
const SAVED = {
  id: 1,
  documentId: "s1",
  ranAt: "2026-11-03T00:00:00.000Z",
  ...RUN,
};

/** Called when getLatestOverviewScan reads the saved scans (the content read). */
const scanRead = jest.fn();

let fetchMock: jest.MockedFunction<typeof fetch>;

const arrange = () => {
  mockedFetchAPI.mockResolvedValue([droplet]);
  mockedScan.mockResolvedValue(RUN);
  fetchMock.mockResolvedValue(
    makeFetchResponse({
      data: {
        id: 1,
        documentId: "s1",
        attributes: { ranAt: SAVED.ranAt, ...RUN },
      },
    }),
  );
};

/** Routes fetchAPI by path; `scanRead` fires only on the content read. */
const routeReads = () =>
  mockedFetchAPI.mockImplementation(async (path) => {
    if (path === "/overview-scans") {
      scanRead();
      return [] as never;
    }
    return [droplet] as never;
  });

const as = (id: number, roles: AuthorizedUserRoleTitle[] = []) =>
  mockedRequireRole.mockResolvedValue(authFixtures.as({ id, roles }));

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  arrange();
  as(7);
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

const expectDenied = (result: unknown, code: string) =>
  expect(result).toEqual({ ok: false, error: code, data: null });

describeServerActionAuth("runOverviewScan", {
  requireRole: mockedRequireRole,
  invoke: () => runOverviewScan(7),
  mutations: () => [fetchMock, mockedRevalidate, mockedScan],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99, roles: [ContentCreator] }),
    arrange: () => {
      mockedFetchAPI.mockResolvedValue([droplet]);
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => arrange(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) => {
    expectDenied(result, code);
    if (code === "forbidden") expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
  },
});

describeServerActionAuth("getLatestOverviewScan", {
  requireRole: mockedRequireRole,
  invoke: () => getLatestOverviewScan(7),
  mutations: () => [scanRead],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99, roles: [ContentCreator] }),
    arrange: () => {
      routeReads();
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      routeReads();
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) => {
    expectDenied(result, code);
    if (code === "forbidden") {
      expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
      expect(mockedFetchAPI.mock.calls[0][0]).toBe("/droplets");
    }
  },
});

describe("runOverviewScan", () => {
  it.each([Faculty, ContentEditor, SysAdmin])(
    "lets a non-author %s scan",
    async (role) => {
      as(99, [role]);
      const result = await runOverviewScan(7);
      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(mockedRevalidate).toHaveBeenCalledWith("overview-scan-7");
    },
  );

  it("saves only the schema fields and returns the flattened row", async () => {
    const result = await runOverviewScan(7);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/overview-scans$/),
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(Object.keys(body.data).sort()).toEqual(
      [
        "droplet",
        "ranBy",
        "ranAt",
        "rulesVersion",
        "passed",
        "needsAttention",
        "couldNotCheck",
        "results",
      ].sort(),
    );
    expect(body.data).toMatchObject({ droplet: "d7", ranBy: "doc7" });
    expect(mockedRevalidate).toHaveBeenCalledWith("overview-scan-7");
    expect(result).toEqual({ ok: true, error: null, data: SAVED });
  });

  it("limits a caller to 10 runs an hour, and refused calls don't count", async () => {
    for (let i = 0; i < 11; i++) {
      as(42);
      expectDenied(await runOverviewScan(7), "forbidden");
    }
    expect(mockedScan).not.toHaveBeenCalled();

    mockedFetchAPI.mockResolvedValue([
      { ...droplet, authorized_users: [{ id: 42 }] },
    ]);
    for (let i = 0; i < 10; i++) {
      expect((await runOverviewScan(7)).ok).toBe(true);
    }
    const result = await runOverviewScan(7);

    expect(result).toMatchObject({
      ok: false,
      error: "rate_limited",
      message: expect.stringMatching(/^Rate limit reached\. Try again in \d+/),
    });
    expect(mockedScan).toHaveBeenCalledTimes(10);
    expect(fetchMock).toHaveBeenCalledTimes(10);
  });

  it.each([
    ["the scan throws", () => mockedScan.mockRejectedValue(new Error("x"))],
    [
      "the save returns 500",
      () => fetchMock.mockResolvedValue(makeFetchResponse({}, 500)),
    ],
  ])("returns failed with no revalidation when %s", async (_n, fail) => {
    as(43);
    mockedFetchAPI.mockResolvedValue([
      { ...droplet, authorized_users: [{ id: 43 }] },
    ]);
    fail();
    expectDenied(await runOverviewScan(7), "failed");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it.each([0, 1.5])("refuses id %s before any read", async (id) => {
    expectDenied(await runOverviewScan(id), "invalid_input");
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("returns not_found when the droplet doesn't exist", async () => {
    mockedFetchAPI.mockResolvedValue([]);
    expectDenied(await runOverviewScan(7), "not_found");
  });
});

describe.each([
  ["runOverviewScan", runOverviewScan],
  ["getLatestOverviewScan", getLatestOverviewScan],
])("%s", (_name, action) => {
  it("refuses a student who isn't an author after one ownership read", async () => {
    as(99, [User]);
    expectDenied(await action(7), "forbidden");
    expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
    expect(mockedScan).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads ownership, and whether the droplet is in review, fresh", async () => {
    await action(7);
    const options = mockedFetchAPI.mock.calls[0][1];
    expect(options).toMatchObject({
      cache: "no-store",
      urlParams: { filters: { id: { $eq: 7 } }, fields: ["id", "inReview"] },
    });
    expect(options).not.toHaveProperty("next");
  });
});

describe("getLatestOverviewScan", () => {
  it("returns null with no scans, else the newest row, read with a tag", async () => {
    mockedFetchAPI.mockResolvedValueOnce([droplet]).mockResolvedValueOnce([]);
    expect(await getLatestOverviewScan(7)).toEqual({
      ok: true,
      error: null,
      data: null,
    });

    mockedFetchAPI
      .mockResolvedValueOnce([droplet])
      .mockResolvedValueOnce([SAVED]);
    const result = await getLatestOverviewScan(7);
    expect(result).toEqual({ ok: true, error: null, data: SAVED });

    const [path, options] = mockedFetchAPI.mock.calls[3];
    expect(path).toBe("/overview-scans");
    expect(options).toMatchObject({
      urlParams: {
        filters: { droplet: { id: { $eq: 7 } } },
        sort: ["ranAt:desc", "id:desc"],
        pagination: { pageSize: 1 },
        populate: { ranBy: { fields: ["firstName", "lastName"] } },
      },
      next: { tags: ["overview-scan-7"] },
    });
    expect(options).not.toHaveProperty("cache");
  });
});

// ODY-905: dismissing a flag, saved on the droplet for everyone
const KEY = {
  checkId: "style",
  ruleId: "sentence-case",
  partId: "11",
  blockId: "b1",
  message: '"Data science For Noobs" mixes sentence case and Title Case.',
};
const LATEST = {
  id: 1,
  results: [
    {
      id: "style",
      status: "warn",
      rules: [
        {
          id: "sentence-case",
          status: "warn",
          flags: [{ ...KEY, severity: "warn" }].map(
            ({ checkId, ruleId, ...flag }) => flag,
          ),
        },
      ],
    },
  ],
};
const ROW = {
  id: 5,
  documentId: "x5",
  ...KEY,
  createdAt: "2026-11-09T10:00:00.000Z",
  dismissedBy: { firstName: "Ada", lastName: "Lovelace" },
};

/** Routes fetchAPI by path; `dismissalRead` fires on dismissal reads. */
const dismissalRead = jest.fn();
const routeDismissals = ({
  inReview = false,
  rows = [] as unknown[],
  latest = LATEST as unknown,
} = {}) =>
  mockedFetchAPI.mockImplementation(async (path) => {
    if (path === "/droplets") return [{ ...droplet, inReview }] as never;
    if (path === "/overview-scans") return [latest] as never;
    if (path === "/overview-scan-dismissals") {
      dismissalRead();
      return rows as never;
    }
    throw new Error(`unexpected fetchAPI ${path}`);
  });

describeServerActionAuth("getScanDismissals", {
  requireRole: mockedRequireRole,
  invoke: () => getScanDismissals(7),
  mutations: () => [dismissalRead],
  denial: {
    kind: "owner",
    nonOwner: authFixtures.as({ id: 99, roles: [ContentCreator] }),
    arrange: () => {
      routeDismissals({ rows: [ROW] });
    },
  },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    arrange: () => {
      routeDismissals({ rows: [ROW] });
    },
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied: (result, code) => expectDenied(result, code),
});

describe.each([
  ["dismissScanFlag", () => dismissScanFlag(7, KEY)],
  ["undoScanFlagDismissal", () => undoScanFlagDismissal(7, KEY)],
] as const)("%s", (name, invoke) => {
  describeServerActionAuth(name, {
    requireRole: mockedRequireRole,
    invoke,
    mutations: () => [fetchMock, mockedRevalidate],
    denial: {
      kind: "owner",
      nonOwner: authFixtures.as({ id: 99, roles: [ContentCreator] }),
      arrange: () => {
        routeDismissals({ rows: [ROW] });
      },
    },
    authorized: {
      as: authFixtures.as({ id: 7 }),
      arrange: () => {
        routeDismissals({
          rows: name === "undoScanFlagDismissal" ? [ROW] : [],
        });
        fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));
      },
      expect: (result) => expect(result.ok).toBe(true),
    },
    expectDenied: (result, code) => expectDenied(result, code),
  });

  it.each([Faculty, ContentEditor])(
    "lets a non-author %s do it outside review",
    async (role) => {
      as(99, [role]);
      routeDismissals({ rows: name === "undoScanFlagDismissal" ? [ROW] : [] });
      fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));

      expect(await invoke()).toEqual({ ok: true, error: null, data: null });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(mockedRevalidate).toHaveBeenCalledWith("overview-scan-7");
    },
  );

  it.each([
    ["an author", 7, []],
    ["an author who is a System Admin", 7, [SysAdmin]],
    ["a non-author Faculty member", 99, [Faculty]],
  ] as const)(
    "refuses %s while the droplet is in review",
    async (_, id, roles) => {
      as(id, [...roles]);
      routeDismissals({ inReview: true, rows: [ROW] });

      expectDenied(await invoke(), "in_review");
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mockedRevalidate).not.toHaveBeenCalled();
    },
  );

  it("lets the reviewer, a non-author Content Editor, do it in review", async () => {
    as(99, [ContentEditor]);
    routeDismissals({
      inReview: true,
      rows: name === "undoScanFlagDismissal" ? [ROW] : [],
    });
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));

    expect((await invoke()).ok).toBe(true);
  });

  it.each([
    ["a missing field", { ...KEY, message: undefined }],
    ["an extra field", { ...KEY, severity: "warn" }],
    ["an empty partId", { ...KEY, partId: "" }],
    ["a long message", { ...KEY, message: "x".repeat(5001) }],
  ])("refuses %s before reading anything", async (_, key) => {
    const fn =
      name === "dismissScanFlag" ? dismissScanFlag : undoScanFlagDismissal;
    expectDenied(await fn(7, key as never), "invalid_input");
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });
});

describe("dismissScanFlag", () => {
  it("saves the five fields with the droplet and the caller's documentIds", async () => {
    routeDismissals();
    fetchMock.mockResolvedValue(makeFetchResponse({ data: { id: 5 } }));

    expect(await dismissScanFlag(7, KEY)).toEqual({
      ok: true,
      error: null,
      data: null,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/overview-scan-dismissals$/),
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.data).toEqual({ ...KEY, droplet: "d7", dismissedBy: "doc7" });
    expect(mockedRevalidate).toHaveBeenCalledWith("overview-scan-7");
  });

  it.each([
    ["the message changed", { ...KEY, message: "Something else." }],
    ["the blockId differs", { ...KEY, blockId: null }],
    ["the rule differs", { ...KEY, ruleId: "swears" }],
  ])("refuses a flag that isn't in the latest scan: %s", async (_, key) => {
    routeDismissals();

    expectDenied(await dismissScanFlag(7, key), "stale");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses when there is no scan at all", async () => {
    mockedFetchAPI.mockImplementation(
      async (path) => (path === "/droplets" ? [droplet] : []) as never,
    );
    expectDenied(await dismissScanFlag(7, KEY), "stale");
  });

  it("does nothing when the flag is already dismissed", async () => {
    routeDismissals({ rows: [ROW] });

    expect(await dismissScanFlag(7, KEY)).toEqual({
      ok: true,
      error: null,
      data: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("says failed when Strapi refuses the save", async () => {
    routeDismissals();
    fetchMock.mockResolvedValue(makeFetchResponse({}, 500));

    expectDenied(await dismissScanFlag(7, KEY), "failed");
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });
});

describe("undoScanFlagDismissal", () => {
  it("finds every matching row, a null blockId included, and deletes each", async () => {
    const key = { ...KEY, blockId: null };
    routeDismissals({ rows: [ROW, { ...ROW, id: 6, documentId: "x6" }] });
    fetchMock.mockResolvedValue(makeFetchResponse({ data: null }));

    expect(await undoScanFlagDismissal(7, key)).toEqual({
      ok: true,
      error: null,
      data: null,
    });

    const read = mockedFetchAPI.mock.calls.find(
      ([p]) => p === "/overview-scan-dismissals",
    )!;
    expect(read[1]).toMatchObject({
      urlParams: {
        filters: {
          droplet: { id: { $eq: 7 } },
          blockId: { $null: true },
          message: { $eq: KEY.message },
        },
      },
      cache: "no-store",
    });
    expect(
      fetchMock.mock.calls.map(([url, init]) => [String(url), init?.method]),
    ).toEqual([
      [expect.stringMatching(/\/api\/overview-scan-dismissals\/x5$/), "DELETE"],
      [expect.stringMatching(/\/api\/overview-scan-dismissals\/x6$/), "DELETE"],
    ]);
    expect(mockedRevalidate).toHaveBeenCalledWith("overview-scan-7");
  });

  it("does nothing when nothing matches", async () => {
    routeDismissals();
    expect((await undoScanFlagDismissal(7, KEY)).ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("getScanDismissals", () => {
  it("returns each dismissal with who made it, and whether the caller may change them", async () => {
    routeDismissals({
      rows: [ROW, { ...ROW, id: 6, blockId: undefined, dismissedBy: null }],
    });

    expect(await getScanDismissals(7)).toEqual({
      ok: true,
      error: null,
      data: {
        canDismiss: true,
        dismissals: [
          { ...KEY, dismissedBy: "Ada Lovelace", dismissedAt: ROW.createdAt },
          {
            ...KEY,
            blockId: null,
            dismissedBy: null,
            dismissedAt: ROW.createdAt,
          },
        ],
      },
    });
    const read = mockedFetchAPI.mock.calls.find(
      ([p]) => p === "/overview-scan-dismissals",
    )!;
    expect(read[1]).toMatchObject({
      urlParams: { pagination: { pageSize: 1000 } },
      next: { tags: ["overview-scan-7"] },
    });
  });

  it("lets a frozen author read them, but not change them", async () => {
    routeDismissals({ inReview: true, rows: [ROW] });
    const result = await getScanDismissals(7);
    expect(result).toMatchObject({ ok: true, data: { canDismiss: false } });
  });
});
