/** @jest-environment node */
import { GET } from "@/app/api/mentor/stream-check/route";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { readMentorEvents, type MentorEvent } from "@/lib/mentor/events";
import { mentorDone, mentorText } from "@/testing/mocks/mentorEventsMock";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
const gate = jest.mocked(requireRole);

// jest.setup.ts stubs Request, and the route only reads the URL
const get = (query = "") =>
  GET({ url: `http://localhost/api/mentor/stream-check${query}` } as Request);

const NUMBERS = Array.from({ length: 10 }, (_, i) => mentorText(`${i + 1} `));

/** The events so far, as they arrive */
function collect(body: ReadableStream<Uint8Array>) {
  const events: MentorEvent[] = [];
  const finished = (async () => {
    for await (const event of readMentorEvents(body)) events.push(event);
  })();
  return { events, finished };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.spyOn(console, "info").mockImplementation(() => {});
  gate.mockResolvedValue({
    ok: true,
    user: { id: 1, email: "a@b.c", roles: [AuthorizedUserRoleTitle.SysAdmin] },
  });
});
afterEach(() => jest.useRealTimers());

describe("GET /api/mentor/stream-check", () => {
  it.each([
    ["signed out", "unauthenticated", 401],
    ["not a System Admin", "forbidden", 403],
  ] as const)("refuses a user who is %s", async (_, error, status) => {
    gate.mockResolvedValue({ ok: false, error });
    const response = await get();
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ error });
  });

  it.each([
    ["?gap=2", 2_000],
    ["?gap=500", 120_000],
    ["?gap=-3", 0],
    ["?gap=abc", 0],
  ])("streams ten numbers, waits %s, then ends", async (query, gapMs) => {
    const response = await get(query);
    expect(gate).toHaveBeenCalledWith([AuthorizedUserRoleTitle.SysAdmin]);
    const { events, finished } = collect(response.body!);
    await jest.advanceTimersByTimeAsync(10 * 300 + gapMs - 1);
    expect(events).toEqual(NUMBERS);
    await jest.advanceTimersByTimeAsync(1);
    await finished;
    expect(events).toEqual([
      ...NUMBERS,
      mentorText("after the gap"),
      mentorDone(),
    ]);
  });

  it("stops when the browser goes away", async () => {
    const response = await get("?gap=60");
    await response.body!.cancel();
    await jest.advanceTimersByTimeAsync(0);
    expect(console.info).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
