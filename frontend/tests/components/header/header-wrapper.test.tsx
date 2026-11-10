import { HeaderWrapper } from "@/components/header/header-wrapper";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedUser } from "@/lib/requests/cached";
import { getStreakFor } from "@/lib/streak-days";
import { makeStreak } from "@/testing/mocks/streakMock";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({ getCachedUser: jest.fn() }));
jest.mock("@/lib/streak-days", () => ({ getStreakFor: jest.fn() }));
jest.mock("@/components/header/index", () => ({ Header: () => null }));

const mockedGetStreakFor = jest.mocked(getStreakFor);
const propsOf = async () => (await HeaderWrapper()).props;

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getCurrentUser).mockResolvedValue({
    email: "g@example.edu",
  } as never);
  jest
    .mocked(getCachedUser)
    .mockResolvedValue({ id: 7, timeZone: "America/Chicago" } as never);
});

describe("HeaderWrapper", () => {
  it("passes the learner's streak, read in their time zone", async () => {
    const streak = makeStreak();
    mockedGetStreakFor.mockResolvedValue(streak);

    expect((await propsOf()).streak).toBe(streak);
    expect(mockedGetStreakFor).toHaveBeenCalledWith({
      id: 7,
      timeZone: "America/Chicago",
    });
  });

  it("hides the pill, not the header, when the streak can't be read", async () => {
    mockedGetStreakFor.mockRejectedValue(new Error("Strapi is down"));

    expect((await propsOf()).streak).toBeNull();
  });

  it("reads no streak when signed out", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(undefined as never);

    expect((await propsOf()).streak).toBeNull();
    expect(mockedGetStreakFor).not.toHaveBeenCalled();
  });
});
