import { render, screen } from "@testing-library/react";
import { ClassicReviewView } from "@/components/draft/review/classic-review-view";
import type { Block, ReviewComment } from "@/types";

const blocks: Block[] = [
  { __component: "droplets.generic", content: "<p>A loop repeats code.</p>" },
  {
    __component: "droplets.expandable",
    title: "More",
    content: "<p>Loops end on a condition.</p>",
  },
];

const quoteComment = (
  id: number,
  quote: string,
  start: number,
  over: Partial<ReviewComment> = {},
): ReviewComment => ({
  id,
  field: "blocks",
  anchor: {
    v: 1,
    field: "blocks",
    start,
    end: start + quote.length,
    quote,
    prefix: "",
    suffix: "",
  },
  body: "x",
  resolvedAt: null,
  ...over,
});

const onOutdated = jest.fn();

function mount(
  comments: ReviewComment[],
  over: Partial<React.ComponentProps<typeof ClassicReviewView>> = {},
) {
  return render(
    <ClassicReviewView
      blocks={blocks}
      comments={comments}
      reviewState="open"
      draftAnchor={null}
      litMarkId={null}
      onOutdated={onOutdated}
      {...over}
    />,
  );
}

const marks = (id: string) =>
  Array.from(document.querySelectorAll(`[data-anchor-id="${id}"]`));

beforeEach(() => jest.clearAllMocks());

describe("ClassicReviewView", () => {
  it("shows the lesson as read-only text", () => {
    mount([]);

    const view = screen.getByTestId("classic-review-view");
    expect(view).toHaveTextContent("A loop repeats code.");
    expect(view).toHaveTextContent("Loops end on a condition.");
    expect(view.querySelector("[contenteditable]")).toBeNull();
  });

  it("draws a comment's quote, even in another block", () => {
    // The whole lesson is one text: "A loop repeats code." (20 characters),
    // "More" (4), then "Loops end on a " (15) puts "condition" at 39
    mount([quoteComment(1, "loop", 2), quoteComment(2, "condition", 39)]);

    expect(
      marks("comment-1")
        .map((m) => m.textContent)
        .join(""),
    ).toBe("loop");
    expect(marks("comment-1")[0]).toHaveClass(
      "review-mark",
      "review-mark--pending",
    );
    expect(
      marks("comment-2")
        .map((m) => m.textContent)
        .join(""),
    ).toBe("condition");
  });

  it("finds a quote that moved, by its text", () => {
    mount([quoteComment(1, "repeats", 0)]);

    expect(
      marks("comment-1")
        .map((m) => m.textContent)
        .join(""),
    ).toBe("repeats");
  });

  it("reports a comment whose quote is gone as outdated", () => {
    const gone = quoteComment(3, "recursion", 5);
    mount([gone]);

    expect(marks("comment-3")).toHaveLength(0);
    expect(onOutdated).toHaveBeenLastCalledWith([gone]);
  });

  it("draws the text a comment is being written for", () => {
    mount([], {
      draftAnchor: quoteComment(0, "code", 15).anchor,
    });

    expect(marks("comment-draft")[0]).toHaveClass("review-mark--draft");
  });

  it("lights a mark without rewriting the text", () => {
    const comments = [quoteComment(1, "loop", 2)];
    const { rerender } = mount(comments);
    const before = marks("comment-1")[0];

    rerender(
      <ClassicReviewView
        blocks={blocks}
        comments={comments}
        reviewState="open"
        draftAnchor={null}
        litMarkId="comment-1"
        onOutdated={onOutdated}
      />,
    );

    expect(marks("comment-1")[0]).toBe(before);
    expect(before).toHaveClass("review-mark--lit");
  });
});
