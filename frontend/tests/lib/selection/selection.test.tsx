import { act, fireEvent, render, renderHook } from "@testing-library/react";
import { useRef } from "react";
import {
  anchorIn,
  placeAt,
  placePopover,
  readSelection,
  SELECTION_DELAY_MS,
  useDismiss,
  useSelectionChange,
} from "@/lib/selection";

const rect = (top: number, left: number, width: number, height: number) =>
  ({
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
  }) as DOMRect;

function select(node: Node, from: number, toNode: Node, to: number) {
  const range = document.createRange();
  range.setStart(node, from);
  range.setEnd(toNode, to);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
}

afterEach(() => {
  window.getSelection()?.removeAllRanges();
  document.body.innerHTML = "";
});

describe("readSelection", () => {
  const mount = () => {
    document.body.innerHTML =
      '<p id="outside">before</p><div id="box"><p>one <code>two</code> three</p></div>';
    return {
      box: document.getElementById("box")!,
      outside: document.getElementById("outside")!.firstChild!,
    };
  };

  it("is none with nothing selected", () => {
    const { box } = mount();
    expect(readSelection(box)).toEqual({ kind: "none" });
  });

  it("is none for a caret", () => {
    const { box } = mount();
    const text = box.querySelector("p")!.firstChild!;
    select(text, 2, text, 2);
    expect(readSelection(box)).toEqual({ kind: "none" });
  });

  it("is outside when the selection starts outside the container", () => {
    const { box, outside } = mount();
    select(outside, 1, box.querySelector("p")!.firstChild!, 2);
    expect(readSelection(box)).toEqual({ kind: "outside" });
  });

  it("returns the range and text for a selection inside, across inline code", () => {
    const { box } = mount();
    const p = box.querySelector("p")!;
    select(p.firstChild!, 0, p.lastChild!, 3);

    const result = readSelection(box);

    expect(result.kind).toBe("inside");
    if (result.kind !== "inside") return;
    expect(result.text).toBe("one two th");
    expect(result.range.startContainer).toBe(p.firstChild);
  });
});

describe("anchorIn", () => {
  it("measures a rect from the parent's top left", () => {
    const parent = document.createElement("div");
    parent.getBoundingClientRect = () => rect(100, 50, 400, 300);

    expect(anchorIn(parent, rect(130, 90, 40, 20))).toEqual({
      top: 30,
      bottom: 50,
      centerX: 60,
    });
  });
});

describe("placeAt", () => {
  const base = {
    anchor: { top: 200, bottom: 220, centerX: 150 },
    width: 100,
    height: 30,
    parentWidth: 600,
    parentTop: 0,
    headerBottom: 64,
  };

  it("goes above the anchor, centred", () => {
    expect(placeAt(base)).toEqual({ left: 100, top: 162 });
  });

  it("goes below the anchor when above would be under the site header", () => {
    expect(
      placeAt({ ...base, anchor: { top: 80, bottom: 100, centerX: 150 } }),
    ).toEqual({ left: 100, top: 108 });
  });

  it("stays inside the parent at either edge", () => {
    expect(
      placeAt({ ...base, anchor: { ...base.anchor, centerX: 10 } }).left,
    ).toBe(0);
    expect(
      placeAt({ ...base, anchor: { ...base.anchor, centerX: 590 } }).left,
    ).toBe(500);
  });

  it("measures the real header for a rendered popover", () => {
    document.body.innerHTML =
      '<header class="sticky top-0 z-50"></header><div id="parent"><div id="pop"></div></div>';
    const header = document.querySelector("header")!;
    header.getBoundingClientRect = () => rect(0, 0, 1000, 64);
    const parent = document.getElementById("parent")!;
    parent.getBoundingClientRect = () => rect(0, 0, 600, 400);
    Object.defineProperty(parent, "clientWidth", { value: 600 });
    const pop = document.getElementById("pop")!;
    Object.defineProperty(pop, "offsetWidth", { value: 100 });
    Object.defineProperty(pop, "offsetHeight", { value: 30 });

    expect(placePopover(pop, { top: 80, bottom: 100, centerX: 150 })).toEqual({
      left: 100,
      top: 108,
    });
  });
});

describe("useSelectionChange", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const fire = () => document.dispatchEvent(new Event("selectionchange"));

  it("waits for the selection to settle, then calls once", () => {
    const onChange = jest.fn();
    renderHook(() => useSelectionChange(onChange));

    fire();
    act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS - 1));
    fire();
    act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS - 1));
    expect(onChange).not.toHaveBeenCalled();

    act(() => jest.advanceTimersByTime(1));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("calls the latest callback", () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(({ cb }) => useSelectionChange(cb), {
      initialProps: { cb: first },
    });
    rerender({ cb: second });

    fire();
    act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("does nothing when disabled, and stops on unmount", () => {
    const onChange = jest.fn();
    const { rerender, unmount } = renderHook(
      ({ on }) => useSelectionChange(onChange, on),
      { initialProps: { on: false } },
    );
    fire();
    act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS));
    expect(onChange).not.toHaveBeenCalled();

    rerender({ on: true });
    fire();
    unmount();
    act(() => jest.advanceTimersByTime(SELECTION_DELAY_MS));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("useDismiss", () => {
  function Popover({ onClose }: { onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    useDismiss(ref, onClose);
    return (
      <div>
        <div ref={ref} data-testid="pop">
          <button type="button">inside</button>
        </div>
        <p data-testid="out">outside</p>
      </div>
    );
  }

  it("closes on Escape and on a pointer down outside, not inside", () => {
    const onClose = jest.fn();
    const { getByTestId, getByRole } = render(<Popover onClose={onClose} />);

    fireEvent.pointerDown(getByRole("button", { name: "inside" }));
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.pointerDown(getByTestId("out"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
