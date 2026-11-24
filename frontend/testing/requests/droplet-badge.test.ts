import fs from "fs";
import path from "path";
import { revalidateTag } from "next/cache";
import {
  getBadgeOptions,
  getPickedBadges,
  pickBadge,
  saveBadgeOptions,
} from "@/lib/requests/droplet-badge";
import { makeFetchResponse, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

const BASE = "https://strapi.test/api/droplet-badges";
let fetchMock: jest.MockedFunction<typeof fetch>;
let errorSpy: jest.SpyInstance;

const call = () => ({
  url: String(fetchMock.mock.calls[0][0]),
  init: fetchMock.mock.calls[0][1] as RequestInit & {
    next?: { tags: string[]; revalidate: number };
  },
});
const reply = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValue(makeFetchResponse(body, status));

const option = { title: "Ribbon", emblemSvg: "<svg></svg>", model: "m" };

beforeEach(() => {
  jest.clearAllMocks();
  process.env.NEXT_PUBLIC_STRAPI_API_URL = "https://strapi.test";
  process.env.STRAPI_ACCESS_TOKEN = "service-token";
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  fetchMock = mockGlobalFetch();
  reply({ data: [] });
});

describe("module", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../lib/requests/droplet-badge.ts"),
    "utf8",
  );

  it('imports "server-only" first and is not a "use server" file', () => {
    expect(source.split("\n")[0]).toBe('import "server-only";');
    expect(source).not.toMatch(/^\s*["']use server["'];?\s*$/m);
  });
});

describe("getPickedBadges", () => {
  it("GETs the ids with the service token, the v4 header and the cache tags", async () => {
    reply({ data: [{ dropletId: 1, title: "T", emblemSvg: "<svg></svg>" }] });
    const result = await getPickedBadges([1, 2, 2, 3]);
    expect(result).toEqual({
      ok: true,
      data: [{ dropletId: 1, title: "T", emblemSvg: "<svg></svg>" }],
    });
    const { url, init } = call();
    expect(url).toBe(`${BASE}/picked?dropletIds=1,2,3`);
    expect(init.method).toBe("GET");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer service-token",
      "Strapi-Response-Format": "v4",
    });
    expect(init.next?.tags).toEqual([
      "droplet-badges",
      "droplet-badge-1",
      "droplet-badge-2",
      "droplet-badge-3",
    ]);
    expect(init).not.toHaveProperty("cache");
  });

  it.each([
    ["no ids", []],
    ["a zero", [0]],
    ["a decimal", [1.5]],
    ["101 ids", Array.from({ length: 101 }, (_, i) => i + 1)],
  ])("refuses %s without calling Strapi", async (_label, ids) => {
    expect(await getPickedBadges(ids)).toEqual({ ok: false, error: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts 100 ids", async () => {
    const ids = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(await getPickedBadges(ids)).toMatchObject({ ok: true });
  });
});

describe("getBadgeOptions", () => {
  it("GETs the droplet's options with its cache tags", async () => {
    reply({ data: [{ id: 4, title: "T", emblemSvg: "<svg></svg>" }] });
    const result = await getBadgeOptions(9);
    expect(result).toMatchObject({ ok: true, data: [{ id: 4 }] });
    const { url, init } = call();
    expect(url).toBe(`${BASE}/options?dropletId=9`);
    expect(init.next?.tags).toEqual(["droplet-badges", "droplet-badge-9"]);
    expect(init.headers).toMatchObject({
      Authorization: "Bearer service-token",
      "Strapi-Response-Format": "v4",
    });
  });

  it("refuses a bad id without calling Strapi", async () => {
    expect(await getBadgeOptions(-1)).toEqual({ ok: false, error: "invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("saveBadgeOptions", () => {
  const input = { dropletId: 5, userId: 7, options: [option] };

  it("POSTs the body uncached and flushes the droplet's tag", async () => {
    reply({
      data: [{ id: 1, documentId: "d", title: "Ribbon", emblemSvg: "x" }],
    });
    const result = await saveBadgeOptions(input);
    expect(result).toMatchObject({ ok: true });
    const { url, init } = call();
    expect(url).toBe(`${BASE}/options`);
    expect(init.method).toBe("POST");
    expect(init.cache).toBe("no-store");
    expect(init).not.toHaveProperty("next");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer service-token",
      "Strapi-Response-Format": "v4",
    });
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(revalidateTag).toHaveBeenCalledWith("droplet-badge-5");
  });

  it("flushes nothing on a failure", async () => {
    reply({ error: {} }, 409);
    await saveBadgeOptions(input);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

describe("pickBadge", () => {
  it("POSTs the ids uncached and flushes the droplet's tag", async () => {
    reply({ data: { id: 2, dropletId: 5, title: "T", emblemSvg: "x" } });
    const input = { dropletId: 5, optionId: 2, userId: 7 };
    expect(await pickBadge(input)).toMatchObject({ ok: true });
    const { url, init } = call();
    expect(url).toBe(`${BASE}/pick`);
    expect(init.cache).toBe("no-store");
    expect(JSON.parse(String(init.body))).toEqual(input);
    expect(revalidateTag).toHaveBeenCalledWith("droplet-badge-5");
  });
});

describe("error mapping", () => {
  const calls = [
    () => getPickedBadges([1]),
    () => getBadgeOptions(1),
    () => saveBadgeOptions({ dropletId: 1, userId: 1, options: [option] }),
    () => pickBadge({ dropletId: 1, optionId: 1, userId: 1 }),
  ];

  it.each([
    [400, "invalid"],
    [404, "not_found"],
    [409, "conflict"],
    [401, "failed"],
    [403, "failed"],
    [500, "failed"],
  ])("maps %s to %s on every function", async (status, error) => {
    for (const run of calls) {
      reply({ error: { message: "secret detail" } }, status);
      expect(await run()).toEqual({ ok: false, error });
    }
  });

  it("maps a network error and a body with no data to failed", async () => {
    for (const run of calls) {
      fetchMock.mockRejectedValue(new Error("boom https://strapi.test/x"));
      expect(await run()).toEqual({ ok: false, error: "failed" });
      reply({});
      expect(await run()).toEqual({ ok: false, error: "failed" });
    }
  });

  it("logs the status code only", async () => {
    reply({ error: { message: "secret detail" } }, 409);
    await saveBadgeOptions({ dropletId: 1, userId: 1, options: [option] });
    fetchMock.mockRejectedValue(new Error("boom https://strapi.test/x"));
    await pickBadge({ dropletId: 1, optionId: 1, userId: 1 });
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).toContain("409");
    expect(logged).not.toMatch(
      /secret detail|boom|emblem|<svg|strapi\.test|service-token/,
    );
  });
});
