/** @jest-environment node */
import qs from "qs";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  getStreakFor,
  recordStreakDay,
  reviveStreakDay,
} from "@/lib/streak-days";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

const fetchMock = jest.fn();
const reply = (status: number, json: unknown) =>
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: async () => json,
    text: async () => JSON.stringify(json),
  });
/** One page of streak-day rows, v4-shaped as Strapi sends them */
const page = (rows: [string, number[], boolean?][], pageCount = 1) => ({
  data: rows.map(([date, lessonIds, revived = false], i) => ({
    id: i + 1,
    attributes: { date, lessonIds, revived },
  })),
  meta: { pagination: { page: 1, pageCount } },
});
const queryOf = (call: number) =>
  qs.parse(String(fetchMock.mock.calls[call][0]).split("?")[1]);

// 23:30 in Boston on 9 Nov is already 10 Nov in Tokyo
const NOW = new Date("2026-11-10T04:30:00Z");
const learner = { id: 7, timeZone: "America/New_York" };

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe("recordStreakDay", () => {
  it.each([
    ["America/New_York", "2026-11-09"],
    ["Asia/Tokyo", "2026-11-10"],
    [null, "2026-11-09"],
  ])("dates the lesson in %s as %s", async (timeZone, date) => {
    reply(200, { data: { date, lessons: 1, added: true } });

    expect(await recordStreakDay({ id: 7, timeZone }, 42, NOW)).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/streak-days\/record$/);
    expect(init).toMatchObject({ method: "POST", cache: "no-store" });
    expect(init.headers["Strapi-Response-Format"]).toBe("v4");
    expect(JSON.parse(init.body)).toEqual({
      data: { userId: 7, date, lessonId: 42 },
    });
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.streak(7));
  });

  it("leaves the cache alone when the lesson was already on the day", async () => {
    reply(200, { data: { date: "2026-11-09", lessons: 1, added: false } });

    expect(await recordStreakDay(learner, 42, NOW)).toBe(true);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["a 500", () => reply(500, { data: null, error: { message: "Boom" } })],
    ["a network failure", () => fetchMock.mockRejectedValueOnce(new Error())],
  ])("returns false on %s, without throwing", async (_, fail) => {
    fail();

    expect(await recordStreakDay(learner, 42, NOW)).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("getStreakFor", () => {
  it("reads the learner's days and works out the streak on their date", async () => {
    reply(
      200,
      page([
        ["2026-10-01", [1]],
        ["2026-11-07", [2, 3]],
        ["2026-11-08", [4]],
        ["2026-11-09", [5, 6, 7]],
      ]),
    );

    expect(await getStreakFor(learner, { now: NOW })).toEqual({
      current: 3,
      longest: 3,
      litToday: true,
      startedOn: "2026-11-07",
      today: "2026-11-09",
      days: [
        { date: "2026-10-01", lessons: 1 },
        { date: "2026-11-07", lessons: 2 },
        { date: "2026-11-08", lessons: 1 },
        { date: "2026-11-09", lessons: 3 },
      ],
      revivesLeft: 2,
      revive: null,
    });
    expect(fetchMock.mock.calls[0][0]).toContain("/api/streak-days?");
    expect(queryOf(0)).toEqual({
      filters: { user: { id: { $eq: "7" } } },
      fields: ["date", "lessonIds", "revived"],
      sort: ["date:asc"],
      pagination: { page: "1", pageSize: "1000" },
    });
    expect(fetchMock.mock.calls[0][1].next).toEqual({
      tags: [CACHE_TAGS.streak(7)],
      revalidate: 900,
    });
  });

  it("reads every page", async () => {
    reply(200, page([["2026-11-08", [1]]], 2));
    reply(200, page([["2026-11-09", [2]]], 2));

    const streak = await getStreakFor(learner, { now: NOW });

    expect(streak.days.map((d) => d.date)).toEqual([
      "2026-11-08",
      "2026-11-09",
    ]);
    expect(streak.current).toBe(2);
    expect(queryOf(1).pagination).toEqual({ page: "2", pageSize: "1000" });
  });

  it("counts revived days, and offers yesterday when it was missed", async () => {
    // Boston's 9 Nov: 8 Nov was missed, 6 Nov was revived earlier
    reply(
      200,
      page([
        ["2026-11-05", [1]],
        ["2026-11-06", [], true],
        ["2026-11-07", [2]],
      ]),
    );

    const streak = await getStreakFor(learner, { now: NOW });

    expect(streak.days[1]).toEqual({
      date: "2026-11-06",
      lessons: 0,
      revived: true,
    });
    expect(streak.current).toBe(0);
    expect(streak.longest).toBe(3);
    expect(streak.revivesLeft).toBe(1);
    expect(streak.revive).toEqual({
      date: "2026-11-08",
      ended: 3,
      restored: 4,
    });
  });

  it("skips the cache when asked for a fresh read", async () => {
    reply(200, page([]));

    await getStreakFor(learner, { now: NOW, fresh: true });

    const init = fetchMock.mock.calls[0][1];
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
  });
});

describe("reviveStreakDay", () => {
  it("revives the learner's yesterday", async () => {
    reply(200, { data: { date: "2026-11-08", revivesLeft: 1, added: true } });

    expect(await reviveStreakDay(learner, NOW)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/streak-days\/revive$/);
    expect(init.headers["Strapi-Response-Format"]).toBe("v4");
    expect(JSON.parse(init.body)).toEqual({
      data: { userId: 7, date: "2026-11-08" },
    });
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.streak(7));
  });

  it.each([
    [409, "No revives left", "No revives left"],
    [500, "Boom", "Couldn't revive your streak. Try again."],
  ])(
    "returns why on a %i, without throwing",
    async (status, message, shown) => {
      reply(status, { data: null, error: { message } });

      expect(await reviveStreakDay(learner, NOW)).toEqual({
        ok: false,
        message: shown,
      });
      expect(revalidateTag).not.toHaveBeenCalled();
    },
  );

  it("returns a message on a network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));

    expect(await reviveStreakDay(learner, NOW)).toEqual({
      ok: false,
      message: "Couldn't revive your streak. Try again.",
    });
  });
});
