import { renderHook } from "@testing-library/react";
import { useScrollToBlock } from "@/hooks/use-scroll-to-block";

const setSearch = (q: string) => window.history.replaceState({}, "", `/x${q}`);

const addBlock = (id: string) => {
  const el = document.createElement("div");
  el.setAttribute("data-node-type", "blockContainer");
  el.setAttribute("data-id", id);
  el.scrollIntoView = jest.fn();
  document.body.appendChild(el);
  return el;
};

beforeEach(() => {
  jest.useFakeTimers();
  setSearch("?block=b1");
  window.matchMedia = jest.fn().mockReturnValue({ matches: false });
});
afterEach(() => {
  document.body.innerHTML = "";
  jest.useRealTimers();
});

describe("useScrollToBlock", () => {
  it("scrolls to and highlights the block once it appears", () => {
    renderHook(() => useScrollToBlock());
    jest.advanceTimersByTime(300);
    const el = addBlock("b1");
    jest.advanceTimersByTime(100);
    expect(el.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(el.classList.contains("review-mark--flash")).toBe(true);
    jest.advanceTimersByTime(1000);
    expect(el.classList.contains("review-mark--flash")).toBe(false);
  });

  it("scrolls without the highlight under reduced motion", () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    const el = addBlock("b1");
    renderHook(() => useScrollToBlock());
    expect(el.scrollIntoView).toHaveBeenCalledWith({
      block: "center",
      behavior: "auto",
    });
    expect(el.classList.contains("review-mark--flash")).toBe(false);
  });

  it("does nothing without a block param", () => {
    setSearch("");
    const el = addBlock("b1");
    renderHook(() => useScrollToBlock());
    jest.advanceTimersByTime(10000);
    expect(el.scrollIntoView).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("stops polling after its timeout", () => {
    renderHook(() => useScrollToBlock());
    jest.advanceTimersByTime(10000);
    expect(jest.getTimerCount()).toBe(0);
    const el = addBlock("b1");
    jest.advanceTimersByTime(1000);
    expect(el.scrollIntoView).not.toHaveBeenCalled();
  });

  it("stops polling on unmount", () => {
    const { unmount } = renderHook(() => useScrollToBlock());
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
