import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CriterionDetail } from "@/components/draft/review/criterion-detail";
import { useDismissedFindings } from "@/hooks/use-dismissed-findings";
import {
  visibleFindings,
  issuesText,
  type PanelScore,
} from "@/lib/review-panel/model";
import type { AiFinding } from "@/types";

const criterion = { id: 2, name: "Style", order: 2, active: true };
const finding = (id: string, quote: string, reason: string): AiFinding => ({
  id,
  quote,
  reason,
  lessonId: 4,
  anchor: { v: 1, field: "blocks", quote, prefix: "", suffix: "" },
});
const findings = [
  finding("f1", "Older tutorials use git checkout", "One long paragraph"),
  finding("f2", "Always check your branch", "Heavy bold"),
];
const base: PanelScore = {
  lessonId: 4,
  criterionId: 2,
  value: null,
  aiValue: 2,
  aiRationale: "Hard to scan",
  aiFindings: findings,
};

/** Wires the detail the way the card will */
function Harness({
  score = base,
  onChange = jest.fn(),
  onClose = jest.fn(),
  pending,
  onShow,
}: {
  score?: PanelScore;
  onChange?: (v: number) => void;
  onClose?: () => void;
  pending?: boolean;
  onShow?: (f: AiFinding) => void;
}) {
  const { dismissed, dismiss, undismiss } = useDismissedFindings(7);
  const visible = visibleFindings(score, dismissed);
  return (
    <>
      <p data-testid="count">{issuesText(visible.length)}</p>
      <CriterionDetail
        criterion={criterion}
        score={score}
        lessonId={4}
        findings={visible}
        dismissedFindings={(score.aiFindings ?? []).filter((f) =>
          dismissed.has(f.id),
        )}
        onDismiss={dismiss}
        onUndismiss={undismiss}
        onChange={onChange}
        onClose={onClose}
        onShowInLesson={onShow}
        pending={pending}
      />
    </>
  );
}

beforeEach(() => localStorage.clear());

describe("CriterionDetail", () => {
  it("shows the pill, status, reason and numbered findings", () => {
    render(<Harness />);
    expect(screen.getByTitle("2 out of 5")).toBeInTheDocument();
    expect(screen.getAllByText("2 out of 5").length).toBeGreaterThan(0);
    expect(screen.getByText("Needs work")).toBeInTheDocument();
    expect(screen.getByText(/Hard to scan/)).toBeInTheDocument();
    expect(screen.getByText(/Why:/)).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("1")).toBeInTheDocument();
    expect(within(items[0]).getByText(/Older tutorials/)).toBeInTheDocument();
    expect(within(items[1]).getByText("Heavy bold")).toBeInTheDocument();
  });

  it("toggles the score control and moves with the arrow keys", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(<Harness onChange={onChange} />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /disagree/i }));
    const group = screen.getByRole("radiogroup", { name: /style score/i });
    expect(within(group).getAllByRole("radio")).toHaveLength(5);
    expect(screen.getByRole("radio", { name: "2" })).toBeChecked();

    screen.getByRole("radio", { name: "2" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "3" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "1" })).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("says when you changed the score", () => {
    render(<Harness score={{ ...base, value: 4 }} />);
    expect(screen.getByText(/changed by you \(AI: 2\)/)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });

  it("closes on Escape and on the close button", async () => {
    const onClose = jest.fn();
    const user = userEvent.setup();
    render(<Harness onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: /close style/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /disagree/i }));
    screen.getByRole("radio", { name: "2" }).focus();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("ignores score changes while pending", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    render(
      <Harness score={{ ...base, value: 4 }} onChange={onChange} pending />,
    );
    await user.click(screen.getByRole("radio", { name: "5" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("region")).toHaveAttribute("aria-busy", "true");
  });

  it("hides Show in lesson without a handler and calls it with one", async () => {
    const onShow = jest.fn();
    const user = userEvent.setup();
    const { unmount } = render(<Harness />);
    expect(screen.queryByText(/show in lesson/i)).not.toBeInTheDocument();
    unmount();

    render(<Harness onShow={onShow} />);
    await user.click(screen.getAllByText(/show in lesson/i)[0]);
    expect(onShow).toHaveBeenCalledWith(findings[0]);
    expect(screen.queryByText(/add as comment/i)).not.toBeInTheDocument();
  });

  it("marks a finding Not an issue, then restores it with Undo", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId("count")).toHaveTextContent("2 issues");

    await user.click(
      screen.getAllByRole("button", { name: /not an issue/i })[0],
    );
    expect(screen.getByTestId("count")).toHaveTextContent("1 issue");
    expect(
      screen.getByText(/Not an issue: “Older tutorials/),
    ).toBeInTheDocument();
    expect(screen.queryByText("One long paragraph")).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("review-dismissed:7")!)).toEqual([
      "f1",
    ]);
    expect(screen.getByTitle("2 out of 5")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(screen.getByTestId("count")).toHaveTextContent("2 issues");
    expect(screen.getByText("One long paragraph")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("review-dismissed:7")!)).toEqual([]);
  });

  it("remembers dismissals after a reload", () => {
    localStorage.setItem("review-dismissed:7", JSON.stringify(["f2"]));
    render(<Harness />);
    expect(screen.getByTestId("count")).toHaveTextContent("1 issue");
  });

  it("survives a broken localStorage", async () => {
    const user = userEvent.setup();
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    render(<Harness />);
    await user.click(
      screen.getAllByRole("button", { name: /not an issue/i })[0],
    );
    expect(screen.getByTestId("count")).toHaveTextContent("1 issue");
    jest.restoreAllMocks();
  });
});

describe("hand scoring keeps its control", () => {
  it("keeps the radio group and focus on the chosen score", async () => {
    const onChange = jest.fn();
    const unscored: PanelScore = {
      ...base,
      aiValue: null,
      aiRationale: null,
      aiFindings: [],
    };
    const { rerender } = render(
      <Harness score={unscored} onChange={onChange} />,
    );

    expect(screen.getByText("Score it yourself")).toBeInTheDocument();
    expect(screen.queryByText(/Why:/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("radio", { name: "3" }));
    expect(onChange).toHaveBeenCalledWith(3);

    rerender(<Harness score={{ ...unscored, value: 3 }} onChange={onChange} />);

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "3" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "3" })).toBeChecked();
  });
});
