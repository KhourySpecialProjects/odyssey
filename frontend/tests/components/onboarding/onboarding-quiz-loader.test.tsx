import { OnboardingQuizLoader } from "@/components/onboarding/onboarding-quiz-loader";
import { getCurrentUser } from "@/lib/auth/session";
import { getCachedEnrollments, getCachedUser } from "@/lib/requests/cached";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/cached", () => ({
  getCachedUser: jest.fn(),
  getCachedEnrollments: jest.fn(),
}));
jest.mock("@/lib/requests/tag", () => ({ getTags: jest.fn() }));
jest.mock("@/components/onboarding/onboarding-quiz-host", () => ({
  OnboardingQuizHost: () => null,
}));

describe("OnboardingQuizLoader", () => {
  beforeEach(() => jest.clearAllMocks());

  it("renders nothing for a signed-out user", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(undefined);
    expect(await OnboardingQuizLoader()).toBeNull();
    expect(getCachedUser).not.toHaveBeenCalled();
  });

  it("renders nothing for an onboarded user", async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue({ email: "a@x.edu" });
    (getCachedUser as jest.Mock).mockResolvedValue({
      id: 1,
      onboardedAt: "2026-11-01T00:00:00Z",
    });
    (getCachedEnrollments as jest.Mock).mockResolvedValue([]);
    expect(await OnboardingQuizLoader()).toBeNull();
  });
});
