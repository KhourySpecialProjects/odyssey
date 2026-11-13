/** @jest-environment node */
import { GET, POST } from "@/app/api/dev/reminders/route";
import { requireRole } from "@/lib/auth/require-role";
import { runReminderCheck } from "@/lib/reminders";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/reminders", () => ({ runReminderCheck: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));

const env = process.env as Record<string, string | undefined>;
const AT = "2026-11-24T17:00:00.000Z";
const call = (method: typeof GET, query = `?at=${AT}`) =>
  // jest.setup stubs the global Request, so pass just the url the route reads
  method({ url: `http://localhost/api/dev/reminders${query}` } as Request);

beforeEach(() => {
  jest.resetAllMocks();
  env.NODE_ENV = "development";
  env.ENABLE_REMINDER_TEST_CLOCK = "true";
  (requireRole as jest.Mock).mockResolvedValue({
    ok: true,
    user: { id: 7, email: "s@example.invalid", roles: [] },
  });
  (getAuthorizedUserByEmail as jest.Mock).mockResolvedValue({
    id: 7,
    timeZone: "America/Chicago",
  });
  (runReminderCheck as jest.Mock).mockResolvedValue({ raised: false });
});

afterAll(() => {
  env.NODE_ENV = "test";
  delete env.ENABLE_REMINDER_TEST_CLOCK;
});

describe("/api/dev/reminders", () => {
  it.each([
    ["the flag is off", "development", "false"],
    ["NODE_ENV is production", "production", "true"],
  ])("404s when %s", async (_, nodeEnv, flag) => {
    env.NODE_ENV = nodeEnv;
    env.ENABLE_REMINDER_TEST_CLOCK = flag;
    expect((await call(GET)).status).toBe(404);
    expect((await call(POST)).status).toBe(404);
    expect(runReminderCheck).not.toHaveBeenCalled();
  });

  it("401s without a session", async () => {
    (requireRole as jest.Mock).mockResolvedValue({
      ok: false,
      error: "unauthenticated",
    });
    expect((await call(GET)).status).toBe(401);
    expect(runReminderCheck).not.toHaveBeenCalled();
  });

  it.each(["tomorrow", "1", "11/24/2026", "2026-11-24T17:00:00"])(
    "400s on a bad `at` (%s)",
    async (at) => {
      expect((await call(GET, `?at=${encodeURIComponent(at)}`)).status).toBe(
        400,
      );
      expect(runReminderCheck).not.toHaveBeenCalled();
    },
  );

  it("accepts an offset datetime", async () => {
    const res = await call(GET, "?at=2026-11-24T12:00:00-05:00");
    expect(res.status).toBe(200);
  });

  it("accepts a `+` offset that searchParams decoded to a space", async () => {
    // ?at=2026-11-24T12:00:00+09:00 reaches the route with a space
    const res = await call(GET, "?at=2026-11-24T12:00:00 09:00");
    expect(res.status).toBe(200);
    const { now } = (runReminderCheck as jest.Mock).mock.calls[0][1];
    expect(now.toISOString()).toBe("2026-11-24T03:00:00.000Z");
  });

  it("defaults `at` to now when it is missing", async () => {
    const before = Date.now();
    await call(GET, "");
    const { now } = (runReminderCheck as jest.Mock).mock.calls[0][1];
    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it.each([
    ["no user record", () => null],
    ["a failed lookup", () => Promise.reject(new Error("down"))],
  ])("leaves the time zone unset with %s", async (_, lookup) => {
    (getAuthorizedUserByEmail as jest.Mock).mockImplementation(async () =>
      lookup(),
    );
    await call(GET);
    expect(runReminderCheck).toHaveBeenCalledWith(
      { id: 7, timeZone: undefined },
      expect.anything(),
    );
  });

  it("GET previews as of `at` with the learner's time zone", async () => {
    const res = await call(GET);
    expect(runReminderCheck).toHaveBeenCalledWith(
      { id: 7, timeZone: "America/Chicago" },
      { now: new Date(AT), dryRun: true },
    );
    expect(await res.json()).toMatchObject({ at: AT, raised: false });
  });

  it("POST raises as of `at`", async () => {
    await call(POST);
    expect(runReminderCheck).toHaveBeenCalledWith(expect.anything(), {
      now: new Date(AT),
      dryRun: false,
    });
  });
});
