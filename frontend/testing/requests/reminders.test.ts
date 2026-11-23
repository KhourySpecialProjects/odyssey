import { revalidateTag } from "next/cache";
import {
  checkMyReminder,
  muteReminder,
  snoozeReminder,
  undoReminder,
} from "@/lib/requests/reminders";
import { requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { runReminderCheck } from "@/lib/reminders";
import { fetchAPI } from "@/lib/utils";
import { makeFetchResponse } from "@/lib/testing/mock-helpers";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));
jest.mock("@/lib/reminders", () => ({
  ...jest.requireActual("@/lib/reminders"),
  runReminderCheck: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedGetUser = jest.mocked(getAuthorizedUserByEmail);
const mockedCheck = jest.mocked(runReminderCheck);
const mockedFetchAPI = jest.mocked(fetchAPI);
const fetchMock = jest.fn();
const mockedRevalidate = jest.mocked(revalidateTag);

// Noon Boston, Friday 20 Nov 2026 (Los Angeles is 09:00 the same day)
const NOW = new Date("2026-11-20T17:00:00Z");
const OWNER = authFixtures.as({ id: 7 });

const row = (over: object = {}) => ({
  id: 5,
  documentId: "doc5",
  authorized_user: { id: 7 },
  ...over,
});
const putBody = () => JSON.parse(fetchMock.mock.calls[0][1].body).data;
/** Answers fetchAPI by path: the reminder row, then the caller's read rows */
const serve = (reads: object[] = []) =>
  mockedFetchAPI.mockImplementation((async (path: string) =>
    path === "/announcement-reads" ? reads : [row()]) as never);

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate"] });
  jest.setSystemTime(NOW);
  jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockResolvedValue(makeFetchResponse({ data: {} }));
  mockedRequireRole.mockResolvedValue(OWNER);
  serve();
  mockedGetUser.mockResolvedValue({
    id: 7,
    timeZone: "America/Los_Angeles",
  } as never);
  mockedCheck.mockResolvedValue({ raised: true });
});

afterEach(() => jest.useRealTimers());

describeServerActionAuth("checkMyReminder", {
  requireRole: mockedRequireRole,
  invoke: () => checkMyReminder(),
  mutations: () => [mockedGetUser, mockedCheck],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: OWNER,
    expect: (result) => {
      expect(result).toEqual({
        ok: true,
        error: null,
        data: { raised: true },
      });
      // The caller's own id from the gate, their zone from their record
      expect(mockedGetUser).toHaveBeenCalledWith("user7@northeastern.edu", {
        fields: ["id", "timeZone"],
      });
      expect(mockedCheck).toHaveBeenCalledWith({
        id: 7,
        timeZone: "America/Los_Angeles",
      });
    },
  },
  expectDenied: (result, code) => {
    expect(result).toEqual({ ok: false, error: code, data: null });
  },
});

it("returns an error, not a throw, when the check fails", async () => {
  mockedGetUser.mockRejectedValue(new Error("Strapi is down"));

  expect(await checkMyReminder()).toEqual({
    ok: false,
    error: "Couldn't check your reminders.",
    data: null,
  });
});

const ACTIONS: [string, (id: unknown) => Promise<unknown>][] = [
  [
    "snoozeReminder",
    (id: unknown) => snoozeReminder(id as number, "in_3_days"),
  ],
  ["muteReminder", (id: unknown) => muteReminder(id as number)],
  ["undoReminder", (id: unknown) => undoReminder(id as number)],
];

