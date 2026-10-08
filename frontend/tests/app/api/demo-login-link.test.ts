import type { NextRequest } from "next/server";
import { POST } from "@/app/api/demo/login-link/route";
import { redeemLoginLinkToken } from "@/lib/auth/demo-login-link";
import { fetchAPI } from "@/lib/utils";

jest.mock("@/lib/utils", () => ({ fetchAPI: jest.fn() }));
// jsdom has no Response, which the real NextResponse needs
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

const mockFetchAPI = fetchAPI as jest.MockedFunction<typeof fetchAPI>;
const SECRET = "control-secret";
const originalEnv = process.env;

const request = (body: unknown, authorization = `Bearer ${SECRET}`) =>
  ({
    headers: { get: () => authorization },
    json: async () => body,
    nextUrl: { origin: "http://localhost:3001" },
  }) as unknown as NextRequest;

type LinkResponse = { status: number; body: { url?: string; error?: string } };
const post = async (req: NextRequest) =>
  (await POST(req)) as unknown as LinkResponse;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    DEMO_MODE: "true",
    DEMO_CONTROL_SECRET: SECRET,
    NEXTAUTH_URL: "http://localhost:3001",
  };
  mockFetchAPI.mockResolvedValue([
    { id: 6, email: "student1@demo.odyssey.test", isEnabled: true },
  ] as never);
});

afterAll(() => {
  process.env = originalEnv;
});

describe("POST /api/demo/login-link", () => {
  it("returns a link that logs the persona in, landing where asked", async () => {
    const response = await post(
      request({ email: "Student1@demo.odyssey.test ", callbackUrl: "/review" }),
    );

    expect(response.status).toBe(200);
    const url = new URL(response.body.url!);
    expect(url.origin).toBe("http://localhost:3001");
    expect(url.pathname).toBe("/auth/demo-link");
    expect(url.searchParams.get("callbackUrl")).toBe("/review");
    expect(redeemLoginLinkToken(url.searchParams.get("token")!, SECRET)).toBe(
      "student1@demo.odyssey.test",
    );
  });

  it("never lands off the site", async () => {
    const response = await post(
      request({
        email: "student1@demo.odyssey.test",
        callbackUrl: "https://evil.example",
      }),
    );

    expect(new URL(response.body.url!).searchParams.get("callbackUrl")).toBe(
      "/explore",
    );
  });

  it("refuses a wrong secret", async () => {
    const response = await post(
      request({ email: "student1@demo.odyssey.test" }, "Bearer guess"),
    );

    expect(response.status).toBe(401);
    expect(mockFetchAPI).not.toHaveBeenCalled();
  });

  it("only makes links for demo accounts that exist", async () => {
    expect(
      (await post(request({ email: "someone@northeastern.edu" }))).status,
    ).toBe(400);

    mockFetchAPI.mockResolvedValueOnce([] as never);
    expect(
      (await post(request({ email: "nobody@demo.odyssey.test" }))).status,
    ).toBe(404);
  });

  it("doesn't exist outside demo mode or without the secret", async () => {
    process.env.DEMO_MODE = "false";
    expect(
      (await post(request({ email: "student1@demo.odyssey.test" }))).status,
    ).toBe(404);

    process.env.DEMO_MODE = "true";
    delete process.env.DEMO_CONTROL_SECRET;
    expect(
      (await post(request({ email: "student1@demo.odyssey.test" }))).status,
    ).toBe(404);
  });
});
