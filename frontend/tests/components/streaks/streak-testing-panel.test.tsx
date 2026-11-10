import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { StreakTestingPanel } from "@/components/streaks/testing/streak-testing-panel";
import { moveTestDay } from "@/lib/requests/streak-testing";
import { addDays } from "@/lib/streaks";
import { useStreakStore } from "@/stores/streak-store";
import { makeStreak } from "@/testing/mocks/streakMock";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));
jest.mock("@/lib/requests/streak-testing", () => ({
  setTestStreak: jest.fn(),
  finishTestLesson: jest.fn(),
  reviveTestDay: jest.fn(),
  moveTestDay: jest.fn(),
  resetTestStreak: jest.fn(),
}));

const testMode = (offsetDays: number) => ({ test: true, offsetDays });
const dayCard = () => screen.getByRole("region", { name: "Day by day" });

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useStreakStore.setState({ streak: null });
});

it("moves on a day without a lesson: the streak ends and a revive is offered", async () => {
  // A 5-day streak through yesterday; today (Nov 10) isn't lit
  const before = makeStreak({ current: 5 });
  // The next day: the 5 days end the day before yesterday
  const after = makeStreak({
    current: 0,
    past: [0, 1, 2, 3, 4].map((ago) => addDays("2026-11-08", -ago)),
  });
  jest.mocked(moveTestDay).mockResolvedValue({
    ok: true,
    error: null,
    data: { streak: after, mode: testMode(3) },
  });
  render(
    <StreakTestingPanel
      initial={{ streak: before, mode: testMode(2) }}
      userId={7}
    />,
  );
  const card = dayCard();
  expect(within(card).getByText("Day 3 · Nov 10 · not lit yet")).toBeVisible();
  expect(
    within(card).getByText(/your 5-day streak ends at midnight/),
  ).toBeVisible();
  expect(
    within(card).queryByRole("button", { name: "Revive yesterday" }),
  ).not.toBeInTheDocument();

  await userEvent.click(
    within(card).getByRole("button", { name: "Go to the next day" }),
  );

  const news =
    "A day passed without a lesson, so your 5-day streak ended. Revive it today, or it's gone tomorrow.";
  expect(toast.success).toHaveBeenCalledWith(news);
  expect(within(card).getByRole("listitem")).toHaveTextContent(news);
  expect(
    within(card).getByRole("button", { name: "Revive yesterday" }),
  ).toBeEnabled();
  expect(
    within(card).getByText(
      /Revive it before you move on, or it's lost for good/,
    ),
  ).toBeVisible();
});

it("can't move a day until a test streak is set", () => {
  render(
    <StreakTestingPanel
      initial={{ streak: makeStreak(), mode: { test: false, offsetDays: 0 } }}
      userId={7}
    />,
  );

  const card = dayCard();
  expect(within(card).getByText("Set a test streak to start.")).toBeVisible();
  expect(
    within(card).getByRole("button", { name: "Go to the next day" }),
  ).toBeDisabled();
  expect(
    within(card).getByRole("button", { name: "Finish a lesson today" }),
  ).toBeDisabled();
});
