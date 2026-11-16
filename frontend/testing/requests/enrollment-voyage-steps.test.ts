/**
 * ODY-675: an enrollment completed by rating or by the completion backfill
 * also records its voyage steps (checkAndCompleteVoyageNode, which skips
 * steps already recorded).
 */

import {
  changeEnrollmentRating,
  recordMissingCompletion,
} from "@/lib/requests/enrollment";
import { checkAndCompleteVoyageNode } from "@/lib/requests/voyage-enrollment";
import { fetchAPI } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";

jest.mock("@/lib/utils", () => ({
  fetchAPI: jest.fn(),
  flattenAttributes: jest.fn((data: unknown) => data),
  STRAPI_RESPONSE_FORMAT_HEADER: {},
}));
jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/requests/voyage-enrollment", () => ({
  checkAndCompleteVoyageNode: jest.fn(),
}));

const mockedFetchAPI = jest.mocked(fetchAPI);
const fetchMock = jest.fn();
const okPut = {
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data: { id: 24 } }),
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(okPut);
  jest.mocked(getCurrentUser).mockResolvedValue({ email: "s@x.edu" } as never);
  jest.mocked(getAuthorizedUserByEmail).mockResolvedValue({ id: 1 } as never);
  jest.mocked(checkAndCompleteVoyageNode).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("changeEnrollmentRating", () => {
  const owned = (overrides = {}) => [
    {
      id: 24,
      completionDate: null,
      authorizedUser: { id: 1 },
      droplet: { id: 9 },
      ...overrides,
    },
  ];

  it("records the droplet's voyage steps once the rating completes it", async () => {
    mockedFetchAPI.mockResolvedValue(owned() as never);

    const result = await changeEnrollmentRating(4, "24");

    expect(result).toEqual({ success: true });
    expect(checkAndCompleteVoyageNode).toHaveBeenCalledWith(9, 1);
    // After the PUT that marks the enrollment complete
    expect(fetchMock.mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(checkAndCompleteVoyageNode).mock.invocationCallOrder[0],
    );
  });

  it("asks for the droplet id along with the enrollment", async () => {
    mockedFetchAPI.mockResolvedValue(owned() as never);

    await changeEnrollmentRating(4, "24");

    expect(mockedFetchAPI.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        urlParams: expect.objectContaining({
          populate: {
            authorizedUser: { fields: ["id"] },
            droplet: { fields: ["id"] },
          },
        }),
      }),
    );
  });

  it("re-rating an already complete droplet runs the idempotent check again", async () => {
    mockedFetchAPI.mockResolvedValue(
      owned({ completionDate: "2025-01-01T00:00:00.000Z" }) as never,
    );

    await changeEnrollmentRating(3, "24");
    await changeEnrollmentRating(5, "24");

    expect(checkAndCompleteVoyageNode).toHaveBeenCalledTimes(2);
  });

  it("still succeeds when recording voyage steps throws", async () => {
    mockedFetchAPI.mockResolvedValue(owned() as never);
    jest
      .mocked(checkAndCompleteVoyageNode)
      .mockRejectedValue(new Error("Strapi down"));

    expect(await changeEnrollmentRating(4, "24")).toEqual({ success: true });
  });

  it("does not record steps when the rating write fails", async () => {
    mockedFetchAPI.mockResolvedValue(owned() as never);
    fetchMock.mockResolvedValue({ ok: false, status: 500 });

    const result = await changeEnrollmentRating(4, "24");

    expect(result.success).toBe(false);
    expect(checkAndCompleteVoyageNode).not.toHaveBeenCalled();
  });
});

describe("recordMissingCompletion", () => {
  const enrollment = (overrides = {}) => [
    {
      id: "123",
      viewedLessons: [{ id: 1 }, { id: 2 }],
      isComplete: false,
      completionDate: null,
      authorizedUser: { id: 1 },
      droplet: { id: 9, lessons: [{ id: 1 }, { id: 2 }] },
      ...overrides,
    },
  ];

  it("records the droplet's voyage steps when it backfills completion", async () => {
    mockedFetchAPI.mockResolvedValue(enrollment() as never);

    const result = await recordMissingCompletion("123");

    expect(result).toEqual({ success: true, updated: true });
    expect(checkAndCompleteVoyageNode).toHaveBeenCalledWith(9, 1);
  });

  it("leaves voyage steps alone when nothing needed backfilling", async () => {
    mockedFetchAPI.mockResolvedValue(
      enrollment({ viewedLessons: [{ id: 1 }] }) as never,
    );

    const result = await recordMissingCompletion("123");

    expect(result).toEqual({ success: true, updated: false });
    expect(checkAndCompleteVoyageNode).not.toHaveBeenCalled();
  });
});
