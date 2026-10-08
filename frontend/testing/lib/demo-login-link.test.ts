import {
  authorizeDemoLink,
  createLoginLinkToken,
  LOGIN_LINK_LIFETIME_MS,
  redeemLoginLinkToken,
  safeCallbackPath,
} from "@/lib/auth/demo-login-link";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));

const mockFetchAPI = fetchAPI as jest.MockedFunction<typeof fetchAPI>;
const SECRET = "control-secret";
const STUDENT = "student1@demo.odyssey.test";
const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    DEMO_MODE: "true",
    DEMO_CONTROL_SECRET: SECRET,
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("login link tokens", () => {
  it("log in the account they were made for", () => {
    const { token } = createLoginLinkToken(STUDENT, SECRET);

    expect(redeemLoginLinkToken(token, SECRET)).toBe(STUDENT);
  });

  it("work only once", () => {
    const { token } = createLoginLinkToken(STUDENT, SECRET);
    redeemLoginLinkToken(token, SECRET);

    expect(redeemLoginLinkToken(token, SECRET)).toBeNull();
  });

  it("expire", () => {
    const { token, expiresAt } = createLoginLinkToken(STUDENT, SECRET);

    expect(expiresAt - Date.now()).toBeLessThanOrEqual(LOGIN_LINK_LIFETIME_MS);
    expect(redeemLoginLinkToken(token, SECRET, expiresAt)).toBeNull();
  });

  it("are refused when signed with another secret or changed", () => {
    const { token } = createLoginLinkToken(STUDENT, "other-secret");
    expect(redeemLoginLinkToken(token, SECRET)).toBeNull();

    const [, signature] = createLoginLinkToken(STUDENT, SECRET).token.split(
      ".",
    );
    const forged = Buffer.from(
      JSON.stringify({
        email: "admin1@demo.odyssey.test",
        exp: Date.now() + 60_000,
        jti: "forged",
      }),
    ).toString("base64url");
    expect(redeemLoginLinkToken(`${forged}.${signature}`, SECRET)).toBeNull();
    expect(redeemLoginLinkToken("not-a-token", SECRET)).toBeNull();
  });

  it("never log in a real account", () => {
    const { token } = createLoginLinkToken("someone@northeastern.edu", SECRET);

    expect(redeemLoginLinkToken(token, SECRET)).toBeNull();
  });
});

describe("authorizeDemoLink", () => {
  it("logs in the link's enabled demo account", async () => {
    mockFetchAPI.mockResolvedValueOnce([
      {
        id: 6,
        email: STUDENT,
        firstName: "Student",
        lastName: "1",
        isEnabled: true,
      },
    ]);
    const { token } = createLoginLinkToken(STUDENT, SECRET);

    expect(await authorizeDemoLink({ token })).toEqual({
      id: "6",
      email: STUDENT,
      name: "Student 1",
    });
  });

  it("refuses everything outside demo mode or without the secret", async () => {
    const { token } = createLoginLinkToken(STUDENT, SECRET);

    process.env.DEMO_MODE = "false";
    expect(await authorizeDemoLink({ token })).toBeNull();
    process.env.DEMO_MODE = "true";
    delete process.env.DEMO_CONTROL_SECRET;
    expect(await authorizeDemoLink({ token })).toBeNull();
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("refuses a link that was already used", async () => {
    mockFetchAPI.mockResolvedValue([
      { id: 6, email: STUDENT, isEnabled: true },
    ]);
    const { token } = createLoginLinkToken(STUDENT, SECRET);
    await authorizeDemoLink({ token });

    expect(await authorizeDemoLink({ token })).toBeNull();
  });
});

describe("safeCallbackPath", () => {
  it.each(["/explore", "/d/sql-basics/lesson-1", "/review?tab=mine"])(
    "keeps the same-site path %s",
    (path) => expect(safeCallbackPath(path)).toBe(path),
  );

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "explore",
    undefined,
  ])("sends %s to /explore", (path) =>
    expect(safeCallbackPath(path)).toBe("/explore"),
  );
});
