import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AiStatusBar } from "@/components/draft/review/ai-status-bar";
import type { AiBarState } from "@/lib/review-panel/model";

const counts = { confirmed: 0, total: 3 };

const bar = (state: AiBarState, extra: object = {}) =>
  render(<AiStatusBar state={state} counts={counts} {...extra} />);

describe("AiStatusBar", () => {
  it("explains AI scoring with no run, and has no button without onStart", () => {
    bar({ kind: "none" });

    expect(screen.getByText(/you confirm every score/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /score with ai/i }),
    ).not.toBeInTheDocument();
  });

  it("calls onStart from Score with AI", async () => {
    const onStart = jest.fn();
    bar({ kind: "none" }, { onStart });

    await userEvent.click(
      screen.getByRole("button", { name: /score with ai/i }),
    );

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("shows progress while scoring", () => {
    bar({ kind: "scoring", currentName: "Lesson 3", done: 2, total: 5 });

    expect(screen.getByText("Scoring Lesson 3…")).toBeInTheDocument();
    expect(screen.getByText("2 of 5 done")).toBeInTheDocument();
    const progress = screen.getByRole("progressbar");
    expect(progress).toHaveAttribute("aria-valuenow", "2");
    expect(progress).toHaveAttribute("aria-valuemax", "5");
  });

  it("shows confirmed count and Run again only with onStart", () => {
    const { rerender } = bar({ kind: "scored" });

    expect(screen.getByText("0 of 3 confirmed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /run again/i }),
    ).not.toBeInTheDocument();

    rerender(
      <AiStatusBar
        state={{ kind: "scored" }}
        counts={counts}
        onStart={jest.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /run again/i }),
    ).toBeInTheDocument();
  });

  it("says when the AI scored it", () => {
    const finishedAt = new Date(Date.now() - 3 * 3600_000).toISOString();
    bar({ kind: "scored" }, { finishedAt });

    expect(screen.getByText(/scored by ai 3 hours ago/i)).toBeInTheDocument();
  });

  it.each(["partial", "failed"] as const)(
    "names the lessons a %s run couldn't score",
    (kind) => {
      bar({ kind, failedNames: ["Lesson 2", "Overall Score"] });

      expect(
        screen.getByText("Couldn't score Lesson 2 and Overall Score."),
      ).toBeInTheDocument();
    },
  );

  it("never shows the run's error text", () => {
    bar({ kind: "failed", failedNames: [] }, { error: "secret stack trace" });

    expect(screen.queryByText(/secret stack trace/)).not.toBeInTheDocument();
  });

  it("shows the legend", () => {
    bar({ kind: "none" });

    for (const text of ["Good 4–5", "OK 3", "Needs work 1–2", "Not scored"]) {
      expect(screen.getByText(text)).toBeInTheDocument();
    }
  });
});
