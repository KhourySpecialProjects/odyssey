import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CriterionCircle } from "@/components/draft/review/criterion-circle";

const base = {
  name: "Style",
  issues: 2,
  expanded: false,
  controlsId: "review-detail-4",
  onToggle: jest.fn(),
};

describe("CriterionCircle", () => {
  it("names the circle by score, band and issues", () => {
    render(<CriterionCircle {...base} value={2} />);

    expect(
      screen.getByRole("button", {
        name: "Style, 2 out of 5, Needs work, 2 issues",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("2 issues")).toBeInTheDocument();
  });

  it("reads a not-scored circle as not scored, drawn dashed", () => {
    render(<CriterionCircle {...base} value={null} issues={0} />);

    const button = screen.getByRole("button", { name: "Style, not scored" });
    expect(button.querySelector("[data-circle]")).toHaveStyle({
      borderStyle: "dashed",
    });
  });

  it.each([
    [5, "✓"],
    [3, "–"],
    [1, "✕"],
  ])("badges a score of %i with %s", (value, badge) => {
    render(<CriterionCircle {...base} value={value} />);

    expect(screen.getByText(badge)).toBeInTheDocument();
  });

  it("points aria-controls at the detail and reflects expanded", () => {
    const { rerender } = render(<CriterionCircle {...base} value={4} />);
    const button = screen.getByRole("button");

    expect(button).toHaveAttribute("aria-controls", "review-detail-4");
    expect(button).toHaveAttribute("aria-expanded", "false");

    rerender(<CriterionCircle {...base} value={4} expanded />);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = jest.fn();
    render(<CriterionCircle {...base} value={4} onToggle={onToggle} />);

    await userEvent.click(screen.getByRole("button"));

    expect(onToggle).toHaveBeenCalled();
  });

  it("marks a suggested (unconfirmed) score", () => {
    render(<CriterionCircle {...base} value={4} suggested />);

    const button = screen.getByRole("button", {
      name: /, suggested by AI$/,
    });
    expect(button).toHaveAttribute("data-suggested", "true");
  });

  it("has no suggested cue for a confirmed score", () => {
    render(<CriterionCircle {...base} value={4} />);

    expect(screen.getByRole("button")).toHaveAttribute(
      "data-suggested",
      "false",
    );
    expect(screen.getByRole("button").getAttribute("aria-label")).not.toMatch(
      /suggested/,
    );
  });
});
