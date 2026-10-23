import { readJsonOrNull } from "@/lib/strapi-response";
import {
  makeEmptyResponse,
  makeFetchResponse,
} from "@/lib/testing/mock-helpers";

describe("readJsonOrNull", () => {
  it("returns null for an empty 204 and the mock models the real json() failure", async () => {
    await expect(makeEmptyResponse(204).json()).rejects.toThrow(SyntaxError);
    await expect(readJsonOrNull(makeEmptyResponse(204))).resolves.toBeNull();
  });

  it("returns the parsed body for a 200", async () => {
    await expect(
      readJsonOrNull(makeFetchResponse({ data: { id: 1 } })),
    ).resolves.toEqual({ data: { id: 1 } });
  });

  it("works with hand-written mocks that have no status", async () => {
    const res = { ok: true, json: async () => ({ data: 1 }) } as Response;
    await expect(readJsonOrNull(res)).resolves.toEqual({ data: 1 });
  });

  it("returns the error body for a non-2xx response", async () => {
    const body = { data: null, error: { message: "Forbidden" } };
    await expect(readJsonOrNull(makeFetchResponse(body, 403))).resolves.toEqual(
      body,
    );
  });
});
