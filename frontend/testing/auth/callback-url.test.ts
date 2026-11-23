import { authOrigin, safeCallbackPath } from "@/lib/auth/callback-url";

const ORIGIN = "https://www.khouryodyssey.org";

describe("safeCallbackPath", () => {
  describe("accepts same-origin destinations", () => {
    it.each([
      ["/d/some-droplet", "/d/some-droplet"],
      [
        "/d/some-droplet/lesson/3?tab=quiz#top",
        "/d/some-droplet/lesson/3?tab=quiz#top",
      ],
      ["/g/fall-cs2500", "/g/fall-cs2500"],
      ["/", "/"],
      // next-auth's /api/auth/signin hands the login page an absolute URL
      // built from NEXTAUTH_URL, so that origin is accepted and reduced to a path.
      [`${ORIGIN}/d/some-droplet`, "/d/some-droplet"],
      [`${ORIGIN}/d/some-droplet?x=1`, "/d/some-droplet?x=1"],
      [`${ORIGIN}`, "/"],
    ])("%s -> %s", (input, expected) => {
      expect(safeCallbackPath(input, ORIGIN)).toBe(expected);
    });
  });

  describe("rejects open redirects", () => {
    it.each([
      ["protocol-relative", "//evil.com/d/x"],
      ["backslash host", "/\\evil.com"],
      ["mixed slashes", "\\/evil.com"],
      ["tab smuggled between slashes", "/\t/evil.com"],
      ["newline smuggled between slashes", "/\n/evil.com"],
      ["dot segment collapsing to //", "/.//evil.com"],
      ["encoded dot segment collapsing to //", "/%2e//evil.com"],
      ["another origin", "https://evil.com/d/x"],
      ["look-alike origin", "https://www.khouryodyssey.org.evil.com/d/x"],
      ["userinfo trick", "https://www.khouryodyssey.org@evil.com/d/x"],
      ["same host, other scheme", "http://www.khouryodyssey.org/d/x"],
      ["same host, other port", "https://www.khouryodyssey.org:8443/d/x"],
      ["javascript scheme", "javascript:alert(1)"],
      ["data scheme", "data:text/html,<script>alert(1)</script>"],
      ["bare relative path", "d/some-droplet"],
      ["bare host", "evil.com"],
    ])("%s (%s)", (_label, input) => {
      expect(safeCallbackPath(input, ORIGIN)).toBeUndefined();
    });
  });

  describe("rejects pointless or malformed values", () => {
    it.each([
      ["missing", undefined],
      ["empty", ""],
      ["repeated param", ["/d/a", "/d/b"]],
      ["the login page itself", "/auth/login"],
      [
        "the login page with its own callback",
        "/auth/login?callbackUrl=%2Fd%2Fx",
      ],
      ["a next-auth route", "/api/auth/signout"],
    ])("%s", (_label, input) => {
      expect(safeCallbackPath(input, ORIGIN)).toBeUndefined();
    });
  });
});

describe("authOrigin", () => {
  const originalUrl = process.env.NEXTAUTH_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = originalUrl;
  });

  it.each([
    [undefined, "http://localhost:3000"],
    ["https://www.khouryodyssey.org", "https://www.khouryodyssey.org"],
    ["https://example.org/custom/auth/", "https://example.org"],
    ["example.org", "https://example.org"],
  ])("NEXTAUTH_URL=%s -> %s", (nextAuthUrl, expected) => {
    if (nextAuthUrl === undefined) delete process.env.NEXTAUTH_URL;
    else process.env.NEXTAUTH_URL = nextAuthUrl;

    expect(authOrigin()).toBe(expected);
  });

  it("is the default origin safeCallbackPath checks against", () => {
    process.env.NEXTAUTH_URL = ORIGIN;

    expect(safeCallbackPath(`${ORIGIN}/d/x`)).toBe("/d/x");
    expect(safeCallbackPath("http://localhost:3000/d/x")).toBeUndefined();
  });
});
