import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelResizeHandle } from "@/components/draft/review/panel-resize-handle";

beforeAll(() => {
  // jsdom has no PointerEvent, so button and clientX would be dropped
  window.PointerEvent = class extends MouseEvent {
    pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  } as never;
  Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);
  Element.prototype.releasePointerCapture = jest.fn();
  Element.prototype.setPointerCapture = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});
afterEach(() => jest.restoreAllMocks());

let flush: () => void;
const queueFrames = () => {
  const queue: FrameRequestCallback[] = [];
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    queue.push(cb);
    return queue.length;
  });
  flush = () => queue.splice(0).forEach((cb) => cb(0));
};

const setup = () => {
  const props = {
    width: 400,
    min: 384,
    max: 640,
    controls: "dock",
    label: "Reviewer Transcript",
    onResize: jest.fn(),
    onReset: jest.fn(),
    onDragChange: jest.fn(),
  };
  const view = render(<PanelResizeHandle {...props} />);
  const handle = screen.getByRole("separator", {
    name: "Resize Reviewer Transcript",
  });
  return { ...props, props, handle, ...view };
};

describe("PanelResizeHandle", () => {
  it("exposes the splitter attributes", () => {
    const { handle } = setup();
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "400");
    expect(handle).toHaveAttribute("aria-valuemin", "384");
    expect(handle).toHaveAttribute("aria-valuemax", "640");
    expect(handle).toHaveAttribute("aria-valuetext", "400 pixels wide");
    expect(handle).toHaveAttribute("aria-controls", "dock");
    expect(handle).toHaveAttribute("tabindex", "0");
  });

  it.each([
    ["{ArrowLeft}", 416],
    ["{Shift>}{ArrowLeft}{/Shift}", 464],
    ["{ArrowRight}", 384],
    ["{Home}", 384],
    ["{End}", 640],
  ])("%s asks for %i", async (keys, next) => {
    const { handle, onResize } = setup();
    handle.focus();
    await userEvent.keyboard(keys);
    expect(onResize).toHaveBeenCalledWith(next);
  });

  it("ignores up and down", async () => {
    const { handle, onResize } = setup();
    handle.focus();
    await userEvent.keyboard("{ArrowUp}{ArrowDown}");
    expect(onResize).not.toHaveBeenCalled();
  });

  it("drags: previews while moving and saves on release", () => {
    const { handle, onResize, onDragChange } = setup();

    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
    expect(document.body).toHaveClass("select-none");
    fireEvent.pointerMove(handle, { clientX: 900, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 900, pointerId: 1 });

    expect(onResize.mock.calls).toEqual([[500, false], [500]]);
    expect(onDragChange.mock.calls).toEqual([[true], [false]]);
    expect(document.body).not.toHaveClass("select-none");
  });

  it("ignores a non-primary button", () => {
    const { handle, onDragChange } = setup();
    fireEvent.pointerDown(handle, { button: 2, clientX: 1000, pointerId: 1 });
    expect(onDragChange).not.toHaveBeenCalled();
    expect(document.body).not.toHaveClass("select-none");
  });

  it("resets on double-click", async () => {
    const { handle, onReset } = setup();
    await userEvent.dblClick(handle);
    expect(onReset).toHaveBeenCalled();
  });

  it("cleans the body up when unmounted mid-drag", () => {
    const { handle, unmount } = setup();
    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
    unmount();
    expect(document.body).not.toHaveClass("select-none");
    expect(document.body.style.cursor).toBe("");
  });

  it.each(["{Meta>}{ArrowLeft}{/Meta}", "{Control>}{ArrowLeft}{/Control}"])(
    "leaves %s to the browser",
    async (keys) => {
      const { handle, onResize } = setup();
      handle.focus();
      await userEvent.keyboard(keys);
      expect(onResize).not.toHaveBeenCalled();
    },
  );

  it("captures the pointer by id", () => {
    const { handle } = setup();
    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 7 });
    expect(Element.prototype.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it.each([
    ["pointerUp", fireEvent.pointerUp],
    ["pointerCancel", fireEvent.pointerCancel],
    ["lostPointerCapture", fireEvent.lostPointerCapture],
  ])("%s ends the drag once and frees the body", (_n, fire) => {
    const { handle, onDragChange } = setup();
    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
    fire(handle, { pointerId: 1 });
    fire(handle, { pointerId: 1 });

    expect(onDragChange.mock.calls).toEqual([[true], [false]]);
    expect(document.body).not.toHaveClass("select-none");
    expect(document.body.style.cursor).toBe("");
  });

  it("saves the pointerup position, not a stale frame", () => {
    queueFrames();
    const { handle, onResize } = setup();
    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 990, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 900, pointerId: 1 });
    flush();
    expect(onResize).toHaveBeenLastCalledWith(500, false);

    fireEvent.pointerMove(handle, { clientX: 880, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 880, pointerId: 1 });
    flush();

    expect(onResize).toHaveBeenLastCalledWith(520);
    expect(onResize).not.toHaveBeenCalledWith(520, false);
  });

  it("saves nothing for a click without a move", () => {
    const { handle, onResize, onDragChange } = setup();
    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 1000, pointerId: 1 });

    expect(onResize).not.toHaveBeenCalled();
    expect(onDragChange).toHaveBeenLastCalledWith(false);
  });

  it("ignores a second pointer", () => {
    const { handle, onResize, onDragChange } = setup();
    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
    fireEvent.pointerDown(handle, { button: 0, clientX: 500, pointerId: 2 });
    fireEvent.pointerMove(handle, { clientX: 100, pointerId: 2 });
    fireEvent.pointerUp(handle, { clientX: 100, pointerId: 2 });

    expect(onDragChange.mock.calls).toEqual([[true]]);
    expect(onResize).not.toHaveBeenCalled();
  });

  it("ends the drag state if unmounted mid-drag", () => {
    const { handle, unmount, onDragChange } = setup();
    fireEvent.pointerDown(handle, { button: 0, clientX: 1000, pointerId: 1 });
    unmount();
    expect(onDragChange).toHaveBeenLastCalledWith(false);
  });

  it("shows the bar while dragging", () => {
    const { handle, rerender, props } = setup();
    expect(handle).toHaveAttribute("data-dragging", "false");
    rerender(<PanelResizeHandle {...props} dragging />);
    expect(handle).toHaveAttribute("data-dragging", "true");
    expect(handle.firstElementChild).toHaveClass("bg-[#2D7597]");
  });
});
