/**
 * Coverage tests for lib/auth/session.ts — getCurrentUser paths.
 *
 * Existing tests in dev-role-override.test.ts cover isDevRoleOverrideEnabled.
 * This file covers the getCurrentUser() branches not yet hit:
 *  - No session → returns undefined
 *  - Session with no override cookie (dev override disabled)
 *  - Session with no override cookie (dev override enabled but cookie absent)
 *  - Session with override cookie but isDevRoleOverrideEnabled() false
 *  - Session with valid override cookie (valid roles) → returns merged user
 *  - Session with override cookie containing invalid JSON → ignores, returns session user
 *  - Session with override cookie containing non-array JSON → ignores
 *  - Session with override cookie containing array with invalid role values → filtered out
 *  - Session with override cookie containing valid roles → returns user with those roles
 */
import { getCurrentUser } from "@/lib/auth/session";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

jest.mock("@/lib/auth/options", () => ({
  authOptions: {},
}));

// We need to control isDevRoleOverrideEnabled without importing it directly.
// We do that by mocking the whole session module except getCurrentUser — but
// that would lose the implementation. Instead, control the env vars directly.

import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";

const mockedGetServerSession = jest.mocked(getServerSession);
const mockedCookies = jest.mocked(cookies);

// Helper: build a mock cookie store
function makeCookieStore(cookieValue?: string) {
  return {
    get: (name: string) => {
      if (name === "dev-role-override" && cookieValue !== undefined) {
        return { value: cookieValue };
      }
      return undefined;
    },
  } as unknown as Awaited<ReturnType<typeof cookies>>;
}

const SESSION_USER = {
  id: 1,
  email: "user@example.com",
  roles: [AuthorizedUserRoleTitle.User],
};

// ---------------------------------------------------------------------------
// Env helpers
// ---------------------------------------------------------------------------

function setDevOverrideEnv(enabled: boolean) {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "development",
    writable: true,
    configurable: true,
  });
  process.env.ENABLE_DEV_ROLE_OVERRIDE = enabled ? "true" : "";
}

function clearDevOverrideEnv() {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
    configurable: true,
  });
  delete process.env.ENABLE_DEV_ROLE_OVERRIDE;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getCurrentUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearDevOverrideEnv();
    // react.cache is transparent in tests — getCurrentUser is called directly
  });

  afterEach(() => {
    clearDevOverrideEnv();
  });

  it("returns undefined when there is no session", async () => {
    mockedGetServerSession.mockResolvedValue(null);

    const result = await getCurrentUser();

    expect(result).toBeUndefined();
  });

  it("returns undefined when session has no user", async () => {
    mockedGetServerSession.mockResolvedValue({ user: undefined } as never);

    const result = await getCurrentUser();

    expect(result).toBeUndefined();
  });

  it("returns session user when dev override is disabled (test env)", async () => {
    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);

    const result = await getCurrentUser();

    expect(result).toEqual(SESSION_USER);
    // cookies() should NOT be called when override is disabled
    expect(mockedCookies).not.toHaveBeenCalled();
  });

  it("returns session user when dev override enabled but cookie is absent", async () => {
    setDevOverrideEnv(true);
    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);
    mockedCookies.mockResolvedValue(makeCookieStore()); // no cookie

    const result = await getCurrentUser();

    expect(result).toEqual(SESSION_USER);
  });

  it("returns session user with overridden roles when valid cookie present", async () => {
    setDevOverrideEnv(true);
    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);
    const overrideRoles = [AuthorizedUserRoleTitle.SysAdmin];
    const cookieValue = encodeURIComponent(JSON.stringify(overrideRoles));
    mockedCookies.mockResolvedValue(makeCookieStore(cookieValue));

    const result = await getCurrentUser();

    expect(result).toMatchObject({
      ...SESSION_USER,
      roles: overrideRoles,
    });
  });

  it("ignores override cookie containing invalid JSON", async () => {
    setDevOverrideEnv(true);
    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);
    mockedCookies.mockResolvedValue(makeCookieStore("not-valid-json"));

    const result = await getCurrentUser();

    // Invalid JSON → catch block → falls through to return session.user
    expect(result).toEqual(SESSION_USER);
  });

  it("ignores override cookie containing non-array JSON", async () => {
    setDevOverrideEnv(true);
    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);
    const cookieValue = encodeURIComponent(JSON.stringify({ role: "admin" }));
    mockedCookies.mockResolvedValue(makeCookieStore(cookieValue));

    const result = await getCurrentUser();

    // Parsed but not an array → ignored → session.user returned
    expect(result).toEqual(SESSION_USER);
  });

  it("ignores override cookie whose roles are all invalid values", async () => {
    setDevOverrideEnv(true);
    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);
    // Array with no valid AuthorizedUserRoleTitle values
    const cookieValue = encodeURIComponent(
      JSON.stringify(["InvalidRole", "AnotherBad"]),
    );
    mockedCookies.mockResolvedValue(makeCookieStore(cookieValue));

    const result = await getCurrentUser();

    // roles.length === 0 → branch not taken → session.user returned
    expect(result).toEqual(SESSION_USER);
  });

  it("filters out invalid values mixed with valid role values in override cookie", async () => {
    setDevOverrideEnv(true);
    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);
    const cookieValue = encodeURIComponent(
      JSON.stringify([
        AuthorizedUserRoleTitle.ContentCreator,
        "INVALID_ROLE",
        AuthorizedUserRoleTitle.Faculty,
      ]),
    );
    mockedCookies.mockResolvedValue(makeCookieStore(cookieValue));

    const result = await getCurrentUser();

    expect(result).toMatchObject({
      roles: [
        AuthorizedUserRoleTitle.ContentCreator,
        AuthorizedUserRoleTitle.Faculty,
      ],
    });
  });

  it("does NOT apply override when NODE_ENV is production even if flag is set", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "true";

    mockedGetServerSession.mockResolvedValue({ user: SESSION_USER } as never);
    mockedCookies.mockResolvedValue(
      makeCookieStore(
        encodeURIComponent(JSON.stringify([AuthorizedUserRoleTitle.SysAdmin])),
      ),
    );

    const result = await getCurrentUser();

    // Production → isDevRoleOverrideEnabled() = false → no override
    expect(result).toEqual(SESSION_USER);
    expect(mockedCookies).not.toHaveBeenCalled();
  });
});
