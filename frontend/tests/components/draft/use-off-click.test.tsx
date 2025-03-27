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
});
