import { act, renderHook } from "@testing-library/react";
import {
  clampPanelWidth,
  maxPanelWidth,
  usePanelWidth,
} from "@/hooks/use-panel-width";

const KEY = "review-panel-width";

const setViewport = (width: number) => {
  Object.defineProperty(document.documentElement, "clientWidth", {
    value: width,
    configurable: true,
  });
  window.dispatchEvent(new Event("resize"));
};

beforeEach(() => {
  localStorage.clear();
  setViewport(1500);
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});
afterEach(() => jest.restoreAllMocks());

describe("maxPanelWidth", () => {
  it.each([
    [1280, 0, 640],
    [1440, 256, 544],
    [1920, 256, 720],
    [1000, 0, 384],
  ])("viewport %i with %i reserved allows %i", (viewport, reserved, max) => {
    expect(maxPanelWidth(viewport, reserved)).toBe(max);
  });
});

describe("clampPanelWidth", () => {
  it.each([
    [100, 600, 384],
    [900, 600, 600],
    [450.6, 600, 451],
  ])("clamps %d to %d max as %d", (w, max, expected) => {
    expect(clampPanelWidth(w, max)).toBe(expected);
  });
});

describe("usePanelWidth", () => {
  it("reads the stored width after mount", () => {
    localStorage.setItem(KEY, "500");
    const { result } = renderHook(() => usePanelWidth(KEY));
    expect(result.current.width).toBe(500);
  });

  it("renders 384 first even when 500 is stored (no hydration mismatch)", () => {
    localStorage.setItem(KEY, "500");
    const seen: number[] = [];
    renderHook(() => {
      const { width } = usePanelWidth(KEY);
      seen.push(width);
    });
    expect(seen[0]).toBe(384);
    expect(seen).toContain(500);
  });

  it("ignores the window when disabled", () => {
    const { result } = renderHook(() => usePanelWidth(KEY, 0, false));
    expect(result.current.max).toBe(720);
  });

  it("starts at 384 with nothing stored", () => {
    const { result } = renderHook(() => usePanelWidth(KEY));
    expect(result.current.width).toBe(384);
  });

  it.each([
    ["abc", 384],
    ["-5", 384],
    ["9999", 720],
  ])("stored %s gives %i", (stored, expected) => {
    localStorage.setItem(KEY, stored);
    const { result } = renderHook(() => usePanelWidth(KEY));
    expect(result.current.width).toBe(expected);
  });

  it("saves only when asked", () => {
    const { result } = renderHook(() => usePanelWidth(KEY));
    act(() => result.current.setWidth(500, false));
    expect(result.current.width).toBe(500);
    expect(localStorage.getItem(KEY)).toBeNull();
    act(() => result.current.setWidth(500));
    expect(localStorage.getItem(KEY)).toBe("500");
  });

  it("resets to 384 and saves it", () => {
    localStorage.setItem(KEY, "500");
    const { result } = renderHook(() => usePanelWidth(KEY));
    act(() => result.current.reset());
    expect(result.current.width).toBe(384);
    expect(localStorage.getItem(KEY)).toBe("384");
  });

  it("clamps to a smaller window without overwriting the preference", () => {
    localStorage.setItem(KEY, "500");
    const { result } = renderHook(() => usePanelWidth(KEY));

    act(() => setViewport(1100));
    expect(result.current.width).toBe(460);
    expect(localStorage.getItem(KEY)).toBe("500");

    act(() => setViewport(1500));
    expect(result.current.width).toBe(500);
  });

  it("lowers the maximum by the reserved width", () => {
    const { result } = renderHook(() => usePanelWidth(KEY, 256));
    expect(result.current.max).toBe(604);
  });

  it("doesn't crash when storage throws", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const { result } = renderHook(() => usePanelWidth(KEY));
    act(() => result.current.setWidth(500));
    expect(result.current.width).toBe(500);
  });
});
