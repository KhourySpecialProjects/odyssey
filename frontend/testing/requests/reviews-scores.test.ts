import { saveReviewScore, acceptAiScores } from "@/lib/requests/reviews";
import { requireRole } from "@/lib/auth/require-role";
import { revalidateTag } from "next/cache";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { mockGlobalFetch, makeFetchResponse } from "@/lib/testing/mock-helpers";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("next/cache", () => ({
  revalidateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const mockedRevalidateTag = jest.mocked(revalidateTag);

const ROLES = [
  AuthorizedUserRoleTitle.SysAdmin,
  AuthorizedUserRoleTitle.ContentEditor,
];
const reviewer = () =>
  authFixtures.as({ id: 9, roles: [AuthorizedUserRoleTitle.ContentEditor] });

let fetchMock: jest.MockedFunction<typeof fetch>;

const SCORE = {
  id: 30,
  key: "7:4:2",
  criterionName: "Tone",
  value: 4,
  aiValue: null,
};
const validInput = { reviewId: 7, lessonId: 4, criterionId: 2, value: 4 };

const arrangeSaved = () => {
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { dropletId: 3, score: SCORE } }),
  );
};
const arrangeAccepted = () => {
  fetchMock.mockResolvedValue(
    makeFetchResponse({ data: { dropletId: 3, scores: [SCORE] } }),
  );
};

const sentBody = () => JSON.parse(String(fetchMock.mock.calls[0][1]?.body));

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock = mockGlobalFetch();
  mockedRequireRole.mockResolvedValue(reviewer());
});

const expectDenied = (result: any, code: string) =>
  expect(result).toEqual({ ok: false, error: code, data: null });

describeServerActionAuth("saveReviewScore", {
  requireRole: mockedRequireRole,
  invoke: () => saveReviewScore(validInput),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => arrangeSaved(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describeServerActionAuth("acceptAiScores", {
  requireRole: mockedRequireRole,
  invoke: () => acceptAiScores(7, 4),
  mutations: () => [fetchMock, mockedRevalidateTag],
  denial: { kind: "role", roles: ROLES },
  authorized: {
    as: reviewer(),
    arrange: () => arrangeAccepted(),
    expect: (result) => expect(result.ok).toBe(true),
  },
  expectDenied,
});

describe("saveReviewScore", () => {
  it("makes one request, with the session user's id", async () => {
    arrangeSaved();

    const result = await saveReviewScore(validInput);

    expect(result).toEqual({ ok: true, error: null, data: SCORE });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/review-scores\/upsert$/);
    expect(init?.method).toBe("POST");
    expect(init?.headers).toMatchObject(STRAPI_RESPONSE_FORMAT_HEADER);
    expect(sentBody()).toEqual({ ...validInput, userId: 9 });
  });

  it("ignores a userId smuggled into the input", async () => {
    arrangeSaved();

    await saveReviewScore({ ...validInput, userId: 1 } as any);

    expect(sentBody().userId).toBe(9);
  });

  it("revalidates the droplet's review tag from the route's answer", async () => {
    arrangeSaved();

    await saveReviewScore(validInput);

    expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.review(3));
  });

  it("saves the Overall Score with lessonId null", async () => {
    arrangeSaved();

    await saveReviewScore({ ...validInput, lessonId: null });

    expect(sentBody().lessonId).toBeNull();
  });

  it.each([
    ["0", { value: 0 }],
    ["6", { value: 6 }],
    ["null", { value: null }],
    ["a fraction", { value: 2.5 }],
    ["a bad reviewId", { reviewId: -1 }],
  ])("refuses a value of %s without a request", async (_label, overrides) => {
    const result = await saveReviewScore({
      ...validInput,
      ...overrides,
    } as any);

    expectDenied(result, "invalid_input");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    [400, "invalid_input"],
    [403, "forbidden"],
    [404, "not_found"],
    [409, "review_closed"],
    [500, "failed"],
  ])("maps a %i from the route to %s", async (status, code) => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status } }, status),
    );

    const result = await saveReviewScore(validInput);

    expectDenied(result, code);
    expect(mockedRevalidateTag).not.toHaveBeenCalled();
  });
});

describe("acceptAiScores", () => {
  it("makes one request for the lesson and returns the confirmed scores", async () => {
    arrangeAccepted();

    const result = await acceptAiScores(7, 4);

    expect(result).toEqual({ ok: true, error: null, data: [SCORE] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(
      /\/api\/review-scores\/accept-ai$/,
    );
    expect(sentBody()).toEqual({ reviewId: 7, lessonId: 4, userId: 9 });
    expect(mockedRevalidateTag).toHaveBeenCalledWith(CACHE_TAGS.review(3));
  });

  it("accepts the Overall Score with lessonId null", async () => {
    arrangeAccepted();

    await acceptAiScores(7, null);

    expect(sentBody()).toEqual({ reviewId: 7, lessonId: null, userId: 9 });
  });

  it("refuses a bad reviewId without a request", async () => {
    expectDenied(await acceptAiScores(0, 4), "invalid_input");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a 409 (review sent) to review_closed", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      makeFetchResponse({ error: { status: 409 } }, 409),
    );

    expectDenied(await acceptAiScores(7, 4), "review_closed");
  });
});
