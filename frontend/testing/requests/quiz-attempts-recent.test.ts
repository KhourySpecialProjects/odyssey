/** @jest-environment node */
import { getRecentQuizAttempts } from "@/lib/requests/quiz-attempts-recent";
import { makeFetchResponse, mockGlobalFetch } from "@/lib/testing/mock-helpers";

jest.mock("server-only", () => ({}));

let fetchMock: jest.MockedFunction<typeof fetch>;
const rows = [{ quizType: "choice", questionId: 1, correct: false }];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "warn").mockImplementation(() => {});
  fetchMock = mockGlobalFetch();
  fetchMock.mockResolvedValue(makeFetchResponse({ data: rows }));
});

describe("getRecentQuizAttempts", () => {
  it("asks for the user's rows with the token, v4 header, no-store and a timeout", async () => {
    await expect(getRecentQuizAttempts(7)).resolves.toEqual(rows);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/quiz-attempts\/recent\?userId=7$/);
    expect(init?.cache).toBe("no-store");
    expect(init).not.toHaveProperty("next");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.headers).toMatchObject({
      Authorization: expect.stringMatching(/^Bearer /),
      "Strapi-Response-Format": "v4",
    });
  });

  it("drops entries that aren't objects", async () => {
    fetchMock.mockResolvedValue(
      makeFetchResponse({ data: [null, 3, ...rows] }),
    );
    await expect(getRecentQuizAttempts(7)).resolves.toEqual(rows);
  });

  it.each([
    ["a 500", () => fetchMock.mockResolvedValue(makeFetchResponse({}, 500))],
    ["a throw", () => fetchMock.mockRejectedValue(new Error("down"))],
    ["a null rejection", () => fetchMock.mockRejectedValue(null)],
    [
      "a body without data",
      () => fetchMock.mockResolvedValue(makeFetchResponse({})),
    ],
  ])("returns null on %s", async (_name, arrange) => {
    arrange();
    await expect(getRecentQuizAttempts(7)).resolves.toBeNull();
  });
});
