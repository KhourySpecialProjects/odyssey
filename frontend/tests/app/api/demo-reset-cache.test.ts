import { revalidatePath } from "next/cache";
import type { NextRequest } from "next/server";
import { POST } from "@/app/api/demo/reset-cache/route";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
// jsdom has no Response, which the real NextResponse needs
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

const originalEnv = process.env;
const request = (authorization?: string) =>
  ({
    headers: { get: () => authorization ?? null },
  }) as unknown as NextRequest;

beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...originalEnv,
    DEMO_MODE: "true",
    DEMO_RESET_SECRET: "reset-secret",
  };
});

afterAll(() => {
  process.env = originalEnv;
});

describe("POST /api/demo/reset-cache", () => {
  it("clears the cached data with the demo reset secret", async () => {
    const response = await POST(request("Bearer reset-secret"));

    expect(response.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("refuses a wrong or missing secret", async () => {
    expect((await POST(request("Bearer guess"))).status).toBe(401);
    expect((await POST(request())).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("doesn't exist outside demo mode", async () => {
    process.env.DEMO_MODE = "false";

    expect((await POST(request("Bearer reset-secret"))).status).toBe(404);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("doesn't exist when no reset secret is set", async () => {
    delete process.env.DEMO_RESET_SECRET;

    expect((await POST(request("Bearer "))).status).toBe(404);
  });
});
