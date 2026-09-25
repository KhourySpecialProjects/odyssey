import { isDevRoleOverrideEnabled } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { getDevRoleOverride } from "@/lib/auth/dev-role-override";
import { AuthorizedUserRoleTitle } from "@/lib/globals";

jest.mock("next/headers", () => ({
  cookies: jest.fn(),
}));

const mockedCookies = jest.mocked(cookies);

/** Builds a mock cookie store with an optional dev-role-override value. */
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

// Save originals so we can restore them between tests
const originalNodeEnv = process.env.NODE_ENV;
const originalEnableFlag = process.env.ENABLE_DEV_ROLE_OVERRIDE;

beforeEach(() => {
  // Reset to safe defaults before each test
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    writable: true,
    configurable: true,
  });
  delete process.env.ENABLE_DEV_ROLE_OVERRIDE;
});

afterAll(() => {
  // Restore original values after the suite
  Object.defineProperty(process.env, "NODE_ENV", {
    value: originalNodeEnv,
    writable: true,
    configurable: true,
  });
  if (originalEnableFlag !== undefined) {
    process.env.ENABLE_DEV_ROLE_OVERRIDE = originalEnableFlag;
  } else {
    delete process.env.ENABLE_DEV_ROLE_OVERRIDE;
  }
});

describe("isDevRoleOverrideEnabled", () => {
  it("returns false when NODE_ENV is not development (default test env)", () => {
    expect(isDevRoleOverrideEnabled()).toBe(false);
  });

  it("returns false when NODE_ENV=development but ENABLE_DEV_ROLE_OVERRIDE is absent", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    expect(isDevRoleOverrideEnabled()).toBe(false);
  });

  it("returns false when NODE_ENV=development but ENABLE_DEV_ROLE_OVERRIDE is empty string", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "";
    expect(isDevRoleOverrideEnabled()).toBe(false);
  });

  it("returns false when ENABLE_DEV_ROLE_OVERRIDE=true but NODE_ENV is not development", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "true";
    expect(isDevRoleOverrideEnabled()).toBe(false);
  });

  it("returns true when NODE_ENV=development AND ENABLE_DEV_ROLE_OVERRIDE=true", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "true";
    expect(isDevRoleOverrideEnabled()).toBe(true);
  });

  it("returns false when ENABLE_DEV_ROLE_OVERRIDE=1 (must be exactly 'true')", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "1";
    expect(isDevRoleOverrideEnabled()).toBe(false);
  });

  it("returns false when ENABLE_DEV_ROLE_OVERRIDE=True (case-sensitive check)", () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "True";
    expect(isDevRoleOverrideEnabled()).toBe(false);
  });
});

describe("getDevRoleOverride", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "test",
      writable: true,
      configurable: true,
    });
    delete process.env.ENABLE_DEV_ROLE_OVERRIDE;
  });

  it("returns null and never reads cookies when NODE_ENV is production, even with the flag on and a valid cookie", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "production",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "true";
    mockedCookies.mockResolvedValue(
      makeCookieStore(
        encodeURIComponent(JSON.stringify([AuthorizedUserRoleTitle.SysAdmin])),
      ),
    );

    const result = await getDevRoleOverride();

    expect(result).toBeNull();
    expect(mockedCookies).not.toHaveBeenCalled();
  });

  it("returns the override roles in dev with the flag on and a valid cookie", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "true";
    mockedCookies.mockResolvedValue(
      makeCookieStore(
        encodeURIComponent(JSON.stringify([AuthorizedUserRoleTitle.SysAdmin])),
      ),
    );

    const result = await getDevRoleOverride();

    expect(result).toEqual([AuthorizedUserRoleTitle.SysAdmin]);
  });

  it("returns null in dev with the flag on and no cookie", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    process.env.ENABLE_DEV_ROLE_OVERRIDE = "true";
    mockedCookies.mockResolvedValue(makeCookieStore());

    const result = await getDevRoleOverride();

    expect(result).toBeNull();
  });

  it("returns null and never reads cookies in dev with the flag off, even with a valid cookie", async () => {
    Object.defineProperty(process.env, "NODE_ENV", {
      value: "development",
      writable: true,
      configurable: true,
    });
    delete process.env.ENABLE_DEV_ROLE_OVERRIDE;
    mockedCookies.mockResolvedValue(
      makeCookieStore(
        encodeURIComponent(JSON.stringify([AuthorizedUserRoleTitle.SysAdmin])),
      ),
    );

    const result = await getDevRoleOverride();

    expect(result).toBeNull();
    expect(mockedCookies).not.toHaveBeenCalled();
  });
});
