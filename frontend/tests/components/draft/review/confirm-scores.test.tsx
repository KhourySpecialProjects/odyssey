import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmScores } from "@/components/draft/review/confirm-scores";
import type { CardStatus } from "@/lib/review-panel/model";

function Host({ slow = false }: { slow?: boolean }) {
  const [status, setStatus] = useState<CardStatus>("to_confirm");
  const [pending, setPending] = useState(false);
  const flip = (next: CardStatus) => {
    setStatus(next);
    if (slow) setPending(true);
  };
  return (
    <>
      <ConfirmScores
        status={status}
        pending={pending}
        onConfirm={() => flip("confirmed")}
        onUndo={() => flip("to_confirm")}
      />
      <button onClick={() => setPending(false)}>finish</button>
    </>
  );
}

describe("ConfirmScores focus", () => {
  it("moves focus from Confirm to Undo and back", async () => {
    render(<Host />);

    await userEvent.click(
      screen.getByRole("button", { name: "Confirm scores" }),
    );
    expect(screen.getByText("Scores confirmed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();

    await userEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(
      screen.getByRole("button", { name: "Confirm scores" }),
    ).toHaveFocus();
  });

  it("ends with focus on the new button once the write settles", async () => {
    render(<Host slow />);

    await userEvent.click(
      screen.getByRole("button", { name: "Confirm scores" }),
    );
    await userEvent.click(screen.getByText("finish"));

    expect(screen.getByRole("button", { name: "Undo" })).toHaveFocus();
  });

  it("does not steal focus when the status changes by itself", () => {
    const noop = jest.fn();
    const { rerender } = render(
      <ConfirmScores status="to_confirm" onConfirm={noop} onUndo={noop} />,
    );

    rerender(
      <ConfirmScores status="confirmed" onConfirm={noop} onUndo={noop} />,
    );

    expect(screen.getByRole("button", { name: "Undo" })).not.toHaveFocus();
  });
});

describe("ConfirmScores states", () => {
  const noop = jest.fn();

  it("offers Confirm while scores wait, and ignores clicks while pending", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ConfirmScores status="to_confirm" onConfirm={onConfirm} onUndo={noop} />,
    );
    await user.click(screen.getByRole("button", { name: "Confirm scores" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmScores
        status="to_confirm"
        pending
        onConfirm={onConfirm}
        onUndo={noop}
      />,
    );
    const button = screen.getByRole("button", { name: "Confirm scores" });
    expect(button).toHaveAttribute("aria-disabled", "true");
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders nothing for a card with no scores", () => {
    const { container } = render(
      <ConfirmScores status="not_scored" onConfirm={noop} onUndo={noop} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
