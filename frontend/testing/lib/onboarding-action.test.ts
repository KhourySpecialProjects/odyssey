/** @jest-environment node */
import { revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { saveLearnerProfile } from "@/lib/learner-profile";
import type { OnboardingAnswers } from "@/lib/validations/onboarding";
import { saveOnboarding } from "@/lib/actions/onboarding";
import { authFixtures } from "@/testing/helpers/server-action-auth";
import { installDocumentIdMock } from "@/lib/testing/document-id-mock";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/learner-profile", () => ({ saveLearnerProfile: jest.fn() }));

const mockedRole = jest.mocked(requireRole);
const mockedSave = jest.mocked(saveLearnerProfile);
const fetchMock = jest.fn();
let errorSpy: jest.SpyInstance;

const ANSWERS: OnboardingAnswers = {
  firstName: "Zelda",
  lastName: "Quillfeather",
  timeZone: "America/New_York",
  bio: "Secret bio text",
  goal: "career",
  focusAreas: ["technical"],
  interestTagIds: [31, 42],
  interestNote: "Secret note text",
};
const SECRETS = [
  "Zelda",
  "Quillfeather",
  "Secret bio text",
  "Secret note text",
];

const ok = { ok: true, status: 200, json: async () => ({}) };
const bodies = () =>
  fetchMock.mock.calls.map(([, i]) => JSON.parse(i.body).data);
const loggedText = () => JSON.stringify(errorSpy.mock.calls);

beforeEach(() => {
  jest.clearAllMocks();
  installDocumentIdMock();
  fetchMock.mockReset().mockResolvedValue(ok);
  global.fetch = fetchMock as unknown as typeof fetch;
  mockedRole.mockResolvedValue(authFixtures.as({ id: 7 }));
  mockedSave.mockResolvedValue({ ok: true, error: null });
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveOnboarding", () => {
  it("returns an error and writes nothing when signed out", async () => {
    mockedRole.mockResolvedValue(authFixtures.loggedOut());
    const res = await saveOnboarding({
      ...ANSWERS,
      focusAreas: ANSWERS.focusAreas,
    });
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedSave).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["no first name", { firstName: " " }],
    ["bad time zone", { timeZone: "Mars/Base" }],
    ["long bio", { bio: "x".repeat(401) }],
    ["bad goal", { goal: "nope" }],
    ["no areas", { focusAreas: [] }],
    ["no topics", { interestTagIds: [] }],
    ["fractional tag", { interestTagIds: [1.5] }],
  ])("rejects %s before any write", async (_n, bad) => {
    const res = await saveOnboarding({ ...ANSWERS, ...bad } as never);
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("saves in order with the session user and revalidates", async () => {
    // a client-sent id must be ignored
    const res = await saveOnboarding({ ...ANSWERS, userId: 99 } as never);
    expect(res).toEqual({ ok: true });
    expect(bodies()).toEqual([
      {
        firstName: "Zelda",
        lastName: "Quillfeather",
        bio: "Secret bio text",
        timeZone: "America/New_York",
      },
      { firstTime: false },
    ]);
    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      {
        goal: "career",
        focusAreas: ["technical"],
        interestTagIds: [31, 42],
        interestNote: "Secret note text",
      },
    );
    const order = [
      fetchMock.mock.invocationCallOrder[0],
      mockedSave.mock.invocationCallOrder[0],
      fetchMock.mock.invocationCallOrder[1],
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    const tags = jest.mocked(revalidateTag).mock.calls.map(([t]) => t);
    expect(tags).toEqual([
      CACHE_TAGS.user("user7@northeastern.edu"),
      CACHE_TAGS.users,
      CACHE_TAGS.authors,
      CACHE_TAGS.recommendations(7),
    ]);
  });

  it("removes duplicate topic ids before saving", async () => {
    const res = await saveOnboarding({
      ...ANSWERS,
      interestTagIds: [31, 31, 42, 31],
    });
    expect(res).toEqual({ ok: true });
    expect(mockedSave).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ interestTagIds: [31, 42] }),
    );
  });

  it("returns ok:false when revalidation throws", async () => {
    jest.mocked(revalidateTag).mockImplementationOnce(() => {
      throw new Error("cache Zelda");
    });
    const res = await saveOnboarding(ANSWERS);
    expect(res.ok).toBe(false);
    SECRETS.forEach((s) => expect(loggedText()).not.toContain(s));
  });

  it("clears an empty bio", async () => {
    await saveOnboarding({ ...ANSWERS, bio: "" });
    expect(bodies()[0].bio).toBeNull();
  });

  describe.each([
    [
      "profile write",
      () => fetchMock.mockResolvedValueOnce({ ok: false, status: 500 }),
      1,
    ],
    [
      "learner profile",
      () => mockedSave.mockResolvedValue({ ok: false, error: "unknown_tag" }),
      1,
    ],
    [
      "learner profile throw",
      () => mockedSave.mockRejectedValue(new Error("boom Zelda")),
      1,
    ],
    [
      "firstTime write",
      () =>
        fetchMock
          .mockResolvedValueOnce(ok)
          .mockResolvedValueOnce({ ok: false, status: 500 }),
      2,
    ],
  ])("when the %s fails", (_n, arrange, writes) => {
    it("returns ok:false, skips revalidation and logs no answers", async () => {
      arrange();
      const res = await saveOnboarding({
        ...ANSWERS,
        focusAreas: ANSWERS.focusAreas,
      });
      expect(res).toEqual({
        ok: false,
        error: "Couldn't save your answers. Try again.",
      });
      expect(revalidateTag).not.toHaveBeenCalled();
      // the firstTime flag is only attempted after the learner profile saved
      expect(fetchMock).toHaveBeenCalledTimes(writes);
      expect(bodies().some((b) => "firstTime" in b)).toBe(
        _n === "firstTime write",
      );
      SECRETS.forEach((s) => expect(loggedText()).not.toContain(s));
    });
  });

  it("returns ok:false when fetch itself throws, without logging answers", async () => {
    fetchMock.mockRejectedValue(new TypeError("network Zelda"));
    const res = await saveOnboarding({
      ...ANSWERS,
      focusAreas: ANSWERS.focusAreas,
    });
    expect(res.ok).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
    SECRETS.forEach((s) => expect(loggedText()).not.toContain(s));
  });
});
