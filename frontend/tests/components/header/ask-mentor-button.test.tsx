import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskMentorButton } from "@/components/header/ask-mentor-button";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";

describe("AskMentorButton", () => {
  beforeEach(() => {
    useLessonPanelStore.getState().reset();
  });

  it("renders nothing until the lesson page makes Mentor available", () => {
    render(<AskMentorButton />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("toggles the Mentor panel and aria-expanded", async () => {
    render(<AskMentorButton />);
    act(() => useLessonPanelStore.getState().setMentorAvailable(true));
    const button = screen.getByRole("button", { name: /Ask Mentor/ });
    expect(button).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(button);
    expect(useLessonPanelStore.getState().panel).toBe("mentor");
    expect(button).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(button);
    expect(useLessonPanelStore.getState().panel).toBeNull();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
