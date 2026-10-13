import { isDevRoleOverrideEnabled } from "@/lib/auth/session";

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
