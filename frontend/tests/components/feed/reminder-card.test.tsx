import { render, screen, fireEvent } from "@testing-library/react";
import { DateTime } from "luxon";
import { ReminderCard } from "@/components/feed/reminder-card";
import type { Announcement, ReminderFeedData } from "@/types";

const reminder = (over: Partial<ReminderFeedData> = {}): ReminderFeedData => ({
  headline: "Pick up Git where you left off.",
  progress: { viewed: 1, total: 3 },
  nextLesson: { name: "Branching", slug: "branching" },
  started: true,
  ...over,
});

const announcement = (r?: Partial<ReminderFeedData>) =>
  ({
    id: 9,
    type: "reminder",
    content: "fallback",
    firstCreated: new Date(),
    droplet: { id: 1, name: "Git", slug: "git" },
    reminder: reminder(r),
  }) as unknown as Announcement;

const renderCard = (
  r?: Partial<ReminderFeedData>,
  props: { onMarkRead?: jest.Mock; onMarkUnread?: jest.Mock } = {},
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

  it("marks read, and Remind me later is disabled", () => {
    const onMarkRead = jest.fn();
    renderCard(undefined, { onMarkRead });

    fireEvent.click(screen.getByRole("button", { name: "Mark as read" }));

    expect(onMarkRead).toHaveBeenCalledWith(9);
    expect(
      screen.getByRole("button", { name: "Remind me later" }),
    ).toBeDisabled();
  });
});
