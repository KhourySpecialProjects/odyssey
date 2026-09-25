/** @jest-environment node */
import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
}));

import { POST } from "@/app/api/revalidate/route";

// jest.setup.ts stubs `global.Request` with a no-op class for every test
// file, so a real `NextRequest` cannot be constructed here. Deliberately not
// touching that global stub (every other test file depends on it) — instead
// we hand-roll a minimal object exposing only the two methods the handler
// actually calls: `headers.get()` and `json()`.
function makeRequest(opts: {
  headers?: Record<string, string>;
  body?: unknown;
  invalidJson?: boolean;
}): NextRequest {
  const headerMap = new Map(Object.entries(opts.headers ?? {}));
  return {
    headers: {
      get: (key: string) => headerMap.get(key) ?? null,
    },
    json: async () => {
      if (opts.invalidJson) {
        throw new SyntaxError("Unexpected token in JSON");
      }
      return opts.body;
    },
  } as unknown as NextRequest;
}

describe("POST /api/revalidate", () => {
  const originalEnv = process.env;
  const mockedRevalidateTag = jest.mocked(revalidateTag);

  beforeEach(() => {
    process.env = { ...originalEnv, REVALIDATE_SECRET: "test-secret" };
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it("returns 200 and revalidates every mapped tag for a valid secret + known model", async () => {
    const request = makeRequest({
      headers: { "x-revalidate-secret": "test-secret" },
      body: { model: "api::group.group" },
    });

    const response = await POST(request);
    const json = await response.json();

    const expectedTags = [
      CACHE_TAGS.allGroups,
      CACHE_TAGS.allDueDates,
      CACHE_TAGS.userDashboard,
      CACHE_TAGS.authors,
    ];

    expect(response.status).toBe(200);
    expect(json.revalidated).toEqual(expectedTags);
    expect(mockedRevalidateTag).toHaveBeenCalledTimes(expectedTags.length);
    for (const tag of expectedTags) {
      expect(mockedRevalidateTag).toHaveBeenCalledWith(tag);
    }
  });

  // Deletes bypass the backend's field gate, so the route must widen the
  // authorized-user tag set to match what Odyssey's own deleteAuthorizedUser
  // clears. Without `users`/`authors`, a user deleted in the Strapi admin
  // lingers in creator/editor lists for up to an hour (those are tagged
  // `revalidate: 3600`).
  it.each(["afterDelete", "afterDeleteMany"])(
    "widens the authorized-user tag set on %s",
    async (event) => {
      const request = makeRequest({
        headers: { "x-revalidate-secret": "test-secret" },
        body: { model: "api::authorized-user.authorized-user", event },
      });

      const response = await POST(request);
      const json = await response.json();

      const expectedTags = [
        CACHE_TAGS.allGroups,
        CACHE_TAGS.userDashboard,
        CACHE_TAGS.users,
        CACHE_TAGS.authors,
      ];

      expect(response.status).toBe(200);
      expect(json.revalidated).toEqual(expectedTags);
      expect(mockedRevalidateTag).toHaveBeenCalledTimes(expectedTags.length);
      for (const tag of expectedTags) {
        expect(mockedRevalidateTag).toHaveBeenCalledWith(tag);
      }
    },
  );

  it("keeps the narrow authorized-user tag set on a gated update", async () => {
    const request = makeRequest({
      headers: { "x-revalidate-secret": "test-secret" },
      body: {
        model: "api::authorized-user.authorized-user",
        event: "afterUpdate",
      },
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.revalidated).toEqual([
      CACHE_TAGS.allGroups,
      CACHE_TAGS.userDashboard,
    ]);
    expect(mockedRevalidateTag).not.toHaveBeenCalledWith(CACHE_TAGS.users);
  });

  it("logs the unconfigured warning only once across repeated requests", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.REVALIDATE_SECRET;

    const make = () => makeRequest({ body: { model: "api::group.group" } });

    // The 503 branch runs before any auth check, so anonymous callers can
    // reach it — logging per request would be a free log-flood vector.
    const first = await POST(make());
    const second = await POST(make());
    const third = await POST(make());

    expect(first.status).toBe(503);
    expect(second.status).toBe(503);
    expect(third.status).toBe(503);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 401 and does not revalidate when the secret is wrong", async () => {
    const request = makeRequest({
      headers: { "x-revalidate-secret": "wrong-secret" },
      body: { model: "api::group.group" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 401 when the secret header is missing", async () => {
    const request = makeRequest({
      body: { model: "api::group.group" },
    });

    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 503 when REVALIDATE_SECRET is unset server-side", async () => {
    delete process.env.REVALIDATE_SECRET;
    const request = makeRequest({
      headers: { "x-revalidate-secret": "anything" },
      body: { model: "api::group.group" },
    });

    const response = await POST(request);

    expect(response.status).toBe(503);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid JSON body", async () => {
    const request = makeRequest({
      headers: { "x-revalidate-secret": "test-secret" },
      invalidJson: true,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 400 when model is missing", async () => {
    const request = makeRequest({
      headers: { "x-revalidate-secret": "test-secret" },
      body: {},
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 400 when model is not a string", async () => {
    const request = makeRequest({
      headers: { "x-revalidate-secret": "test-secret" },
      body: { model: 123 },
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("returns 200 with revalidated: [] and skips revalidateTag for an unknown model", async () => {
    const request = makeRequest({
      headers: { "x-revalidate-secret": "test-secret" },
      body: { model: "api::droplet.droplet" },
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.revalidated).toEqual([]);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });

  it("returns 500 when revalidateTag throws", async () => {
    mockedRevalidateTag.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    const request = makeRequest({
      headers: { "x-revalidate-secret": "test-secret" },
      body: { model: "api::group.group" },
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
  });
});
