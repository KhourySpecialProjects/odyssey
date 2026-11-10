import {
  caretUnits,
  stopAt,
  stopBox,
  stopText,
  stopsOf,
  textMap,
  wordJump,
} from "@/lib/review-caret";

// jsdom lays nothing out: every character is 10px wide, on one line
beforeAll(() => {
  Range.prototype.getBoundingClientRect = function () {
    const left = this.startOffset * 10;
    return {
      top: 100,
      bottom: 120,
      left,
      right: left + 10,
      width: 10,
      height: 20,
    } as DOMRect;
  };
});

afterEach(() => {
  document.body.innerHTML = "";
  delete (document as unknown as { caretPositionFromPoint?: unknown })
    .caretPositionFromPoint;
});

function html(markup: string) {
  const root = document.createElement("div");
  root.innerHTML = markup;
  document.body.appendChild(root);
  return root;
}

const blockNote = () =>
  html(`
    <div data-node-type="blockContainer" data-id="b1">
      <div class="bn-block-content"><p class="bn-inline-content">Inner joins</p></div>
    </div>
    <div data-node-type="blockContainer" data-id="b2">
      <div class="bn-block-content"><p class="bn-inline-content">Keep rows</p></div>
    </div>`);

describe("textMap", () => {
  it("reads the text and marks where each part starts", () => {
    const root = html("<ul><li>one</li><li>two</li></ul>");

    const map = textMap(root, false);

    expect(map.text).toBe("onetwo");
    expect([...map.breaks]).toEqual([3]);
  });
});

describe("caretUnits", () => {
  it("makes each BlockNote block a unit with its own text", () => {
    const units = caretUnits(blockNote());

    expect(units.map((u) => [u.blockId, u.map.text, u.from, u.to])).toEqual([
      ["b1", "Inner joins", 0, 11],
      ["b2", "Keep rows", 0, 9],
    ]);
  });

  it("gives a block without text of its own (an image, code, a check-in) no stops", () => {
    const units = caretUnits(
      html(`
        <div data-node-type="blockContainer" data-id="pic">
          <div class="react-renderer node-image" contenteditable="false">
            <div class="bn-block-content" data-content-type="image">
              <img alt="" /><p>A diagram</p>
            </div>
          </div>
        </div>
        <div data-node-type="blockContainer" data-id="grid">
          <div class="bn-block-content" data-content-type="table"><table><tbody><tr><td><p>A1</p></td></tr></tbody></table></div>
        </div>`),
    );

    expect(units.map((u) => [u.blockId, u.map.text])).toEqual([
      ["pic", ""],
      // A table's cells are its text, as saved
      ["grid", "A1"],
    ]);
    expect(stopsOf(units, 0)).toEqual([]);
  });

  it("makes each paragraph of a read-only text a unit, in the whole text", () => {
    const units = caretUnits(html("<p>First.</p><ul><li>Second</li></ul>"));

    expect(units.map((u) => [u.blockId, u.from, u.to])).toEqual([
      [undefined, 0, 6],
      [undefined, 6, 12],
    ]);
    expect(units[1].map.text.slice(6, 12)).toBe("Second");
  });
});

describe("stops", () => {
  it("stops before every letter and after the last", () => {
    const units = caretUnits(blockNote());

    const stops = stopsOf(units, 1);

    expect(stops).toHaveLength("Keep rows".length + 1);
    expect(stops[stops.length - 1]).toEqual({ unit: 1, i: 9, side: "after" });
  });

  it("jumps by word", () => {
    const units = caretUnits(blockNote());
    const stops = stopsOf(units, 0);

    // From before "I" to the space after "Inner"
    const next = wordJump(units, stops, 0, 1);
    expect(stops[next]).toEqual({ unit: 0, i: 5, side: "before" });
    // And back to the start of "joins"
    expect(stops[wordJump(units, stops, 8, -1)]).toEqual({
      unit: 0,
      i: 6,
      side: "before",
    });
  });

  it("reads a stop aloud", () => {
    const units = caretUnits(blockNote());

    expect(stopText(units, { unit: 0, i: 3, side: "before" })).toBe(
      "After “Inn”, before “er”",
    );
    expect(stopText(units, { unit: 1, i: 9, side: "after" })).toBe(
      "After “rows”, at the end",
    );
  });

  it("finds the stop under the pointer, and where to draw it", () => {
    const root = blockNote();
    const units = caretUnits(root);
    const text = root.querySelector('[data-id="b2"] p')!.firstChild!;
    (
      document as unknown as { caretPositionFromPoint: unknown }
    ).caretPositionFromPoint = () => ({ offsetNode: text, offset: 4 });

    const stop = stopAt(units, 40, 110)!;

    expect(stop).toEqual({ unit: 1, i: 4, side: "before" });
    expect(stopBox(units, stop)).toEqual({
      x: 40,
      top: 100 + 10 - 21 / 2,
      height: 21,
    });
  });

  it("puts the caret after the last letter at the end of a block", () => {
    const root = blockNote();
    const units = caretUnits(root);
    const text = root.querySelector('[data-id="b1"] p')!.firstChild!;
    (
      document as unknown as { caretPositionFromPoint: unknown }
    ).caretPositionFromPoint = () => ({ offsetNode: text, offset: 11 });

    expect(stopAt(units, 200, 110)).toEqual({ unit: 0, i: 11, side: "after" });
  });
});
