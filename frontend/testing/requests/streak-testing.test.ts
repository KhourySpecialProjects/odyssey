import { revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import {
  moveTestDay,
  resetTestStreak,
  setTestStreak,
} from "@/lib/requests/streak-testing";
import { getStreakFor, recordStreakDay } from "@/lib/streak-days";
import {
  clearTestStreakDays,
  setStreakTestMode,
  setTestStreakDays,
  streakTestingEnabled,
  streakTestMode,
} from "@/lib/streak-testing";
import { localDate } from "@/lib/streaks";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";
import { makeStreak } from "@/testing/mocks/streakMock";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/streak-days", () => ({
  getStreakFor: jest.fn(),
  recordStreakDay: jest.fn(),
}));
jest.mock("@/lib/streak-testing", () => ({
  REAL_STREAK: { test: false, offsetDays: 0 },
  streakTestingEnabled: jest.fn(),
  streakTestMode: jest.fn(),
  setStreakTestMode: jest.fn(),
  setTestStreakDays: jest.fn(),
  clearTestStreakDays: jest.fn(),
}));

const mockedRequireRole = jest.mocked(requireRole);
const admin = authFixtures.admin(7);
const learner = { id: 7, timeZone: "America/New_York" };
const streak = makeStreak();
const settings = {
  current: 24,
  litToday: true,
  missedYesterday: false,
  revivesUsed: 1,
  history: false,
};
const testMode = (offsetDays = 0) => ({ test: true, offsetDays });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedRequireRole.mockResolvedValue(admin);
  jest.mocked(streakTestingEnabled).mockReturnValue(true);
  jest.mocked(streakTestMode).mockResolvedValue(testMode(2));
  jest
    .mocked(getAuthorizedUserByEmail)
    .mockResolvedValue({ id: 7, timeZone: "America/New_York" } as never);
  jest.mocked(getStreakFor).mockResolvedValue(streak);
});

describeServerActionAuth("setTestStreak", {
  requireRole: mockedRequireRole,
  invoke: () => setTestStreak(settings),
  mutations: () => [
    jest.mocked(setTestStreakDays),
    jest.mocked(setStreakTestMode),
  ],
  denial: { kind: "role", roles: [AuthorizedUserRoleTitle.SysAdmin] },
  authorized: {
    as: admin,
    expect: (result) => {
      expect(result).toEqual({
        ok: true,
        error: null,
        data: { streak, mode: testMode(2) },
      });
    },
  },
  expectDenied: (result, code) => {
    expect(result).toEqual({ ok: false, error: code, data: null });
  },
});

describe("setTestStreak", () => {
  it("writes the days for the moved today and keeps test mode on", async () => {
    await setTestStreak(settings);

    const [userId, days] = jest.mocked(setTestStreakDays).mock.calls[0];
    const today = new Date(
      `${localDate(new Date(), "America/New_York")}T00:00:00Z`,
    );
    today.setUTCDate(today.getUTCDate() + 2);
    expect(userId).toBe(7);
    expect(days).toHaveLength(26);
    expect(days.at(-1)?.date).toBe(today.toISOString().slice(0, 10));
    expect(setStreakTestMode).toHaveBeenCalledWith(testMode(2));
    expect(revalidateTag).toHaveBeenCalledWith("streak-7");
    expect(getStreakFor).toHaveBeenCalledWith(learner, {
      fresh: true,
      mode: testMode(2),
    });
  });

  it.each([
    ["too many days", { current: 301 }],
    ["three revives", { revivesUsed: 3 }],
  ])("refuses %s", async (_, overrides) => {
    expect(await setTestStreak({ ...settings, ...overrides })).toEqual({
      ok: false,
      error: "Invalid settings",
      data: null,
    });
    expect(setTestStreakDays).not.toHaveBeenCalled();
  });

  it("isn't available where testing is off", async () => {
    jest.mocked(streakTestingEnabled).mockReturnValue(false);

    expect(await setTestStreak(settings)).toEqual({
      ok: false,
      error: "Not available here",
      data: null,
    });
    expect(setTestStreakDays).not.toHaveBeenCalled();
  });

  it("says so when Strapi refuses", async () => {
    jest.mocked(setTestStreakDays).mockRejectedValue(new Error("404"));

    expect(await setTestStreak(settings)).toMatchObject({
      ok: false,
      error: "That didn't work. Is Strapi running with testing on?",
    });
  });
});

describe("moveTestDay", () => {
  it.each([
    [true, 1],
    [false, 0],
  ])(
    "moves today on a day (with a lesson: %s)",
    async (withLesson, records) => {
      const result = await moveTestDay(withLesson);

      expect(setStreakTestMode).toHaveBeenCalledWith(testMode(3));
      expect(recordStreakDay).toHaveBeenCalledTimes(records);
      if (records) {
        expect(recordStreakDay).toHaveBeenCalledWith(
          learner,
          1,
          expect.any(Date),
          testMode(3),
        );
      }
      expect(result).toMatchObject({ ok: true, data: { mode: testMode(3) } });
    },
  );

  it("needs a test streak first", async () => {
    jest
      .mocked(streakTestMode)
      .mockResolvedValue({ test: false, offsetDays: 0 });

    expect(await moveTestDay(true)).toEqual({
      ok: false,
      error: "Set a test streak first",
      data: null,
    });
    expect(setStreakTestMode).not.toHaveBeenCalled();
  });
});

it("resetTestStreak clears the test rows and brings back the real streak", async () => {
  const result = await resetTestStreak();

  expect(clearTestStreakDays).toHaveBeenCalledWith(7);
  expect(setStreakTestMode).toHaveBeenCalledWith(null);
  expect(getStreakFor).toHaveBeenCalledWith(learner, {
    fresh: true,
    mode: { test: false, offsetDays: 0 },
  });
  expect(result).toMatchObject({
    ok: true,
    data: { mode: { test: false, offsetDays: 0 } },
  });
});
