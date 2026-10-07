import type { NextFetchEvent } from "next/server";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextURL } from "next/dist/server/web/next-url";
import { getToken } from "next-auth/jwt";
import middleware, { config, isAuthRoute } from "@/middleware";

// withAuth reads the token via next-auth/jwt; stub it to control sign-in state.
jest.mock("next-auth/jwt", () => ({
  getToken: jest.fn(),
}));

const mockSetCookie = jest.fn();

// jsdom has no fetch Response, so capture responses instead of building them.
// `cookies` is non-enumerable so the redirect assertions below stay exact.
jest.mock("next/server", () => {
  const withCookies = <T extends object>(res: T) =>
    Object.defineProperty(res, "cookies", { value: { set: mockSetCookie } });
  const NextResponse = jest.fn((body: string, init: ResponseInit) => ({
    body,
    init,
  }));
  return {
    NextResponse: Object.assign(NextResponse, {
      redirect: jest.fn((url: URL | string) =>
        withCookies({ redirectedTo: String(url) }),
      ),
      json: jest.fn((json: unknown, init: ResponseInit) => ({ json, init })),
    }),
  };
});

const signedInToken = { user: { email: "a@northeastern.edu", roles: [] } };

type RequestOptions = {
  method?: string;
  userAgent?: string;
  cookies?: Record<string, string>;
};

/** Only these fields are read by withAuth and our middleware (getToken is mocked). */
function requestFor(path: string, options: RequestOptions = {}) {
  const { method = "GET", userAgent = "Mozilla/5.0", cookies = {} } = options;
  return {
    nextUrl: new NextURL(`http://localhost:3000${path}`),
    method,
    headers: new Map([["user-agent", userAgent]]),
    cookies: {
      get: (name: string) =>
        name in cookies ? { name, value: cookies[name] } : undefined,
    },
  } as unknown as NextRequestWithAuth;
}

async function run(path: string, options?: RequestOptions) {
  return middleware(requestFor(path, options), {} as NextFetchEvent);
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

  describe("routes outside the sign-in checks", () => {
    it.each([
      "/explore",
      "/dashboard",
      "/api/auth/session",
      "/p/some-playlist",
    ])("lets anonymous %s through untouched", async (path) => {
      jest.mocked(getToken).mockResolvedValue(null);

      await expect(run(path)).resolves.toBeUndefined();
      expect(getToken).not.toHaveBeenCalled();
    });
  });

  it("applies the sign-in checks to exactly the routes the matcher used to list", () => {
    for (const path of [
      "/",
      "/auth/login",
      "/request-access",
      "/admin",
      "/admin/users",
      "/d",
      "/d/some-droplet/some-lesson",
      "/activity",
      "/activity/friends",
    ]) {
      expect(isAuthRoute(path)).toBe(true);
    }
    for (const path of [
      "/explore",
      "/dashboard",
      "/administrator",
      "/draft/d/some-droplet",
      "/auth/login/extra",
      "/activityfeed",
    ]) {
      expect(isAuthRoute(path)).toBe(false);
    }
  });

  it("runs on every route except build output and static files", () => {
    expect(config.matcher).toEqual([
      "/((?!_next/static|_next/image|.*\\.[A-Za-z0-9]+$).*)",
    ]);
  });

  describe("maintenance mode", () => {
    const saved = {
      mode: process.env.MAINTENANCE_MODE,
      token: process.env.MAINTENANCE_BYPASS_TOKEN,
    };

    beforeEach(() => {
      process.env.MAINTENANCE_MODE = "true";
      process.env.MAINTENANCE_BYPASS_TOKEN = "s3cret-token";
      jest.mocked(getToken).mockResolvedValue(signedInToken as never);
    });

    afterAll(() => {
      for (const [key, value] of [
        ["MAINTENANCE_MODE", saved.mode],
        ["MAINTENANCE_BYPASS_TOKEN", saved.token],
      ] as const) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    });

    it.each(["/", "/explore", "/activity", "/d/some-droplet"])(
      "shows the maintenance page on %s, even when signed in",
      async (path) => {
        const res = (await run(path)) as unknown as {
          body: string;
          init: ResponseInit;
        };
        expect(res.init.status).toBe(503);
        expect(res.init.headers).toMatchObject({
          "Retry-After": "300",
          "Cache-Control": "no-store",
          "Content-Type": "text/html; charset=utf-8",
        });
        expect(res.body).toContain("Odyssey is getting an update");
        expect(getToken).not.toHaveBeenCalled();
      },
    );

    it("answers API routes with JSON", async () => {
      const res = (await run("/api/run-code", {
        method: "POST",
      })) as unknown as {
        json: { error: string };
        init: ResponseInit;
      };
      expect(res.init.status).toBe(503);
      expect(res.json.error).toMatch(/maintenance/);
    });

    it("blocks Server Actions with a plain 503", async () => {
      const res = (await run("/d/some-droplet", {
        method: "POST",
      })) as unknown as {
        body: string;
        init: ResponseInit;
      };
      expect(res.init.status).toBe(503);
      expect(res.init.headers).toMatchObject({
        "Content-Type": "text/plain; charset=utf-8",
      });
    });

    it("lets the ALB health check reach the normal page", async () => {
      jest.mocked(getToken).mockResolvedValue(null);

      await expect(
        run("/", { userAgent: "ELB-HealthChecker/2.0" }),
      ).resolves.toBeUndefined();
    });

    it("sets the bypass cookie and drops the token from the URL", async () => {
      await expect(
        run("/explore?maintenance_bypass=s3cret-token&tab=droplets"),
      ).resolves.toEqual({
        redirectedTo: "http://localhost:3000/explore?tab=droplets",
      });
      expect(mockSetCookie).toHaveBeenCalledWith(
        "odyssey_maintenance_bypass",
        "s3cret-token",
        expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
      );
    });

    it("lets a browser with the bypass cookie use the site normally", async () => {
      const cookies = { odyssey_maintenance_bypass: "s3cret-token" };

      await expect(run("/explore", { cookies })).resolves.toBeUndefined();
      // The sign-in redirects still apply behind the bypass.
      await expect(run("/", { cookies })).resolves.toEqual({
        redirectedTo: "http://localhost:3000/activity",
      });
    });
  });
});
