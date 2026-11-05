import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommentComposer } from "@/components/draft/review/comment-composer";

const anchor = { left: 0, right: 10, top: 0, bottom: 10, centerX: 5 } as never;
const base = { label: "Comment", onCancel: jest.fn(), onPost: jest.fn() };

describe("CommentComposer", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = jest.fn();
  });

  it.each([
    ["popover", { number: 1, anchor }, "", true],
    ["inline", { inline: true, initialBody: "Reason" }, "Reason", false],
  ])(
    "%s starts with its text, focused, and a dialog only when anchored",
    (_n, props, text, dialog) => {
      render(<CommentComposer {...base} {...props} />);

      const box = screen.getByRole("textbox", { name: "Comment" });
      expect(box).toHaveValue(text);
      expect(box).toHaveFocus();
      expect(!!screen.queryByRole("dialog")).toBe(dialog);
    },
  );

  it("scrolls an inline composer into view, clear of the panel footer", () => {
    const scroll = jest.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<CommentComposer {...base} inline />);

    expect(scroll).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("gives two composers on one page their own hint ids", () => {
    render(
      <>
        <CommentComposer {...base} number={1} anchor={anchor} />
        <CommentComposer {...base} inline />
      </>,
    );

    const [a, b] = screen
      .getAllByRole("textbox")
      .map((t) => t.getAttribute("aria-describedby")!);
    expect(a).not.toBe(b);
    for (const id of [a, b]) {
      expect(document.getElementById(id)).toHaveTextContent(
        "Only you see it until you request changes",
      );
    }
  });

  describe("keys", () => {
    const setup = async (keys: string) => {
      const onPost = jest.fn().mockResolvedValue(null);
      const onCancel = jest.fn();
      render(
        <CommentComposer
          {...base}
          inline
          onPost={onPost}
          onCancel={onCancel}
        />,
      );
      await userEvent.type(screen.getByRole("textbox"), keys);
      return { onPost, onCancel };
    };

    it("posts on Enter", async () => {
      const { onPost } = await setup("Fine{Enter}");

      expect(onPost).toHaveBeenCalledWith("Fine");
    });

    it("adds a line on Shift+Enter, without posting", async () => {
      const { onPost } = await setup("One{Shift>}{Enter}{/Shift}Two");

      expect(screen.getByRole("textbox")).toHaveValue("One\nTwo");
      expect(onPost).not.toHaveBeenCalled();
    });

    it("cancels, not posts, on Enter at Cancel", async () => {
      const { onPost, onCancel } = await setup("Fine");
      await userEvent.tab();
      expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      await userEvent.keyboard("{Enter}");

      expect(onCancel).toHaveBeenCalled();
      expect(onPost).not.toHaveBeenCalled();
    });

    it.each([
      ["composing", { isComposing: true }],
      ["Safari's keyCode 229", { keyCode: 229 }],
    ])("doesn't post on Enter while %s", async (_n, init) => {
      const { onPost } = await setup("Fine");
      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", ...init });

      expect(onPost).not.toHaveBeenCalled();
    });
  });
});
