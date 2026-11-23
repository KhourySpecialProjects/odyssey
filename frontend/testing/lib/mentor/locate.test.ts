/** @jest-environment jsdom */
import { findCitation, noteYFor, showCitation } from "@/lib/mentor/locate";
import type { Citation } from "@/lib/mentor/types";

const cite = (
  blockIndex: number,
  anchor: Partial<Citation["anchor"]> = {},
): Citation => ({
  ref: "p1",
  blockIndex,
  label: "label",
  anchor: { v: 1, field: "blocks", ...anchor },
});

let root: HTMLElement;
const scrollIntoView = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  Element.prototype.scrollIntoView = scrollIntoView;
  root = document.createElement("div");
  document.body.replaceChildren(root);
});

afterEach(() => jest.useRealTimers());

describe("findCitation", () => {
  it("finds a BlockNote passage by its block id and quote", () => {
    root.innerHTML = `<div data-lesson-block="0"><p data-block-id="b1">Intro</p><p data-block-id="b2">Joins combine tables</p></div>`;

    const whole = findCitation(root, cite(0, { blockId: "b2" }));
    expect(whole?.element.textContent).toBe("Joins combine tables");
    expect(whole?.range).toBeUndefined();

    const part = findCitation(
      root,
      cite(0, { blockId: "b2", quote: "combine", start: 6, end: 13 }),
    );
    expect(part?.range?.toString()).toBe("combine");
  });

  it("picks the copy of a classic quote its surroundings match", () => {
    root.innerHTML = `<div data-lesson-block="1"><p>x bar y. z bar w</p></div>`;

    const found = findCitation(
      root,
      cite(1, { quote: "bar", start: 0, end: 3, prefix: "z ", suffix: " w" }),
    );

    expect(found?.range?.toString()).toBe("bar");
    expect(found?.range?.startOffset).toBe(11);
  });

  it("returns null for a block that isn't on the page", () => {
    root.innerHTML = `<div data-lesson-block="0"><p>Hi</p></div>`;
    expect(findCitation(root, cite(4, { quote: "Hi" }))).toBeNull();
  });
});

describe("showCitation", () => {
  it("opens a closed expandable, then finds the quote inside it", async () => {
    root.innerHTML = `<div data-lesson-block="0"><button data-mentor-expand data-state="closed">More</button><div id="body"></div></div>`;
    root.querySelector("button")!.addEventListener("click", () => {
      root.querySelector("#body")!.innerHTML = "<p>Hidden answer text</p>";
    });

    const shown = showCitation(
      root,
      cite(0, { quote: "answer", start: 7, end: 13 }),
    );
    await jest.advanceTimersByTimeAsync(100);

    expect(await shown).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" }),
    );
  });

  it("doesn't click a closed button that isn't an expandable trigger", async () => {
    root.innerHTML = `<div data-lesson-block="0"><button data-state="closed">Menu</button><p>Unrelated words here</p></div>`;
    const click = jest.fn();
    root.querySelector("button")!.addEventListener("click", click);

    const shown = showCitation(
      root,
      cite(0, { quote: "gone", prefix: "aaaaaaaaaa", suffix: "bbbbbbbbbb" }),
    );
    await jest.advanceTimersByTimeAsync(600);

    expect(click).not.toHaveBeenCalled();
    await shown;
  });

  it("stops polling an expandable once aborted", async () => {
    root.innerHTML = `<div data-lesson-block="0"><button data-mentor-expand data-state="closed">More</button><p>Unrelated words here</p></div>`;
    const ctl = new AbortController();

    const shown = showCitation(
      root,
      // Prefix and suffix that don't match keep the quote from resolving
      cite(0, { quote: "gone", prefix: "aaaaaaaaaa", suffix: "bbbbbbbbbb" }),
      ctl.signal,
    );
    ctl.abort();
    await jest.advanceTimersByTimeAsync(600);

    expect(await shown).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("flashes the whole block when there is no quote, then clears it", async () => {
    root.innerHTML = `<div data-lesson-block="0"><pre>code</pre></div>`;
    const block = root.firstElementChild!;

    expect(await showCitation(root, cite(0))).toBe(true);
    expect(block).toHaveClass("mentor-source--flash");
    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" }),
    );

    jest.advanceTimersByTime(1500);
    expect(block).not.toHaveClass("mentor-source--flash");
  });

  it("keeps a second flash for its full time when pressed during the first", async () => {
    root.innerHTML = `<div data-lesson-block="0"><pre>code</pre></div>`;
    const block = root.firstElementChild!;

    await showCitation(root, cite(0));
    jest.advanceTimersByTime(1400);
    await showCitation(root, cite(0));

    jest.advanceTimersByTime(200);
    expect(block).toHaveClass("mentor-source--flash");
    jest.advanceTimersByTime(1300);
    expect(block).not.toHaveClass("mentor-source--flash");
  });

  it("returns false when the passage isn't on the page", async () => {
    const shown = showCitation(root, cite(3, { quote: "gone" }));
    await jest.advanceTimersByTimeAsync(600);
    expect(await shown).toBe(false);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("noteYFor", () => {
  it("is the first cited block's top within the lesson, or the viewport top", () => {
    root.innerHTML = `<div data-lesson-block="2"></div>`;
    jest
      .spyOn(root, "getBoundingClientRect")
      .mockReturnValue({ top: -100 } as DOMRect);
    jest
      .spyOn(root.firstElementChild!, "getBoundingClientRect")
      .mockReturnValue({ top: 250 } as DOMRect);

    expect(noteYFor(root, [cite(2)])).toBe(350);
    expect(noteYFor(root, [])).toBe(100);
  });

  it("adds the root's own scroll when the lesson wrapper scrolls", () => {
    root.innerHTML = `<div data-lesson-block="0"></div>`;
    root.scrollTop = 400;
    jest
      .spyOn(root, "getBoundingClientRect")
      .mockReturnValue({ top: 107 } as DOMRect);
    jest
      .spyOn(root.firstElementChild!, "getBoundingClientRect")
      .mockReturnValue({ top: 207 } as DOMRect);

    expect(noteYFor(root, [cite(0)])).toBe(500);
    expect(noteYFor(root, [])).toBe(400);
  });
});
