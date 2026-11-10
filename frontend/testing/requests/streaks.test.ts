import { getMyStreak } from "@/lib/requests/streaks";
import { requireRole } from "@/lib/auth/require-role";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { getStreakFor } from "@/lib/streak-days";
import type { Streak } from "@/lib/streaks";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/streak-days", () => ({ getStreakFor: jest.fn() }));

const mockedRequireRole = jest.mocked(requireRole);
const mockedGetUser = jest.mocked(getAuthorizedUserByEmail);
const mockedGetStreakFor = jest.mocked(getStreakFor);

const STREAK: Streak = {
  current: 2,
  longest: 5,
  litToday: false,
  startedOn: "2026-11-08",
  today: "2026-11-10",
  days: [
    { date: "2026-11-08", lessons: 1 },
    { date: "2026-11-09", lessons: 2 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedGetUser.mockResolvedValue({ id: 7, timeZone: "Asia/Tokyo" } as never);
  mockedGetStreakFor.mockResolvedValue(STREAK);
});

describeServerActionAuth("getMyStreak", {
  requireRole: mockedRequireRole,
  invoke: () => getMyStreak(),
  mutations: () => [mockedGetUser, mockedGetStreakFor],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    expect: (result) => {
      expect(result).toEqual({ ok: true, error: null, data: STREAK });
      // The caller's own streak, in the time zone from their record
      expect(mockedGetUser).toHaveBeenCalledWith("user7@northeastern.edu", {
        fields: ["id", "timeZone"],
      });
      expect(mockedGetStreakFor).toHaveBeenCalledWith({
        id: 7,
        timeZone: "Asia/Tokyo",
      });
    },
  },
  expectDenied: (result, code) => {
    expect(result).toEqual({ ok: false, error: code, data: null });
  },
});

it("returns an error, not a throw, when the streak can't be read", async () => {
  mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
  mockedGetStreakFor.mockRejectedValue(new Error("Strapi is down"));

  expect(await getMyStreak()).toEqual({
    ok: false,
    error: "Couldn't load your streak.",
    data: null,
  });
});
