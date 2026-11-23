import { render, screen } from "@testing-library/react";
import {
  MENTOR_NOTICE_VERSION,
  MentorNotice,
  acceptNotice,
  noticeAccepted,
} from "@/components/droplets/lessons/mentor/mentor-notice";

describe("MentorNotice v2", () => {
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

  it("stores acceptance under mentor-notice-v2, so a v1 acceptance doesn't count", () => {
    expect(MENTOR_NOTICE_VERSION).toBe(2);
    localStorage.setItem("mentor-notice-v1", "1");
    expect(noticeAccepted()).toBe(false);
    acceptNotice();
    expect(localStorage.getItem("mentor-notice-v2")).toBe("1");
    expect(noticeAccepted()).toBe(true);
  });
});
