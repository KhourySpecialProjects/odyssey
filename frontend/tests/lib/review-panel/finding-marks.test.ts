import { findingMarkId, findingMarks } from "@/lib/review-panel/finding-marks";
import { mockAiFinding } from "@/testing/mocks/reviewsMock";

const content = { blocks: [{ id: "block-1", text: "an example text" }] };
const item = (id: string, number: number, quote = "example") => ({
  finding: mockAiFinding({
    id,
    // A different prefix and suffix, so an edited quote can't be matched either
    anchor: {
      ...mockAiFinding().anchor,
      quote,
      ...(quote === "missing" && { prefix: "zz ", suffix: " qq" }),
    },
  }),
  number,
});

describe("findingMarks", () => {
  it.each([
    ["found: drawn with band tone and number", "example", undefined, true, ""],
    ["gone from the content: outdated", "missing", undefined, false, ""],
    [
      "the focused mark gets the focus class",
      "example",
      "finding-f1",
      true,
      " review-mark--focus",
    ],
  ])("%s", (_name, quote, focusedId, drawn, extra) => {
    const result = findingMarks(
      [item("f1", 2, quote)],
      content,
      "ok",
      focusedId,
    );

    if (drawn) {
      expect(result.outdated).toEqual([]);
      expect(result.drawn).toEqual([
        {
          id: "finding-f1",
          range: expect.objectContaining({ blockId: "block-1", start: 3 }),
          className: `review-finding review-finding--ok${extra}`,
          badge: 2,
        },
      ]);
    } else {
      expect(result.drawn).toEqual([]);
      expect(result.outdated).toEqual(["finding-f1"]);
    }
  });

  it("builds the mark id from the finding id", () => {
    expect(findingMarkId("f9")).toBe("finding-f9");
  });
});