describe.each(ACTIONS)("%s", (name, run) => {
  describeServerActionAuth(name, {
    requireRole: mockedRequireRole,
    invoke: () => run(5),
    mutations: () => [fetchMock, mockedRevalidate],
    denial: { kind: "owner", nonOwner: authFixtures.as({ id: 99 }) },
    authorized: {
      as: OWNER,
      expect: (result) => expect(result).toMatchObject({ ok: true }),
    },
    expectDenied: (result, code) =>
      expect(result).toEqual({ ok: false, error: code, data: null }),
  });

  it("refuses a System Admin who isn't the owner, with no write", async () => {
    mockedRequireRole.mockResolvedValue(authFixtures.admin(1));

    expect(await run(5)).toEqual({ ok: false, error: "forbidden", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("refuses an owner-less row", async () => {
    mockedFetchAPI.mockResolvedValue([row({ authorized_user: null })] as never);

    expect(await run(5)).toEqual({ ok: false, error: "forbidden", data: null });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["an id of 0", 0, [row()], "invalid"],
    ["a negative id", -1, [row()], "invalid"],
    ["a fractional id", 1.5, [row()], "invalid"],
    ["a string id", "7", [row()], "invalid"],
    ["no row (missing or not a reminder)", 5, [], "not_found"],
  ])("refuses %s", async (_label, id, rows, error) => {
    mockedFetchAPI.mockResolvedValue(rows as never);

    expect(await run(id)).toEqual({ ok: false, error, data: null });
    expect(fetchMock).not.toHaveBeenCalled();
    if (error === "invalid") expect(mockedFetchAPI).not.toHaveBeenCalled();
  });

  it("reads only reminder rows, fresh", async () => {
    await run(5);

    expect(mockedFetchAPI).toHaveBeenCalledWith(
      "/announcements",
      expect.objectContaining({
        cache: "no-store",
        urlParams: expect.objectContaining({
          filters: { id: { $eq: 5 }, type: { $eq: "reminder" } },
        }),
      }),
    );
  });

  it("returns ok: false and doesn't throw when the PUT fails", async () => {
    fetchMock.mockResolvedValue(makeFetchResponse({}, 500));

    expect(await run(5)).toEqual({
      ok: false,
      error: "Couldn't update this reminder.",
      data: null,
    });
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });
});

describe("what each action writes", () => {
  const readRow = { id: 70, documentId: "r70" };

  // Read state is the caller's announcement-reads row (ODY-786), never readAt
  it.each([
    [
      "snoozeReminder",
      () => snoozeReminder(5, "in_3_days"),
      [],
      {
        reminderSnoozedUntil: "2026-11-23T08:00:00.000Z",
        reminderMutedUntil: null,
      },
      ["POST", /\/api\/announcement-reads$/],
    ],
    [
      "muteReminder",
      () => muteReminder(5),
      [],
      {
        reminderSnoozedUntil: null,
        reminderMutedUntil: "2026-12-20T08:00:00.000Z",
      },
      ["POST", /\/api\/announcement-reads$/],
    ],
    [
      "undoReminder",
      () => undoReminder(5),
      [readRow],
      { reminderSnoozedUntil: null, reminderMutedUntil: null },
      ["DELETE", /\/api\/announcement-reads\/r70$/],
    ],
  ] as const)(
    "%s sends its fields and sets the caller's read row",
    async (_name, run, reads, fields, [method, readUrl]) => {
      serve([...reads]);
      await run();

      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/api\/announcements\/doc5$/);
      expect(init.method).toBe("PUT");
      expect(init.headers).toMatchObject({ "Strapi-Response-Format": "v4" });
      expect(putBody()).toEqual({ ...fields, readAt: null });
      const [url2, init2] = fetchMock.mock.calls[1];
      expect(url2).toMatch(readUrl);
      expect(init2.method).toBe(method);
      if (method === "POST") {
        expect(JSON.parse(init2.body).data).toEqual({
          announcement: "doc5",
          authorized_user: "doc7",
        });
      }
      expect(mockedRevalidate).toHaveBeenCalledTimes(1);
      expect(mockedRevalidate).toHaveBeenCalledWith(CACHE_TAGS.userFeed(7));
    },
  );

  it.each([
    [
      "snooze keeps an existing read row",
      () => snoozeReminder(5, "tomorrow"),
      [readRow],
    ],
    ["undo with no read row deletes nothing", () => undoReminder(5), []],
  ])("%s", async (_label, run, reads) => {
    serve(reads);
    await run();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
  });

  it("returns an error, with no revalidate, when the read row write fails", async () => {
    fetchMock
      .mockResolvedValueOnce(makeFetchResponse({ data: {} }))
      .mockResolvedValueOnce(makeFetchResponse({}, 500));

    expect(await snoozeReminder(5, "tomorrow")).toEqual({
      ok: false,
      error: "Couldn't update this reminder.",
      data: null,
    });
    expect(mockedRevalidate).not.toHaveBeenCalled();
  });

  it("snooze returns the date in the learner's zone", async () => {
    expect(await snoozeReminder(5, "tomorrow")).toEqual({
      ok: true,
      error: null,
      data: { until: "2026-11-21T08:00:00.000Z", dateLabel: "Sat, Nov 21" },
    });
  });

  it("refuses a bad choice with no read or write", async () => {
    const result = await snoozeReminder(5, "someday" as never);

    expect(result).toEqual({ ok: false, error: "invalid", data: null });
    expect(mockedFetchAPI).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
