import {
  highlightContext,
  placeHighlights,
  type HighlightBlock,
} from "@/lib/highlight-placement";
import { Highlight } from "@/types";

const INTRO = "Joins combine rows from two tables.";
const DETAIL = "An inner join keeps only the rows that match in both tables.";

/** A highlight on `quote` in `text`, saved with its context */
function highlightOn(
  text: string,
  quote: string,
  overrides: Partial<Highlight> = {},
): Highlight {
  const start = text.indexOf(quote);
  const end = start + quote.length;
  return {
    id: 1,
    text: quote,
    color: "#fff300",
    position: { start, end },
    blockId: 10,
    context: highlightContext(text, start, end),
    ...overrides,
  };
}

/** The same highlight as saved before highlights kept their context */
function legacyOn(
  text: string,
  quote: string,
  overrides: Partial<Highlight> = {},
) {
  return highlightOn(text, quote, { context: undefined, ...overrides });
}

const placedText = (blocks: HighlightBlock[], highlights: Highlight[]) =>
  placeHighlights(highlights, blocks).placed.map((h) => {
    const block = blocks.find((b) => b.id === h.blockId)!;
    return block.text.slice(h.position.start, h.position.end);
  });

describe("highlightContext", () => {
  it("keeps the quote and up to 30 characters either side", () => {
    expect(highlightContext(DETAIL, 3, 13)).toEqual({
      quote: "inner join",
      prefix: "An ",
      suffix: " keeps only the rows that matc",
    });
  });
});

describe("placeHighlights", () => {
  describe("with a saved context", () => {
    it("leaves a highlight whose text hasn't changed where it is", () => {
      const blocks = [{ id: 10, text: DETAIL }];
      const highlight = highlightOn(DETAIL, "inner join");

      expect(placeHighlights([highlight], blocks)).toEqual({
        placed: [highlight],
        detached: [],
      });
    });

    it("follows its text when a paragraph is added above it in the same group", () => {
      const highlight = highlightOn(DETAIL, "inner join");
      // The group's first paragraph is new, so the group's id changed too
      const blocks = [
        { id: 20, sourceBlockIds: [20, 10], text: INTRO + DETAIL },
      ];

      const { placed, detached } = placeHighlights([highlight], blocks);

      expect(detached).toEqual([]);
      expect(placed[0]).toMatchObject({
        blockId: 20,
        position: { start: INTRO.length + 3, end: INTRO.length + 13 },
      });
      expect(placed[0].edited).toBeUndefined();
    });

    it("follows its text into another block when its own block is gone", () => {
      const highlight = highlightOn(DETAIL, "inner join");
      const blocks = [
        { id: 30, text: INTRO },
        { id: 40, text: `Remember: ${DETAIL}` },
      ];

      expect(placedText(blocks, [highlight])).toEqual(["inner join"]);
      expect(placeHighlights([highlight], blocks).placed[0].blockId).toBe(40);
    });

    it("tells two copies of the same words apart by what's around them", () => {
      const text = "SQL joins tables. Pandas joins frames.";
      const highlight = highlightOn(text, "joins frames", {
        position: { start: 0, end: 0 },
      });
      const second = text.lastIndexOf("joins");
      const blocks = [{ id: 10, text: `Intro. ${text}` }];

      const [placed] = placeHighlights([highlight], blocks).placed;

      expect(placed.position.start).toBe(second + "Intro. ".length);
    });

    it("draws over the new words when only the highlighted words were edited", () => {
      const highlight = highlightOn(DETAIL, "inner join");
      const edited = DETAIL.replace("inner join", "INNER JOIN");
      const blocks = [{ id: 10, text: edited }];

      const { placed, detached } = placeHighlights([highlight], blocks);

      expect(detached).toEqual([]);
      expect(placedText(blocks, [highlight])).toEqual(["INNER JOIN"]);
      expect(placed[0].edited).toBe(true);
    });

    it("detaches a highlight whose text was deleted", () => {
      const highlight = highlightOn(DETAIL, "inner join");
      const blocks = [{ id: 10, text: INTRO }];

      expect(placeHighlights([highlight], blocks)).toEqual({
        placed: [],
        detached: [highlight],
      });
    });

    it("doesn't move a short highlight onto an unrelated copy of its words", () => {
      const highlight = highlightOn(DETAIL, "rows");
      // Its sentence is gone; "rows" is still in two other places
      const blocks = [
        { id: 10, text: INTRO },
        { id: 11, text: "Count the rows first." },
      ];

      expect(placeHighlights([highlight], blocks).detached).toEqual([
        highlight,
      ]);
    });

    it("moves a short highlight to the only copy of its words left", () => {
      const highlight = highlightOn(DETAIL, "match");
      const blocks = [{ id: 11, text: "Rows that don't match are dropped." }];

      expect(placedText(blocks, [highlight])).toEqual(["match"]);
    });
  });

  describe("without a saved context", () => {
    it("stays at its offsets when the text there differs only in spacing", () => {
      const text = "First paragraph.Second paragraph.";
      // The browser copies a selection across paragraphs with a line break
      const highlight = legacyOn(text, "paragraph.Second", {
        text: "paragraph.\nSecond",
      });
      const blocks = [{ id: 10, text }];

      expect(placeHighlights([highlight], blocks).placed).toEqual([highlight]);
    });

    it("trusts its offsets if it was saved after the lesson's last edit", () => {
      const text = "Area is πr² for a circle.";
      // A selection that starts in a formula saves the formula's source
      const highlight = legacyOn(text, "πr²", {
        text: "\\pi r^2",
        createdAt: "2026-10-20T12:00:00.000Z",
      });
      const blocks = [{ id: 10, text }];

      const { placed } = placeHighlights(
        [highlight],
        blocks,
        "2026-10-01T12:00:00.000Z",
      );

      expect(placed).toEqual([highlight]);
    });

    it("moves to the nearest copy of its text in its own block", () => {
      const highlight = legacyOn(DETAIL, "rows");
      const blocks = [{ id: 10, text: `Note: ${DETAIL}` }];

      expect(placeHighlights([highlight], blocks).placed[0].position).toEqual({
        start: DETAIL.indexOf("rows") + "Note: ".length,
        end: DETAIL.indexOf("rows") + "Note: ".length + 4,
      });
    });

    it("moves to another block only when that's the one copy left", () => {
      const unique = legacyOn(DETAIL, "inner join");
      const repeated = legacyOn(DETAIL, "tables", { id: 2 });
      // A Classic-editor save gives every block a new id
      const blocks = [
        { id: 50, text: INTRO },
        { id: 51, text: DETAIL },
      ];

      const { placed, detached } = placeHighlights([unique, repeated], blocks);

      expect(placed.map((h) => [h.id, h.blockId])).toEqual([[1, 51]]);
      expect(detached).toEqual([repeated]);
    });

    it("detaches a highlight whose text was deleted", () => {
      const highlight = legacyOn(DETAIL, "inner join");

      expect(
        placeHighlights([highlight], [{ id: 10, text: INTRO }]).detached,
      ).toEqual([highlight]);
    });
  });

  it("leaves a highlight that's still saving where it was made", () => {
    const highlight = highlightOn(DETAIL, "inner join", { id: -1 });

    expect(
      placeHighlights([highlight], [{ id: 10, text: INTRO }]).placed,
    ).toEqual([highlight]);
  });
});
