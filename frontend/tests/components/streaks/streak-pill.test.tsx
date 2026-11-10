import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StreakPill } from "@/components/streaks/streak-pill";
import { useStreakStore } from "@/stores/streak-store";
import { LONG_PAST_RUN, makeStreak } from "@/testing/mocks/streakMock";

const open = async (name: RegExp) => {
  await userEvent.click(screen.getByRole("button", { name }));
  return screen.getByRole("dialog");
};

beforeEach(() => useStreakStore.setState({ streak: null }));

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
