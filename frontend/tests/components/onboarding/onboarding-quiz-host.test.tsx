import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OnboardingQuizHost } from "@/components/onboarding/onboarding-quiz-host";
import { saveOnboarding } from "@/lib/actions/onboarding";
import { createEnrollment } from "@/lib/requests/enrollment";

const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
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

async function finishQuiz() {
  const u = userEvent.setup();
  render(
    <OnboardingQuizHost
      topics={topics as never}
      initial={initial}
      user={user}
    />,
  );
  await u.click(next());
  await u.click(screen.getByRole("radio", { name: /co-op or a job/i }));
  await u.click(next());
  await u.click(screen.getByRole("button", { name: /^technical/i }));
  await u.click(next());
  await u.click(screen.getByRole("button", { name: /python/i }));
  await u.click(next());
}

beforeEach(() => jest.clearAllMocks());

describe("OnboardingQuizHost", () => {
  it("saves, hides the quiz and never enrolls", async () => {
    (saveOnboarding as jest.Mock).mockResolvedValue({ ok: true });
    await finishQuiz();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(saveOnboarding).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalled();
    expect(createEnrollment).not.toHaveBeenCalled();
  });

  it("keeps the quiz shown when the save fails", async () => {
    (saveOnboarding as jest.Mock).mockResolvedValue({
      ok: false,
      error: "nope",
    });
    await finishQuiz();
    expect(await screen.findByRole("alert")).toHaveTextContent("nope");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("has no close button", () => {
    render(
      <OnboardingQuizHost
        topics={topics as never}
        initial={initial}
        user={user}
      />,
    );
    expect(screen.queryByRole("button", { name: /close/i })).toBeNull();
  });
});
