import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { StreakPill } from "@/components/streaks/streak-pill";
import { reviveStreak } from "@/lib/requests/streaks";
import { useStreakStore } from "@/stores/streak-store";
import {
  LONG_PAST_RUN,
  makeStreak,
  MISSED_YESTERDAY,
} from "@/testing/mocks/streakMock";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("@/lib/requests/streaks", () => ({ reviveStreak: jest.fn() }));

const mockedRevive = jest.mocked(reviveStreak);

const open = async (name: RegExp) => {
  await userEvent.click(screen.getByRole("button", { name }));
  return screen.getByRole("dialog");
};

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  useStreakStore.setState({ streak: null });
});

describe("StreakPill", () => {
  it.each([
    [false, "23-day streak, not lit today. Show your activity calendar"],
    [true, "23-day streak. Show your activity calendar"],
  ])("lit %s: shows the count, labelled %p", (litToday, label) => {
    render(<StreakPill streak={makeStreak({ litToday })} />);

    const pill = screen.getByRole("button", { name: label });
    expect(pill).toHaveTextContent("23");
  });

  it("opens the streak: its icon, since when, the longest, and what lights today", async () => {
    render(<StreakPill streak={makeStreak({ past: LONG_PAST_RUN })} />);

    const panel = await open(/23-day streak/);
    expect(within(panel).getByText("Tied Sack")).toBeInTheDocument();
    expect(
      within(panel).getByText("Since Oct 18 · Longest 31 days"),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Not lit yet today.")).toBeInTheDocument();
    expect(
      within(panel).getByText("Finish a lesson to make it 24 days."),
    ).toBeInTheDocument();
  });

  it("says what's next once today is lit", async () => {
    render(<StreakPill streak={makeStreak({ litToday: true })} />);

    const panel = await open(/23-day streak/);
    expect(
      within(panel).getByText(
        "Spilling Sack in 1 day. Finish a lesson each day to get there.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a learner with no streak how to start one", async () => {
    render(<StreakPill streak={makeStreak({ current: 0 })} />);

    const panel = await open(/^0-day streak/);
    expect(within(panel).getByText("No streak yet.")).toBeInTheDocument();
    expect(
      within(panel).getByText("Finish a lesson to start a streak."),
    ).toBeInTheDocument();
    expect(within(panel).queryByText(/Since/)).not.toBeInTheDocument();
  });

  it("pages the calendar back to the first active month, and not past this one", async () => {
    render(<StreakPill streak={makeStreak({ past: LONG_PAST_RUN })} />);
    const panel = await open(/23-day streak/);
    const previous = within(panel).getByRole("button", {
      name: "Previous month",
    });
    const next = within(panel).getByRole("button", { name: "Next month" });

    expect(within(panel).getByRole("table")).toHaveAccessibleName(
      "Your activity in November 2026",
    );
    expect(next).toBeDisabled();
    // The past run starts on 12 September
    await userEvent.click(previous);
    await userEvent.click(previous);
    expect(within(panel).getByRole("table")).toHaveAccessibleName(
      "Your activity in September 2026",
    );
    expect(previous).toBeDisabled();
    // 12 to 30 September, each read out with its lessons
    expect(within(panel).getAllByText(", 1 lesson completed")).toHaveLength(19);
  });

  it("shares the streak with the lesson banner", () => {
    const streak = makeStreak();
    render(<StreakPill streak={streak} />);

    expect(useStreakStore.getState().streak).toBe(streak);
  });
});

describe("StreakPill revives", () => {
  // A 24-day streak through 8 Nov; yesterday, 9 Nov, was missed
  const broken = () => makeStreak({ current: 0, past: MISSED_YESTERDAY });
  const restored = makeStreak({
    current: 0,
    past: MISSED_YESTERDAY,
    revived: ["2026-11-09"],
  });

  it("offers to revive yesterday, with a dot on the pill", async () => {
    render(<StreakPill streak={broken()} />);

    const panel = await open(/24-day streak can be revived/);
    const offer = within(panel).getByRole("region", {
      name: "Revive your streak",
    });
    expect(
      within(offer).getByText("Your 24-day streak ended yesterday."),
    ).toBeInTheDocument();
    expect(
      within(offer).getByText(
        "Revive it to keep it going: it'll be 25 days. 2 revives left.",
      ),
    ).toBeInTheDocument();
  });

  it("revives: the streak comes back and a toast says so", async () => {
    mockedRevive.mockResolvedValue({ ok: true, error: null, data: restored });
    render(<StreakPill streak={broken()} />);
    const panel = await open(/can be revived/);

    await userEvent.click(
      within(panel).getByRole("button", { name: "Revive" }),
    );

    await waitFor(() =>
      expect(useStreakStore.getState().streak).toBe(restored),
    );
    expect(toast.success).toHaveBeenCalledWith("Streak revived", {
      description: "It's a 25-day streak again. 1 revive left.",
    });
    expect(
      screen.getByRole("button", { name: /^25-day streak/ }),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole("region", { name: "Revive your streak" }),
    ).not.toBeInTheDocument();
  });

  it.each([
    ["No revives left", "No revives left"],
    ["unauthenticated", "Sign in again to revive your streak."],
  ])("says why when the revive is refused: %s", async (error, shown) => {
    mockedRevive.mockResolvedValue({ ok: false, error, data: null } as never);
    render(<StreakPill streak={broken()} />);
    const panel = await open(/can be revived/);

    await userEvent.click(
      within(panel).getByRole("button", { name: "Revive" }),
    );

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(shown));
  });

  it("hides the offer after Not now, and remembers it", async () => {
    const { unmount } = render(<StreakPill streak={broken()} />);
    const panel = await open(/can be revived/);

    await userEvent.click(
      within(panel).getByRole("button", { name: "Not now" }),
    );

    expect(
      within(panel).queryByRole("region", { name: "Revive your streak" }),
    ).not.toBeInTheDocument();
    expect(within(panel).getByText("Streak ended.")).toBeInTheDocument();
    unmount();
    render(<StreakPill streak={broken()} />);
    expect(
      screen.getByRole("button", {
        name: /^0-day streak, not lit today\. Show/,
      }),
    ).toBeInTheDocument();
  });

  it("keeps the revives left out until one is on offer, and outlines revived days", async () => {
    render(<StreakPill streak={restored} />);

    const panel = await open(/25-day streak/);
    expect(within(panel).queryByText(/revives? left/)).not.toBeInTheDocument();
    expect(within(panel).getByText(", Revived")).toBeInTheDocument();
    expect(within(panel).getByText("Revived")).toBeInTheDocument();
  });
});
