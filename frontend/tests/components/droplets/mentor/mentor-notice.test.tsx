import { render, screen } from "@testing-library/react";
import {
  MENTOR_NOTICE_VERSION,
  MentorNotice,
  acceptNotice,
  noticeAccepted,
} from "@/components/droplets/lessons/mentor/mentor-notice";

describe("MentorNotice v3", () => {
  beforeEach(() => localStorage.clear());

  it("shows the approved lines and links Settings", () => {
    render(<MentorNotice onAccept={() => {}} buttonRef={null} />);
    expect(
      screen.getByText(
        /If personalization is on, it also sends the droplets you've finished/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Mentor sends your question and this lesson to an AI model. If personalization is on, it also sends the droplets you've finished and are working on, whether you've finished this droplet's prerequisites, which of its lessons you've viewed, and the lessons whose quiz questions you got wrong in the last 30 days.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "It never sends your name, email or grades from instructors.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Don't include personal information."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("In check-ins, Mentor gives hints, not answers."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute(
      "href",
      "/settings",
    );
  });

  it("stores acceptance under mentor-notice-v3, so a v2 acceptance doesn't count", () => {
    expect(MENTOR_NOTICE_VERSION).toBe(3);
    localStorage.setItem("mentor-notice-v2", "1");
    expect(noticeAccepted()).toBe(false);
    acceptNotice();
    expect(localStorage.getItem("mentor-notice-v3")).toBe("1");
    expect(noticeAccepted()).toBe(true);
  });
});
