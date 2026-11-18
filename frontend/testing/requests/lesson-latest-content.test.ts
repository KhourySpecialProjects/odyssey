import { getLatestLessonContent } from "@/lib/requests/lesson";
import { requireRole } from "@/lib/auth/require-role";
import { fetchAPI } from "@/lib/utils";
import { authFixtures } from "@/testing/helpers/server-action-auth";
import { LESSON_BLOCKS_POPULATE } from "@/lib/requests/lesson-populates";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
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

const FRESH = {
  id: 5,
  name: "Fresh name",
  blocks: [{ __component: "droplets.generic", content: "new" }],
  blocksV2: [{ type: "paragraph", content: "newer edit" }],
  blocksVersion: "v2",
};

/** Routes the review-freeze lookups (a droplet owned by 7) and the content read. */
function route(inReview = false) {
  const droplet = {
    id: 1,
    name: "N",
    inReview,
    status: "draft",
    originalDropletId: null,
    authorized_users: [{ id: 7 }],
  };
  mockedFetchAPI.mockImplementation((async (
    path: string,
    options?: { urlParams?: { fields?: string[] } },
  ) => {
    if (path === "/lessons" && options?.urlParams?.fields?.includes("name")) {
      return [FRESH];
    }
    if (path === "/lessons") return [{ id: 5, droplets: [droplet] }];
    if (path === "/droplets") return [droplet];
    return [];
  }) as never);
}

const contentReads = () =>
  mockedFetchAPI.mock.calls.filter(([, o]) =>
    (o as { urlParams?: { fields?: string[] } })?.urlParams?.fields?.includes(
      "name",
    ),
  );

beforeEach(() => {
  jest.resetAllMocks();
});

describe("getLatestLessonContent", () => {
  it("refuses a logged-out caller without reading", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.loggedOut());

    const result = await getLatestLessonContent(5);

    expect(result).toEqual({ ok: false, error: "unauthenticated", data: null });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("refuses an id that is not a plain integer, with no lookup", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    route();

    const result = await getLatestLessonContent({
      id: 5,
      documentId: "x",
    } as never);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("refuses a caller without write rights and never reads the content", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 99 }));
    route();

    const result = await getLatestLessonContent(5);

    expect(result).toEqual({ ok: false, error: "forbidden", data: null });
    expect(contentReads()).toHaveLength(0);
  });

  it("refuses an author while the droplet is in review", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    route(true);

    const result = await getLatestLessonContent(5);

    expect(result).toEqual({ ok: false, error: "in_review", data: null });
    expect(contentReads()).toHaveLength(0);
  });

  it("returns the latest saved content, uncached, for an author", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
    route();

    const result = await getLatestLessonContent(5);

    expect(result).toEqual({
      ok: true,
      error: null,
      data: {
        name: "Fresh name",
        blocks: FRESH.blocks,
        blocksV2: FRESH.blocksV2,
        blocksVersion: "v2",
      },
    });
    const [path, options] = contentReads()[0] as [string, any];
    expect(path).toBe("/lessons");
    expect(options.cache).toBe("no-store");
    expect(options.next).toBeUndefined();
    expect(options.urlParams.filters).toEqual({ id: { $eq: 5 } });
    expect(options.urlParams.populate).toEqual(LESSON_BLOCKS_POPULATE);
    expect(options.urlParams.fields).toEqual([
      "name",
      "blocksV2",
      "blocksVersion",
    ]);
  });

  it("returns Not Found when the lesson has gone", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    route();
    mockedFetchAPI.mockImplementation((async (
      path: string,
      options?: { urlParams?: { fields?: string[] } },
    ) => {
      if (options?.urlParams?.fields?.includes("name")) return [];
      if (path === "/lessons") return [{ id: 5, droplets: [] }];
      return [];
    }) as never);

    const result = await getLatestLessonContent(5);

    expect(result).toEqual({ ok: false, error: "Not Found", data: null });
  });

  it("returns an error when the read fails", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));
    mockedFetchAPI.mockImplementation((async (
      path: string,
      options?: { urlParams?: { fields?: string[] } },
    ) => {
      if (options?.urlParams?.fields?.includes("name")) {
        throw new Error("down");
      }
      if (path === "/lessons") return [{ id: 5, droplets: [] }];
      return [];
    }) as never);

    const result = await getLatestLessonContent(5);

    expect(result).toMatchObject({ ok: false, data: null });
  });
});
