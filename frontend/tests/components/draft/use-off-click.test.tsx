import { useOffClick } from "@/components/draft/metadata/hooks/useOffClick";
import { renderHook, act } from "@testing-library/react";

describe("useOffClick", () => {
  let mockRef: { current: { contains: jest.Mock } | null };

  beforeEach(() => {
    mockRef = {
      current: {
        contains: jest.fn(),
      },
    };
  });

  it("should handle click outside", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useOffClick(mockRef as any, mockCallback),
    );

    act(() => {
      result.current.setOpen(true);
    });

    expect(result.current.open).toBe(true);

    mockRef.current!.contains.mockReturnValue(false);

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown"));
    });

    expect(result.current.open).toBe(false);
    expect(mockCallback).toHaveBeenCalled();
  });

  it("should not trigger when clicking inside", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useOffClick(mockRef as any, mockCallback),
    );

    act(() => {
      result.current.setOpen(true);
    });

    mockRef.current!.contains.mockReturnValue(true);

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown"));
    });

    expect(result.current.open).toBe(true);
    expect(mockCallback).not.toHaveBeenCalled();
  });

  it("should have an initial state of open as false", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useOffClick(mockRef as any, mockCallback),
    );

    expect(result.current.open).toBe(false);
  });

  it("should clean up event listener on unmount", () => {
    const mockCallback = jest.fn();
    const addEventListenerSpy = jest.spyOn(document, "addEventListener");
    const removeEventListenerSpy = jest.spyOn(document, "removeEventListener");

    const { unmount } = renderHook(() =>
      useOffClick(mockRef as any, mockCallback),
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "mousedown",
      expect.any(Function),
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "mousedown",
      expect.any(Function),
    );
  });

  it("should not trigger if ref.current is null", () => {
    const mockCallback = jest.fn();
    const { result } = renderHook(() =>
      useOffClick({ current: null }, mockCallback),
    );

    act(() => {
      result.current.setOpen(true);
      document.dispatchEvent(new MouseEvent("mousedown"));
    });

    expect(mockCallback).not.toHaveBeenCalled();
    expect(result.current.open).toBe(true);
  });
});
