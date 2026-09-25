import type { NextFetchEvent } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextURL } from "next/dist/server/web/next-url";
import { getToken } from "next-auth/jwt";
import middleware, { config } from "@/middleware";

// withAuth reads the token via next-auth/jwt; stub it to control sign-in state.
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

// jsdom has no fetch Response, so capture redirects instead of building them.
jest.mock("next/server", () => ({
  NextResponse: {
    redirect: jest.fn((url: URL | string) => ({ redirectedTo: String(url) })),
  },
}));

const signedInToken = { user: { email: "a@northeastern.edu", roles: [] } };

/** Only `nextUrl` is read by withAuth and our middleware (getToken is mocked). */
function requestFor(path: string) {
  return {
    nextUrl: new NextURL(`http://localhost:3000${path}`),
  } as unknown as NextRequestWithAuth;
}

async function run(path: string) {
  return middleware(requestFor(path), {} as NextFetchEvent);
}

describe("middleware", () => {
  const originalSecret = process.env.NEXTAUTH_SECRET;

  beforeAll(() => {
    process.env.NEXTAUTH_SECRET = "test-secret";
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = originalSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("signed-in users on public entry pages", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue(signedInToken as never);
    });

    it.each([
      ["/", "http://localhost:3000/activity"],
      ["/auth/login", "http://localhost:3000/explore"],
      ["/request-access", "http://localhost:3000/explore"],
    ])("redirects %s to %s", async (path, destination) => {
      await expect(run(path)).resolves.toEqual({ redirectedTo: destination });
    });

    it("drops the query string, like the pages' redirect() did", async () => {
      await expect(
        run("/auth/login?callbackUrl=%2Fd%2Fsome-droplet"),
      ).resolves.toEqual({ redirectedTo: "http://localhost:3000/explore" });
    });
  });

  describe("anonymous users on public entry pages", () => {
    beforeEach(() => {
      jest.mocked(getToken).mockResolvedValue(null);
    });

    it.each(["/", "/auth/login", "/request-access"])(
      "lets %s through without a sign-in redirect",
      async (path) => {
        await expect(run(path)).resolves.toBeUndefined();
      },
    );
  });

  it("lets a token without user data through, as getServerSession saw no session", async () => {
    jest.mocked(getToken).mockResolvedValue({ sub: "1" } as never);

    await expect(run("/")).resolves.toBeUndefined();
  });

  describe("protected routes", () => {
    it.each(["/activity", "/admin", "/admin/users", "/d/some-droplet"])(
      "still redirects anonymous %s to sign-in",
      async (path) => {
        jest.mocked(getToken).mockResolvedValue(null);

        await expect(run(path)).resolves.toEqual({
          redirectedTo: `http://localhost:3000/api/auth/signin?callbackUrl=${encodeURIComponent(path)}`,
        });
      },
    );

    it("lets signed-in users through", async () => {
      jest.mocked(getToken).mockResolvedValue(signedInToken as never);

      await expect(run("/activity")).resolves.toBeUndefined();
      await expect(run("/d/some-droplet")).resolves.toBeUndefined();
    });
  });

  it("matches only the three public pages beyond the protected routes", () => {
    expect(config.matcher).toEqual([
      "/",
      "/auth/login",
      "/request-access",
      "/admin",
      "/admin/:path*",
      "/d/:path*",
      "/activity",
      "/activity/:path*",
    ]);
  });
});
