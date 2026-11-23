import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OnboardingQuizHost } from "@/components/onboarding/onboarding-quiz-host";
import { saveOnboarding } from "@/lib/actions/onboarding";
import { createEnrollment } from "@/lib/requests/enrollment";
import { getMyRecommendations } from "@/lib/requests/recommendations";
import { recommendation } from "@/testing/mocks/recommendations";

const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/requests/recommendations", () => ({
  getMyRecommendations: jest.fn(),
}));
jest.mock("@/lib/actions/onboarding", () => ({ saveOnboarding: jest.fn() }));
jest.mock("@/lib/requests/feed", () => ({
  createSystemAnnouncement: jest.fn().mockResolvedValue({ success: true }),
}));
jest.mock("@/lib/requests/enrollment", () => ({
  createEnrollment: jest.fn(),
}));

const topics = [
  { id: 11, documentId: "t1", name: "Python", area: "technical" },
];
const initial = {
  firstName: "Jaylen",
  lastName: "Zeng",
  timeZone: "America/Chicago" as const,
};
const user = { id: 1, email: "j@x.edu" } as never;
const next = () =>
  screen.getByRole("button", { name: /^(continue|see my recommendations)/i });

const host = (show = true) => (
  <OnboardingQuizHost
    show={show}
    topics={topics as never}
    initial={initial}
    user={user}
  />
);

async function finishQuiz() {
  const u = userEvent.setup();
  const view = render(host());
  await u.click(next());
  await u.click(screen.getByRole("radio", { name: /co-op or a job/i }));
  await u.click(next());
  await u.click(screen.getByRole("button", { name: /^technical/i }));
  await u.click(next());
  await u.click(screen.getByRole("button", { name: /python/i }));
  await u.click(next());
  return view;
}

beforeEach(() => {
  jest.clearAllMocks();
  (getMyRecommendations as jest.Mock).mockResolvedValue({
    ok: true,
    error: null,
    data: [recommendation({ id: 5, name: "SQL" }, { reason: "Why SQL" })],
  });
});

describe("OnboardingQuizHost", () => {
  it("saves, shows Results with the picks and never enrolls", async () => {
    (saveOnboarding as jest.Mock).mockResolvedValue({ ok: true });
    await finishQuiz();
    expect(await screen.findByText("Why SQL")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "You're all set, Jaylen!" }),
    ).toBeInTheDocument();
    expect(getMyRecommendations).toHaveBeenCalledWith({
      surface: "onboarding",
      limit: 3,
    });
    expect(createEnrollment).not.toHaveBeenCalled();
  });

  it("keeps Results up when the refresh flips show to false, until Finish", async () => {
    (saveOnboarding as jest.Mock).mockResolvedValue({ ok: true });
    const { rerender } = await finishQuiz();
    await screen.findByText("Why SQL");
    rerender(host(false));
    expect(screen.getByText("Why SQL")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Go to my Activity" }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(push).toHaveBeenCalledWith("/activity");
  });

  it("shows the empty message when the picks fetch fails", async () => {
    (saveOnboarding as jest.Mock).mockResolvedValue({ ok: true });
    (getMyRecommendations as jest.Mock).mockResolvedValue({
      ok: false,
      error: "x",
      data: null,
    });
    await finishQuiz();
    expect(await screen.findByText(/don't have picks/i)).toBeInTheDocument();
  });

  it("keeps the quiz shown when the save fails", async () => {
    (saveOnboarding as jest.Mock).mockResolvedValue({
      ok: false,
      error: "nope",
    });
    await finishQuiz();
    expect(await screen.findByRole("alert")).toHaveTextContent("nope");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(getMyRecommendations).not.toHaveBeenCalled();
  });

  it("renders nothing when not shown, and has no close button", () => {
    const { unmount } = render(host());
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
    unmount();
    render(host(false));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
