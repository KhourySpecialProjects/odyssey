import { act, renderHook } from "@testing-library/react";
import {
  SCAN_HIGHLIGHT,
  useScanTarget,
  wordRanges,
} from "@/hooks/use-scan-target";

// A scan flag's Go to lesson (ODY-913). jsdom has no CSS Custom Highlight
// API or Web Animations, so both are stubbed.

class FakeHighlight {
  ranges: Range[];
  constructor(...ranges: Range[]) {
    this.ranges = ranges;
  }
}
const highlights = new Map<string, FakeHighlight>();
const scrollIntoView = jest.fn();
const animate = jest.fn();

const lit = () =>
  (highlights.get(SCAN_HIGHLIGHT)?.ranges ?? []).map((r) => r.toString());
const go = (search: string) =>
  window.history.replaceState(null, "", `/draft/d/drop/loops${search}`);

/** BlockNote's markup: outer > container > content, both with the id */
const editorBlock = (id: string, text: string, type = "paragraph") =>
  `<div class="bn-block-outer" data-node-type="blockOuter" data-id="${id}"><div class="bn-block" data-node-type="blockContainer" data-id="${id}"><div class="bn-block-content" data-content-type="${type}"><p class="bn-inline-content">${text}</p></div></div></div>`;
const editor = (html: string) =>
  `<div class="bn-block-group" data-node-type="blockGroup">${html}</div>`;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
  highlights.clear();
  Object.assign(CSS, { highlights });
  Object.assign(globalThis, { Highlight: FakeHighlight });
  Element.prototype.scrollIntoView = scrollIntoView;
  Element.prototype.animate = animate;
  (window.matchMedia as jest.Mock).mockImplementation(() => ({
    matches: false,
  }));
  document.body.innerHTML = "";
  go("");
});

afterAll(() => {
  delete (CSS as { highlights?: unknown }).highlights;
  delete (globalThis as { Highlight?: unknown }).Highlight;
});

describe("useScanTarget (ODY-913)", () => {
  it("scrolls to the block, flashes it and highlights its words there only", () => {
    document.body.innerHTML =
      editorBlock("a", "We recieve the file.") +
      editorBlock("b", "We recieve <b>untill</b> noon, recieved untill-ish.");
    go("?block=b&words=recieve%2Cuntill");

    renderHook(() => useScanTarget());

    const content = document.querySelector('[data-id="b"] .bn-block-content');
    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "smooth",
    });
    expect(scrollIntoView.mock.contexts[0]).toBe(content);
    expect(animate).toHaveBeenCalledTimes(1);
    // Whole words: not "recieved" or "untill-ish"
    expect(lit()).toEqual(["recieve", "untill"]);
    expect(window.location.search).toBe("");
  });

  it("highlights words in a list's later items, which its flag covers", () => {
    document.body.innerHTML = editor(
      editorBlock("l1", "Frist item", "bulletListItem") +
        editorBlock("l2", "Secnd item", "bulletListItem") +
        editorBlock("p", "Frist again") +
        editorBlock("l3", "Frist later list", "bulletListItem"),
    );
    go("?block=l1&words=Frist%2CSecnd");

    renderHook(() => useScanTarget());

    // The list ends at the paragraph
    expect(lit()).toEqual(["Frist", "Secnd"]);
  });

  it.each([
    ["a Classic block", `<div data-block-id="7"><p>Teh end</p></div>`, "7"],
    ["the lesson name", `<h1 data-lesson-title>Teh basics</h1>`, "title"],
  ])("finds %s", (_n, html, block) => {
    document.body.innerHTML = html;
    go(`?block=${block}&words=Teh`);

    renderHook(() => useScanTarget());

    expect(scrollIntoView).toHaveBeenCalled();
    expect(lit()).toEqual(["Teh"]);
  });

  it("only scrolls for a flag with no words", () => {
    document.body.innerHTML = editorBlock("a", "Some text");
    go("?block=a");

    renderHook(() => useScanTarget());

    expect(scrollIntoView).toHaveBeenCalled();
    expect(highlights.size).toBe(0);
  });

  it("waits for the editor to mount", () => {
    jest.useFakeTimers();
    go("?block=a&words=Teh");
    renderHook(() => useScanTarget());
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(window.location.search).not.toBe("");

    document.body.innerHTML = editorBlock("a", "Teh end");
    act(() => jest.advanceTimersByTime(100));

    expect(lit()).toEqual(["Teh"]);
    expect(window.location.search).toBe("");
  });

  it("gives up quietly when the block is gone, and clears the URL", () => {
    jest.useFakeTimers();
    document.body.innerHTML = editorBlock("other", "Teh end");
    go("?block=a&words=Teh");

    renderHook(() => useScanTarget());
    act(() => jest.advanceTimersByTime(8000));

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(highlights.size).toBe(0);
    expect(window.location.search).toBe("");
  });

  it("drops a word's highlight once it's fixed, and keeps the rest", async () => {
    document.body.innerHTML = editorBlock("a", "We recieve it untill noon.");
    go("?block=a&words=recieve%2Cuntill");
    renderHook(() => useScanTarget());
    expect(lit()).toEqual(["recieve", "untill"]);

    const p = document.querySelector('[data-id="a"] p')!;
    p.firstChild!.textContent = "We receive it untill noon.";
    await act(() => Promise.resolve()); // MutationObserver callbacks are microtasks

    expect(lit()).toEqual(["untill"]);
  });

  it("clears the highlight when the lesson page closes", () => {
    document.body.innerHTML = editorBlock("a", "Teh end");
    go("?block=a&words=Teh");
    const { unmount } = renderHook(() => useScanTarget());
    expect(highlights.has(SCAN_HIGHLIGHT)).toBe(true);

    unmount();

    expect(highlights.has(SCAN_HIGHLIGHT)).toBe(false);
  });

  it("still scrolls, without motion or highlight, where neither is available", () => {
    delete (CSS as { highlights?: unknown }).highlights;
    (window.matchMedia as jest.Mock).mockImplementation(() => ({
      matches: true,
    }));
    document.body.innerHTML = editorBlock("a", "Teh end");
    go("?block=a&words=Teh");

    renderHook(() => useScanTarget());

    expect(scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "auto",
    });
    expect(animate).not.toHaveBeenCalled();
  });

  it("does nothing without a target in the URL", () => {
    document.body.innerHTML = editorBlock("a", "Teh end");

    renderHook(() => useScanTarget());

    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("wordRanges", () => {
  it("matches case-sensitively and escapes the words", () => {
    const root = document.createElement("p");
    root.textContent = "Teh teh a.b axb";

    expect(wordRanges([root], ["Teh", "a.b"]).map(String)).toEqual([
      "Teh",
      "a.b",
    ]);
  });
});
