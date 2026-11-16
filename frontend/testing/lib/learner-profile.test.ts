/** @jest-environment node */
import { revalidateTag } from "next/cache";
import { fetchAPI } from "@/lib/utils";
import { getLearnerProfile, saveLearnerProfile } from "@/lib/learner-profile";
import {
  resolveDocumentIds,
  StrapiEntryNotFoundError,
} from "@/lib/strapi-document-id";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/utils", () => ({
  ...jest.requireActual("@/lib/utils"),
  fetchAPI: jest.fn(),
}));

const fetchMock = jest.fn();
const fetchApiMock = fetchAPI as jest.Mock;
const user = { id: 7, email: "Ada@Northeastern.edu" };
const NOTE = "I like robots and weird sorting algorithms";
const ROW = { id: 5, documentId: "doc5" };
const ME = { id: 7, documentId: "doc7", onboardedAt: null };

const respond = (status = 200) =>
  fetchMock.mockResolvedValueOnce({
    ok: status < 300,
    status,
    json: async () => ({ data: {} }),
    text: async () => "{}",
  });
/** fetchAPI answers for the row lookup(s), then the user read */
const reads = (...answers: unknown[]) =>
  answers.forEach((a) => fetchApiMock.mockResolvedValueOnce(a));
const writes = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    method: init.method,
    url: String(url),
    body: JSON.parse(init.body).data,
  }));

beforeEach(() => {
  jest.clearAllMocks();
  fetchMock.mockReset();
  fetchApiMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("getLearnerProfile", () => {
  it("queries the student's row with its tag", async () => {
    fetchApiMock.mockResolvedValue([]);
    expect(await getLearnerProfile(7)).toBeNull();
    expect(fetchApiMock).toHaveBeenCalledWith(
      "/learner-profiles",
      expect.objectContaining({
        urlParams: expect.objectContaining({
          filters: { user: { id: { $eq: 7 } } },
          fields: ["goal", "focusAreas", "interestNote"],
          populate: { interests: { fields: ["name", "slug"] } },
        }),
        next: { tags: ["learner-profile-7"], revalidate: 900 },
      }),
    );
  });

  it("drops unknown focus areas and fills null relations", async () => {
    fetchApiMock.mockResolvedValue([
      { id: 1, goal: null, focusAreas: ["technical", "math"], interests: null },
    ]);
    expect(await getLearnerProfile(7)).toMatchObject({
      goal: null,
      focusAreas: ["technical"],
      interests: [],
      interestNote: null,
    });
    fetchApiMock.mockResolvedValue([{ id: 1, focusAreas: null }]);
    expect((await getLearnerProfile(7))?.focusAreas).toEqual([]);
  });
});

describe("saveLearnerProfile", () => {
  it.each([
    { goal: "work" },
    { focusAreas: ["math"] },
    { interestTagIds: [1.5] },
    { interestTagIds: ["doc1"] },
    { interestNote: "x".repeat(201) },
    { difficulty: "beginner" },
  ])("rejects %j before any request", async (input) => {
    const result = await saveLearnerProfile(user, input as never);
    expect(result).toEqual({ ok: false, error: "invalid_input" });
    expect(fetchApiMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates the row, then marks the user onboarded", async () => {
    reads(null, [ME]);
    respond();
    respond();
    const result = await saveLearnerProfile(user, {
      goal: "career",
      interestTagIds: [3, 4],
    });
    expect(result).toEqual({ ok: true, error: null });
    const [post, put] = writes();
    expect(post).toMatchObject({
      method: "POST",
      body: {
        key: "7",
        user: "doc7",
        goal: "career",
        interests: { set: ["doc3", "doc4"] },
      },
    });
    expect(put).toMatchObject({ method: "PUT" });
    expect(put.url).toMatch(/\/authorized-users\/doc7$/);
    expect(put.body.onboardedAt).toEqual(expect.any(String));
    expect(revalidateTag).toHaveBeenCalledWith("learner-profile-7");
    expect(revalidateTag).toHaveBeenCalledWith("user-ada@northeastern.edu");
  });

  it("updates an existing row and leaves an old marker alone", async () => {
    reads([ROW], [{ ...ME, onboardedAt: "2026-11-01T00:00:00.000Z" }]);
    respond();
    await saveLearnerProfile(user, { interestNote: "   " });
    expect(writes()).toEqual([
      {
        method: "PUT",
        url: expect.stringMatching(/\/learner-profiles\/doc5$/),
        body: { interestNote: null },
      },
    ]);
  });

  it("sets the marker even for an empty save", async () => {
    reads([ROW], [ME]);
    respond();
    respond();
    await saveLearnerProfile(user, {});
    const [row, me] = writes();
    expect(row.body).toEqual({});
    expect(me.body).toHaveProperty("onboardedAt");
  });

  it("fails and still refreshes the profile when the marker write fails", async () => {
    reads([ROW], [ME]);
    respond();
    respond(500);
    const result = await saveLearnerProfile(user, { goal: "self" });
    expect(result).toEqual({ ok: false, error: "Couldn't save your answers." });
    expect(revalidateTag).toHaveBeenCalledWith("learner-profile-7");
    expect(revalidateTag).not.toHaveBeenCalledWith("user-ada@northeastern.edu");
  });

  it("updates the row a racing save created when the POST fails", async () => {
    reads(null, [ROW], [ME]);
    respond(409);
    respond();
    respond();
    const result = await saveLearnerProfile(user, { goal: "self" });
    expect(result.ok).toBe(true);
    expect(writes().map((w) => w.method)).toEqual(["POST", "PUT", "PUT"]);
    expect(writes()[1].url).toMatch(/\/learner-profiles\/doc5$/);
  });

  it("returns unknown_tag and writes nothing for a missing tag", async () => {
    jest
      .mocked(resolveDocumentIds)
      .mockRejectedValueOnce(new StrapiEntryNotFoundError("no tag"));
    const result = await saveLearnerProfile(user, { interestTagIds: [99] });
    expect(result).toEqual({ ok: false, error: "unknown_tag" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs only the status when Strapi fails", async () => {
    reads([ROW]);
    respond(500);
    const result = await saveLearnerProfile(user, { interestNote: NOTE });
    expect(result).toEqual({ ok: false, error: "Couldn't save your answers." });
    expect(console.error).toHaveBeenCalledWith(
      "saveLearnerProfile failed:",
      500,
    );
    expect(JSON.stringify(jest.mocked(console.error).mock.calls)).not.toContain(
      NOTE,
    );
  });
});
