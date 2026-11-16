/** @jest-environment node */
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { runReminderCheck } from "@/lib/reminders";
import { fetchAPI } from "@/lib/utils";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

const fetchApiMock = fetchAPI as jest.Mock;
const fetchMock = jest.fn();
const NOW = new Date("2026-11-20T17:00:00Z"); // noon in Boston
const daysAgo = (n: number) =>
  new Date(NOW.getTime() - n * 86_400_000).toISOString();
const learner = { id: 7, timeZone: "America/New_York" };

const enrollment = (over = {}) => ({
  id: 3,
  createdAt: daysAgo(30),
  lastProgressDate: daysAgo(5),
  isArchived: false,
  viewedLessons: [{ id: 1 }],
  droplet: {
    id: 10,
    name: "Git",
    status: "published",
    isHidden: false,
    lessons: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
  },
  ...over,
});

/** Feeds fetchAPI the three reads, in order: reminder rows, enrollments, due dates */
const load = (rows: object[] = [], enrollments = [enrollment()], due = []) =>
  fetchApiMock
    .mockResolvedValueOnce(rows)
    .mockResolvedValueOnce(enrollments)
    .mockResolvedValueOnce(due);

const reply = (json: unknown, ok = true) =>
  fetchMock.mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: async () => json,
    text: async () => JSON.stringify(json),
  });

const body = () => JSON.parse(fetchMock.mock.calls[0][1].body).data;

beforeEach(() => {
  jest.resetAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("runReminderCheck", () => {
  it("stops after one read when a reminder was raised today", async () => {
    fetchApiMock.mockResolvedValueOnce([{ id: 1, firstCreated: daysAgo(0) }]);

    expect(await runReminderCheck(learner, { now: NOW })).toEqual({
      raised: false,
      reason: "today",
    });
    expect(fetchApiMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads uncached, never passing both cache and next", async () => {
    load();
    reply({ data: { raised: true, id: 1 } });
    await runReminderCheck(learner, { now: NOW });

    for (const [, opts] of fetchApiMock.mock.calls) {
      expect(opts.cache).toBe("no-store");
      expect(opts.next).toBeUndefined();
    }
  });

  it("posts the pick, and revalidates the feed when raised", async () => {
    load();
    reply({ data: { raised: true, id: 1 } });

    const result = await runReminderCheck(
      { id: 7, timeZone: "America/Los_Angeles" },
      { now: NOW },
    );

    expect(result.raised).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/api\/announcements\/raise-reminder$/);
    expect(init.headers["Strapi-Response-Format"]).toBe("v4");
    expect(body()).toEqual({
      userId: 7,
      dropletId: 10,
      now: NOW.toISOString(),
      dayStart: "2026-11-20T08:00:00.000Z",
      lastRaisedAt: null,
      count: 1,
      content: "Pick up Git where you left off.",
    });
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.userFeed(7));
  });

  it("sends content trimmed even when the droplet name has spaces", async () => {
    const padded = enrollment();
    padded.droplet.name = "  Databases  ";
    load([], [padded], [
      { dueDate: "2026-11-21", droplet: { id: 10 } },
    ] as never);
    reply({ data: { raised: true, id: 1 } });

    await runReminderCheck(learner, { now: NOW });

    expect(body().content).toMatch(/^Databases {3}is due tomorrow/);
  });

  it("asks for rows by id and sends the lowest id's lastRaisedAt", async () => {
    const rows = [
      {
        id: 1,
        firstCreated: daysAgo(10),
        reminderCount: 1,
        droplet: { id: 10 },
      },
      {
        id: 2,
        firstCreated: daysAgo(20),
        reminderCount: 2,
        droplet: { id: 10 },
      },
    ];
    load(rows);
    reply({ data: { raised: true, id: 1 } });

    await runReminderCheck(learner, { now: NOW });

    expect(fetchApiMock.mock.calls[0][1].urlParams.sort).toEqual(["id:asc"]);
    expect(body().lastRaisedAt).toBe(daysAgo(10));
  });

  it("sends the existing row's lastRaisedAt and the next count", async () => {
    const row = {
      id: 1,
      firstCreated: daysAgo(10),
      reminderCount: 1,
      droplet: { id: 10 },
    };
    load([row], [enrollment({ lastProgressDate: daysAgo(20) })]);
    reply({ data: { raised: true, id: 1 } });

    await runReminderCheck(learner, { now: NOW });

    expect(body()).toMatchObject({ lastRaisedAt: daysAgo(10), count: 2 });
  });

  it("doesn't revalidate when Strapi declines", async () => {
    load();
    reply({ data: { raised: false, reason: "today" } });

    expect(await runReminderCheck(learner, { now: NOW })).toMatchObject({
      raised: false,
      reason: "today",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("raises nothing when no droplet is eligible", async () => {
    load([], [enrollment({ isArchived: true })]);

    expect(await runReminderCheck(learner, { now: NOW })).toMatchObject({
      raised: false,
      reason: "none",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("a dry run decides but never posts, even after a raise today", async () => {
    load([{ id: 1, firstCreated: daysAgo(0), droplet: { id: 99 } }]);

    const result = await runReminderCheck(learner, { now: NOW, dryRun: true });

    expect(result.pick?.candidate.dropletId).toBe(10);
    expect(result.decisions).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["a failed read", () => fetchApiMock.mockRejectedValueOnce(new Error("x"))],
    [
      "a failed POST",
      () => {
        load();
        reply({ error: { message: "Boom" } }, false);
      },
    ],
    [
      "a network error",
      () => {
        load();
        fetchMock.mockRejectedValueOnce(new Error("down"));
      },
    ],
  ])("returns error on %s without throwing", async (_, arrange) => {
    arrange();

    expect(await runReminderCheck(learner, { now: NOW })).toMatchObject({
      raised: false,
      reason: "error",
    });
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("run twice: the second call sees the row and posts nothing", async () => {
    load();
    reply({ data: { raised: true, id: 1 } });
    await runReminderCheck(learner, { now: NOW });
    const raisedAt = body().now;

    fetchApiMock.mockResolvedValueOnce([
      { id: 1, firstCreated: raisedAt, droplet: { id: 10 } },
    ]);
    const second = await runReminderCheck(learner, { now: NOW });

    expect(second).toEqual({ raised: false, reason: "today" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
