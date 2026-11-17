import { act, render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateTime } from "luxon";
import { ReminderCard } from "@/components/feed/reminder-card";
import { makeReminderAnnouncement } from "@/testing/mocks/reminderMock";
import type { ReminderFeedData } from "@/types";

const announcement = (r?: Partial<ReminderFeedData>) =>
  makeReminderAnnouncement({ id: 9, reminder: r });

const renderCard = (
  r?: Partial<ReminderFeedData>,
  props: {
    onMarkRead?: jest.Mock;
    onMarkUnread?: jest.Mock;
    onRemindLater?: jest.Mock;
  } = {},
) =>
  render(
    <ul>
      <ReminderCard
        announcement={announcement(r)}
        timestamp="11/12/2026, 9:00 AM"
        {...props}
      />
    </ul>,
  );

describe("ReminderCard", () => {
  it("shows the headline, progress, Up next and a Resume link to that lesson", () => {
    renderCard();

    expect(screen.getByText("Git")).toBeInTheDocument();
    expect(screen.getByText("Pick up Git where you left off.")).toBeVisible();
    expect(screen.getByText("1 of 3 lessons")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
    expect(screen.getByText("Branching")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute(
      "href",
      "/d/git/branching",
    );
    expect(screen.getByText("11/12/2026, 9:00 AM")).toBeInTheDocument();
  });

  it("offers Start lesson 1 when nothing is viewed", () => {
    renderCard({ started: false, progress: { viewed: 0, total: 3 } });

    expect(
      screen.getByRole("link", { name: "Start lesson 1" }),
    ).toHaveAttribute("href", "/d/git/branching");
  });

  it.each([
    [
      "all lessons viewed",
      { nextLesson: null, progress: { viewed: 3, total: 3 } },
    ],
    [
      "no lessons or enrollment",
      { nextLesson: null, progress: null, started: false },
    ],
  ])("links Resume to the droplet page with %s", (_, over) => {
    renderCard(over);

    expect(screen.getByRole("link", { name: "Resume" })).toHaveAttribute(
      "href",
      "/d/git",
    );
    expect(screen.queryByText(/Up next/)).not.toBeInTheDocument();
  });

  it("leaves out the bar and count when there is no progress", () => {
    renderCard({ progress: null });

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText(/lessons$/)).not.toBeInTheDocument();
  });

  it("shows the due chip only within 3 days, overdue included", () => {
    const day = (n: number) => DateTime.local().plus({ days: n }).toISODate()!;
    const { unmount } = renderCard({ dueDate: day(0), dueGroupName: "CS 101" });
    expect(screen.getByText("Due today · CS 101")).toBeInTheDocument();
    unmount();

    const late = renderCard({ dueDate: day(-1), dueGroupName: "CS 101" });
    expect(screen.getByText("One Day Late! · CS 101")).toBeInTheDocument();
    late.unmount();

    renderCard({ dueDate: day(5), dueGroupName: "CS 101" });
    expect(screen.queryByText(/CS 101/)).not.toBeInTheDocument();
  });

  it("marks read", () => {
    const onMarkRead = jest.fn();
    renderCard(undefined, { onMarkRead });

    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    expect(onMarkRead).toHaveBeenCalledWith(9);
  });

  describe("Remind me later", () => {
    const openMenu = async () => {
      const onRemindLater = jest.fn();
      renderCard(undefined, { onRemindLater });
      const trigger = screen.getByRole("button", { name: "Remind me later" });
      expect(trigger).toBeEnabled();
      await userEvent.click(trigger);
      return { onRemindLater, trigger };
    };

    it("opens a menu with four items", async () => {
      await openMenu();

      expect(screen.getAllByRole("menuitem")).toHaveLength(4);
    });

    it.each([
      ["Tomorrow", "tomorrow"],
      ["In 3 days", "in_3_days"],
      ["Next week", "next_week"],
      ["Stop reminding me", "stop"],
    ])("selecting %s calls onRemindLater with %s", async (name, choice) => {
      const { onRemindLater } = await openMenu();

      await userEvent.click(screen.getByRole("menuitem", { name }));

      expect(onRemindLater).toHaveBeenCalledWith(9, choice);
    });

    it("closes on Escape and returns focus to the trigger", async () => {
      const { trigger } = await openMenu();

      await userEvent.keyboard("{Escape}");

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    it("leaves focus to the parent after a selection instead of the trigger", async () => {
      const { trigger } = await openMenu();

      await userEvent.click(screen.getByRole("menuitem", { name: "Tomorrow" }));
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10));
      });

      expect(trigger).not.toHaveFocus();
    });

    it("renders no button without the prop", () => {
      renderCard();

      expect(
        screen.queryByRole("button", { name: "Remind me later" }),
      ).not.toBeInTheDocument();
    });
  });

  it("refreshes the due chip when local midnight passes", () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(DateTime.local(2026, 11, 10, 23, 59, 30).toJSDate());
      renderCard({ dueDate: "2026-11-11" });
      expect(screen.getByText("Due tomorrow")).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(60_000);
      });

      expect(screen.getByText("Due today")).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
