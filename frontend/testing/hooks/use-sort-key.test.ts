import { renderHook } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { useSortKey } from "@/hooks/use-sort-key";
import { playlistSorting } from "@/lib/globals";

jest.mock("next/navigation", () => ({
  useSearchParams: jest.fn(),
}));

describe("useSortKey", () => {
  it("resolves the live ?sort= param to its sort key", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("sort=rating:desc"),
    );
    const { result } = renderHook(() => useSortKey("name:asc"));
    expect(result.current).toBe("rating:desc");
  });

  it("falls back to the server sort key when the URL has no sort", () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    const { result } = renderHook(() => useSortKey("name:desc"));
    expect(result.current).toBe("name:desc");
  });

  it("falls back to the server sort key for an unknown slug", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("sort=bogus"),
    );
    const { result } = renderHook(() => useSortKey("name:asc"));
    expect(result.current).toBe("name:asc");
  });

  it("handles a missing router context", () => {
    (useSearchParams as jest.Mock).mockReturnValue(null);
    const { result } = renderHook(() => useSortKey("name:asc"));
    expect(result.current).toBe("name:asc");
  });

  it("only matches slugs from the given options", () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams("sort=completion:desc"),
    );
    const { result } = renderHook(() =>
      useSortKey("name:asc", playlistSorting),
    );
    expect(result.current).toBe("name:asc");
  });
});
