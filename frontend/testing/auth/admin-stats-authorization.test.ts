/**
 * Defensive authorization tests for the admin statistics Server Action.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `getAdminDashboardStats` lives in `lib/requests/admin-stats.ts`, which begins
 * with the `"use server"` directive. Every exported async function in such a
 * file is compiled into a callable POST endpoint — it is not merely an internal
 * helper. The admin *pages* are gated by `app/(general)/admin/layout.tsx`, but a
 * layout only runs while rendering a page; it does not run when a Server Action
 * is invoked. Authorization must therefore live inside the action itself.
 *
 * These tests encode the intended safeguard: an unauthorized caller must be
 * rejected BEFORE any protected data is queried. The strongest assertion is not
 * on the return value but on the data-access mocks — if they were never called,
 * no protected data was read, regardless of what the function returns.
 */
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { fetchAuthorizedUsersMetadata } from "@/lib/requests/authorized-user";
import { fetchEnrollmentMetadata } from "@/lib/requests/enrollment";
import { getAdminDashboardStats } from "@/lib/requests/admin-stats";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({ getCachedUser: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  fetchAuthorizedUsersMetadata: jest.fn(),
}));
jest.mock("@/lib/requests/enrollment", () => ({
  fetchEnrollmentMetadata: jest.fn(),
}));

const mockedGetCurrentUser = jest.mocked(getCurrentUser);
const mockedGetCachedUser = jest.mocked(getCachedUser);
const mockedUsersMetadata = jest.mocked(fetchAuthorizedUsersMetadata);
const mockedEnrollmentMetadata = jest.mocked(fetchEnrollmentMetadata);

/** Metadata shape the action reads: `.pagination.total` */
const META = { pagination: { total: 10 } };

/** Session states under test. */
function signedOut() {
  mockedGetCurrentUser.mockResolvedValue(undefined);
  mockedGetCachedUser.mockResolvedValue(
    null as unknown as Awaited<ReturnType<typeof getCachedUser>>,
  );
}

function signedInAs(roles: AuthorizedUserRoleTitle[]) {
  mockedGetCurrentUser.mockResolvedValue({
    email: "tester@northeastern.edu",
    roles,
    isActive: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  mockedGetCachedUser.mockResolvedValue({
    id: 99,
    email: "tester@northeastern.edu",
    roles: roles.map((title) => ({ title })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

/** Invoke the action without letting a throw abort the test. */
async function invokeAction() {
  try {
    return { threw: false as const, value: await getAdminDashboardStats() };
  } catch (error) {
    return { threw: true as const, error };
  }
}

/** True if any protected data source was queried. */
function protectedDataWasQueried() {
  return (
    mockedUsersMetadata.mock.calls.length > 0 ||
    mockedEnrollmentMetadata.mock.calls.length > 0 ||
    (global.fetch as jest.Mock).mock.calls.length > 0
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});

  mockedUsersMetadata.mockResolvedValue(
    META as unknown as Awaited<ReturnType<typeof fetchAuthorizedUsersMetadata>>,
  );
  mockedEnrollmentMetadata.mockResolvedValue(
    META as unknown as Awaited<ReturnType<typeof fetchEnrollmentMetadata>>,
  );

  // fetchDropletCount() calls global fetch directly.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ meta: { pagination: { total: 5 } } }),
  }) as unknown as typeof global.fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("getAdminDashboardStats — authorization", () => {
  it("denies a signed-out caller without querying protected data", async () => {
    signedOut();

    const result = await invokeAction();

    // Primary safeguard: nothing protected may be read for an anonymous caller.
    expect(protectedDataWasQueried()).toBe(false);
    // Secondary: no statistics may be handed back.
    expect(result.threw ? undefined : result.value).toBeUndefined();
  });

  it("denies a signed-in non-admin without querying protected data", async () => {
    signedInAs([AuthorizedUserRoleTitle.User]);

    const result = await invokeAction();

    expect(protectedDataWasQueried()).toBe(false);
    expect(result.threw ? undefined : result.value).toBeUndefined();
  });

  it("allows a System Admin and returns statistics", async () => {
    signedInAs([AuthorizedUserRoleTitle.SysAdmin]);

    const result = await invokeAction();

    expect(result.threw).toBe(false);
    if (!result.threw) {
      expect(result.value).toEqual(
        expect.objectContaining({
          users: expect.any(Object),
          droplets: expect.any(Object),
          enrollments: expect.any(Object),
          retentionRate: expect.any(Object),
        }),
      );
    }
  });
});
