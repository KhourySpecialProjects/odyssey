import { checkMyReminder } from "@/lib/requests/reminders";
import { requireRole } from "@/lib/auth/require-role";
import { getAuthorizedUserByEmail } from "@/lib/requests/authorized-user";
import { runReminderCheck } from "@/lib/reminders";
import {
  authFixtures,
  describeServerActionAuth,
} from "@/testing/helpers/server-action-auth";

jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));
jest.mock("@/lib/requests/authorized-user", () => ({
  getAuthorizedUserByEmail: jest.fn(),
}));
jest.mock("@/lib/reminders", () => ({ runReminderCheck: jest.fn() }));

const mockedRequireRole = jest.mocked(requireRole);
const mockedGetUser = jest.mocked(getAuthorizedUserByEmail);
const mockedCheck = jest.mocked(runReminderCheck);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedGetUser.mockResolvedValue({ id: 7, timeZone: "Asia/Tokyo" } as never);
  mockedCheck.mockResolvedValue({ raised: true });
});

describeServerActionAuth("checkMyReminder", {
  requireRole: mockedRequireRole,
  invoke: () => checkMyReminder(),
  mutations: () => [mockedGetUser, mockedCheck],
  denial: { kind: "role", roles: [] },
  authorized: {
    as: authFixtures.as({ id: 7 }),
    expect: (result) => {
      expect(result).toEqual({
        ok: true,
        error: null,
        data: { raised: true },
      });
      // The caller's own id from the gate, their zone from their record
      expect(mockedGetUser).toHaveBeenCalledWith("user7@northeastern.edu", {
        fields: ["id", "timeZone"],
      });
      expect(mockedCheck).toHaveBeenCalledWith({
        id: 7,
        timeZone: "Asia/Tokyo",
      });
    },
  },
  expectDenied: (result, code) => {
    expect(result).toEqual({ ok: false, error: code, data: null });
  },
});

it("returns an error, not a throw, when the check fails", async () => {
  mockedRequireRole.mockResolvedValue(authFixtures.as({ id: 7 }));
  mockedGetUser.mockRejectedValue(new Error("Strapi is down"));

  expect(await checkMyReminder()).toEqual({
    ok: false,
    error: "Couldn't check your reminders.",
    data: null,
  });
});
