/** @jest-environment node */
import {
  findCachedReply,
  storeCachedReply,
  type CachedReplyRow,
} from "@/lib/mentor/cached-reply-store";

const fetchMock = jest.fn();

function reply(status: number, json: unknown) {
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
  });
}

const row: CachedReplyRow = {
  key: `lesson:4:${"a".repeat(64)}`,
  slot: "lesson:4",
  scope: "lesson",
  dropletId: 2,
  lessonId: 4,
  promptVersion: "v1",
  model: "claude-haiku-5-5",
  text: "A saved summary.",
};

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("findCachedReply", () => {
  it("posts the key with the service token and returns the saved text", async () => {
    reply(200, { data: { text: "Saved." } });

    expect(await findCachedReply(row.key)).toBe("Saved.");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/mentor-cached-replies/find");
    expect(JSON.parse(init.body)).toEqual({ key: row.key });
    expect(init.cache).toBe("no-store");
    expect(init.next).toBeUndefined();
    expect(init.headers).toEqual(
      expect.objectContaining({
        Authorization: expect.stringMatching(/^Bearer /),
        "Strapi-Response-Format": "v4",
      }),
    );
  });

  it.each([
    ["no saved text", () => reply(200, { data: { text: null } })],
    ["a 500", () => reply(500, { error: { message: "boom" } })],
    ["a network error", () => fetchMock.mockRejectedValueOnce(new Error("x"))],
  ])("is a miss for %s", async (_, arrange) => {
    arrange();
    expect(await findCachedReply(row.key)).toBeNull();
  });
});

describe("storeCachedReply", () => {
  it("posts exactly the row's keys and returns stored", async () => {
    reply(200, { data: { id: 9, stored: true } });

    expect(await storeCachedReply(row)).toEqual({ stored: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/mentor-cached-replies/store");
    expect(JSON.parse(init.body)).toEqual(row);
    expect(init.cache).toBe("no-store");
  });

  it("reports an existing row as not stored", async () => {
    reply(200, { data: { id: 9, stored: false } });
    expect(await storeCachedReply(row)).toEqual({ stored: false });
  });

  it.each([
    ["a 400", () => reply(400, { error: { message: "bad" } })],
    ["a 500", () => reply(500, { error: { message: "boom" } })],
    ["a network error", () => fetchMock.mockRejectedValueOnce(new Error("x"))],
  ])("is null for %s", async (_, arrange) => {
    arrange();
    expect(await storeCachedReply(row)).toBeNull();
  });
});
