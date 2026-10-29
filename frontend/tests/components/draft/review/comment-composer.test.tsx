import { render, screen } from "@testing-library/react";
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
      expect(document.getElementById(id)).toHaveTextContent(/to post/);
    }
  });
});
