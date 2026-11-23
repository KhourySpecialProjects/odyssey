import { getThreadStamp } from "@/lib/requests/reviews";
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

const mockedRequireRole = jest.mocked(requireRole);
const mockedFetchAPI = jest.mocked(fetchAPI);

const { ContentEditor } = AuthorizedUserRoleTitle;
const author = () => authFixtures.as({ id: 5, roles: [] });
const authorEditor = () => authFixtures.as({ id: 5, roles: [ContentEditor] });
const reviewer = () => authFixtures.as({ id: 9, roles: [ContentEditor] });
const stranger = () => authFixtures.as({ id: 6, roles: [] });

/** The raw (unflattened) response of the newest-reply query. */
const raw = (
  total: number,
  id = 21,
  updatedAt = "2026-11-04T10:00:00.000Z",
) => ({
  data: total
    ? [
        {
          id,
          attributes: {
            updatedAt,
            review: {
              data: {
                id: 70,
                attributes: {
                  droplet: {
                    data: {
                      id: 3,
                      attributes: { authorized_users: { data: [{ id: 5 }] } },
                    },
                  },
                },
              },
            },
          },
        },
      ]
    : [],
  meta: { pagination: { total } },
});

/** Replies come from the stamp query; an authors lookup answers /droplets. */
function arrange(total = 2, id = 21, updatedAt?: string) {
  mockedFetchAPI.mockImplementation((async (path: string) =>
    path === "/droplets"
      ? [{ id: 3, authorized_users: [{ id: 5 }] }]
      : raw(total, id, updatedAt)) as any);
}

const stampOf = async () => {
  const result = await getThreadStamp(3);
  return result.ok ? result.data.stamp : result.error;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedRequireRole.mockResolvedValue(author());
});

// A read-only action: the shared auth helper expects a write, so check the gate directly
it("runs no query for a logged-out caller", async () => {
  mockedRequireRole.mockResolvedValue(authFixtures.loggedOut());
  expect(await getThreadStamp(3)).toMatchObject({
    ok: false,
    error: "unauthenticated",
  });
  expect(mockedRequireRole).toHaveBeenCalledWith([]);
  expect(mockedFetchAPI).not.toHaveBeenCalled();
});

describe("getThreadStamp", () => {
  it.each([
    ["an author", author],
    ["a non-author reviewer", reviewer],
    ["an author with a reviewer role", authorEditor],
  ])("gives %s a stamp", async (_n, who) => {
    mockedRequireRole.mockResolvedValue(who());
    arrange();
    expect(await stampOf()).toBe("2:21:2026-11-04T10:00:00.000Z");
  });

  it("is forbidden to a role-less non-author, with rows and without", async () => {
    mockedRequireRole.mockResolvedValue(stranger());
    arrange(2);
    expect(await stampOf()).toBe("forbidden");
    arrange(0);
    expect(await stampOf()).toBe("forbidden");
  });

  it("stamps no replies as 0::, looking authors up only for a non-reviewer", async () => {
    arrange(0);
    expect(await stampOf()).toBe("0::");
    expect(mockedFetchAPI).toHaveBeenCalledTimes(2);

    mockedFetchAPI.mockClear();
    mockedRequireRole.mockResolvedValue(reviewer());
    expect(await stampOf()).toBe("0::");
    expect(mockedFetchAPI).toHaveBeenCalledTimes(1);
  });

  it("changes with the total, the id or updatedAt", async () => {
    const stamps = new Set<string>();
    for (const [total, id, at] of [
      [2, 21, "2026-11-04T10:00:00.000Z"],
      [1, 21, "2026-11-04T10:00:00.000Z"],
      [2, 22, "2026-11-04T10:00:00.000Z"],
      [2, 21, "2026-11-04T10:00:01.000Z"],
    ] as const) {
      arrange(total, id, at);
      stamps.add(await stampOf());
    }
    expect(stamps.size).toBe(4);
  });

  it("asks for one raw, uncached row", async () => {
    arrange();
    await getThreadStamp(3);
    expect(mockedFetchAPI).toHaveBeenCalledWith(
      "/review-comments",
      expect.objectContaining({
        cache: "no-store",
        flattenResponse: false,
        urlParams: expect.objectContaining({
          pagination: { pageSize: 1 },
          filters: expect.objectContaining({
            review: expect.objectContaining({
              state: { $in: ["sent", "published"] },
            }),
          }),
        }),
      }),
    );
  });

  it("refuses a bad id", async () => {
    expect(await getThreadStamp(0)).toEqual({
      ok: false,
      error: "invalid_input",
      data: null,
    });
  });
});
