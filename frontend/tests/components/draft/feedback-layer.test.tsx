import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { FeedbackLayer } from "@/components/draft/review/feedback-layer";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

/** Two blocks laid out like BlockNote's editable editor, with comment 1's mark */
const Editor = () => (
  <div className="bn-editor" contentEditable suppressContentEditableWarning>
    <div data-node-type="blockContainer" data-id="b1">
      <div className="bn-block-content">
        <p className="bn-inline-content">
          A{" "}
          <span data-anchor-id="comment-1" className="review-mark">
            loop
          </span>{" "}
          repeats a block of code.
        </p>
      </div>
    </div>
    <div data-node-type="blockContainer" data-id="b2">
      <div className="bn-block-content">
        <p className="bn-inline-content">Loops end when a condition fails.</p>
      </div>
    </div>
  </div>
);

const words = {
  id: 1,
  field: "blocks" as const,
  anchor: {
    v: 1 as const,
    field: "blocks" as const,
    blockId: "b1",
    start: 2,
    end: 6,
    quote: "loop",
    prefix: "A ",
    suffix: " repeats",
  },
  body: "Which loop?",
  author: { id: 9, firstName: "Nadia", lastName: "Reviewer" },
  createdAt: "2026-10-28T15:00:00.000Z",
  addressedAt: null,
};
const wholeBlock = {
  id: 2,
  field: "blocks" as const,
  anchor: { v: 1 as const, field: "blocks" as const, blockId: "b2" },
  body: "Explain the condition.",
  author: { id: 9, firstName: "Nadia", lastName: "Reviewer" },
  addressedAt: null,
};

const onAddress = jest.fn();
const onLitChange = jest.fn();

function mount(over: Partial<React.ComponentProps<typeof FeedbackLayer>> = {}) {
  return render(
    <FeedbackLayer
      enabled
      comments={[words, wholeBlock] as never}
      numbers={
        new Map([
          [1, 1],
          [2, 2],
        ])
      }
      outdatedIds={new Set()}
      blockFor={(id) =>
        id === "b2"
          ? { type: "paragraph", text: "Loops end when a condition fails." }
          : undefined
      }
      meta="Round 1 · sent Oct 28, 3:04 PM"
      onAddress={onAddress}
      litMarkId={null}
      onLitChange={onLitChange}
      {...over}
    >
      <Editor />
    </FeedbackLayer>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  onAddress.mockResolvedValue({ ok: true });
});

describe("FeedbackLayer (ODY-807)", () => {
  it("puts a numbered tag in the margin for each comment found", async () => {
    mount();
    await act(async () => {});

    const tags = screen.getAllByTestId("comment-tag");
    expect(tags).toHaveLength(2);
    expect(tags[0]).toHaveAccessibleName(/^Comment 1: /);
    expect(tags[1]).toHaveAccessibleName(/^Comment 2: /);
  });

  it("gives an outdated comment no tag", async () => {
    mount({ outdatedIds: new Set([1]) });
    await act(async () => {});

    expect(screen.getAllByTestId("comment-tag")).toHaveLength(1);
  });

  it("opens a card from a click on a mark, leaving focus in the editor", async () => {
    mount();
    const editor = document.querySelector<HTMLElement>(".bn-editor")!;
    editor.focus();

    await userEvent.click(screen.getByText("loop"));

    const card = screen.getByRole("dialog", { name: "Comment 1" });
    expect(card).toHaveTextContent("Which loop?");
    expect(card).toHaveTextContent("Round 1 · sent Oct 28, 3:04 PM");
    expect(card).toHaveTextContent("Nadia Reviewer");
    expect(document.activeElement).toBe(editor);
  });

  it("lets the click through to the editor", async () => {
    const reached = jest.fn();
    render(
      <div onClick={reached}>
        <FeedbackLayer
          enabled
          comments={[words] as never}
          numbers={new Map([[1, 1]])}
          outdatedIds={new Set()}
          blockFor={() => undefined}
          meta="Round 1"
          litMarkId={null}
          onLitChange={onLitChange}
        >
          <Editor />
        </FeedbackLayer>
      </div>,
    );

    await userEvent.click(screen.getByText("loop"));

    expect(reached).toHaveBeenCalled();
  });

  it("opens and focuses a card from its tag", async () => {
    mount();
    await act(async () => {});

    await userEvent.click(screen.getAllByTestId("comment-tag")[1]);

    const card = screen.getByRole("dialog", { name: "Comment 2" });
    expect(card).toHaveFocus();
    expect(card).toHaveTextContent("Explain the condition.");
  });

  it("offers Mark addressed, and no Edit, Delete or Resolve", async () => {
    mount();
    await userEvent.click(screen.getByText("loop"));

    expect(
      screen.queryByRole("button", { name: /Edit|Delete|Resolve/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Only you can see this/)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Mark addressed" }),
    );

    expect(onAddress).toHaveBeenCalledWith(1, true);
  });

  it("shows an addressed comment as addressed, and takes the mark back", async () => {
    mount({
      comments: [
        { ...words, addressedAt: "2026-10-29T09:00:00.000Z" },
        wholeBlock,
      ] as never,
    });
    await userEvent.click(screen.getByText("loop"));

    expect(
      screen.getByText("Marked addressed. The reviewer resolves it."),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Not addressed yet" }),
    );

    expect(onAddress).toHaveBeenCalledWith(1, false);
  });

  it("offers nothing to change while the draft is back in review", async () => {
    mount({ onAddress: undefined });
    await userEvent.click(screen.getByText("loop"));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark addressed" })).toBeNull();
  });

  it("says a comment was marked addressed in the creator's words while frozen", async () => {
    mount({
      onAddress: undefined,
      comments: [
        { ...words, addressedAt: "2026-10-29T09:00:00.000Z" },
        wholeBlock,
      ] as never,
    });
    await userEvent.click(screen.getByText("loop"));

    expect(
      screen.getByText("Marked addressed. The reviewer resolves it."),
    ).toBeInTheDocument();
    expect(screen.queryByText("The creator marked this addressed.")).toBeNull();
  });

  it("says when the feedback can't change any more", async () => {
    onAddress.mockResolvedValue({ ok: false, error: "review_closed" });
    mount();
    await userEvent.click(screen.getByText("loop"));

    await userEvent.click(
      screen.getByRole("button", { name: "Mark addressed" }),
    );

    expect(toast.info).toHaveBeenCalledWith(
      "This feedback can't change now.",
      expect.anything(),
    );
  });

  it("lights a mark when it's hovered", async () => {
    mount();

    await userEvent.hover(screen.getByText("loop"));

    expect(onLitChange).toHaveBeenCalledWith("comment-1");
  });

  it("lights the lit mark with a style rule, never by redrawing the editor", async () => {
    const { container } = mount({ litMarkId: "comment-1" });

    const rule = container.querySelector("style")?.textContent ?? "";
    expect(rule).toContain('[data-anchor-id="comment-1"].review-mark');
    expect(rule).toContain("var(--rc-tint-strong)");
  });

  it("does nothing while disabled", async () => {
    mount({ enabled: false });
    await act(async () => {});

    expect(screen.queryByTestId("comment-tag")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("loop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
