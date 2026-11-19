/** @jest-environment node */
import { revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { saveLearnerProfile } from "@/lib/learner-profile";
import { saveLearningInterests } from "@/lib/actions/onboarding";
import { authFixtures } from "@/testing/helpers/server-action-auth";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/learner-profile", () => ({ saveLearnerProfile: jest.fn() }));

const mockedRole = jest.mocked(requireRole);
const mockedSave = jest.mocked(saveLearnerProfile);
let errorSpy: jest.SpyInstance;

const INPUT = {
  goal: "career" as const,
  focusAreas: ["technical" as const],
  interestTagIds: [31, 42],
  interestNote: "Secret note text",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedRole.mockResolvedValue(authFixtures.as({ id: 7 }));
  mockedSave.mockResolvedValue({ ok: true, error: null });
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("saveLearningInterests", () => {
  it("returns an error and writes nothing when signed out", async () => {
    mockedRole.mockResolvedValue(authFixtures.loggedOut());
    expect((await saveLearningInterests(INPUT)).ok).toBe(false);
    expect(mockedSave).not.toHaveBeenCalled();
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it.each([
    ["bad goal", { goal: "nope" }],
    ["no areas", { focusAreas: [] }],
    ["no topics", { interestTagIds: [] }],
    ["fractional tag", { interestTagIds: [1.5] }],
  ])("rejects %s before any write", async (_n, bad) => {
    const res = await saveLearningInterests({ ...INPUT, ...bad } as never);
    expect(res.ok).toBe(false);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it("saves for the session user with unique ids and revalidates picks", async () => {
    const res = await saveLearningInterests({
      ...INPUT,
      interestTagIds: [31, 31, 42],
      userId: 99,
    } as never);
    expect(res).toEqual({ ok: true });
    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
      { ...INPUT, interestTagIds: [31, 42] },
    );
    expect(jest.mocked(revalidateTag).mock.calls).toEqual([
      [CACHE_TAGS.recommendations(7)],
    ]);
  });

  it("returns ok:false when the save fails", async () => {
    mockedSave.mockResolvedValue({ ok: false, error: "unknown_tag" });
    expect((await saveLearningInterests(INPUT)).ok).toBe(false);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("logs no answers when the save throws", async () => {
    mockedSave.mockRejectedValue(new Error("boom Secret note text"));
    expect((await saveLearningInterests(INPUT)).ok).toBe(false);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("Secret");
  });
});
