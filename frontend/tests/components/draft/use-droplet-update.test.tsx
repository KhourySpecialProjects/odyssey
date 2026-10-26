import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useDropletUpdate } from "@/components/draft/metadata/hooks/useDropletUpdate";
import { updateDroplet } from "@/lib/requests/droplet";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/lib/requests/droplet", () => ({
  updateDroplet: jest.fn(),
}));

describe("useDropletUpdate", () => {
  const mockRouter = {
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("should handle successful update", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      error: null,
      data: { attributes: { slug: "new-slug" } },
    });

    const { result } = renderHook(() => useDropletUpdate(1));

    await act(async () => {
      result.current.handleChange({ name: "New Name" });
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(updateDroplet).toHaveBeenCalledWith(1, { name: "New Name" });
    expect(mockRouter.replace).toHaveBeenCalledWith("/draft/d/new-slug");
    expect(result.current.error).toBe("");
  });

  it("shows the freeze sentence when the save is refused for review", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      ok: false,
      error: "in_review",
      data: null,
    });

    const { result } = renderHook(() => useDropletUpdate(1));

    await act(async () => {
      result.current.handleChange({ description: "x" });
    });

    await waitFor(
      () =>
        expect(result.current.error).toBe(
          "In review. Editing is paused until the reviewer sends it back.",
        ),
      { timeout: 4000 },
    );
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it("keeps the generic message for other failures", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      ok: false,
      error: "boom",
      data: null,
    });

    const { result } = renderHook(() => useDropletUpdate(1));

    await act(async () => {
      result.current.handleChange({ name: "x" });
    });

    await waitFor(
      () =>
        expect(result.current.error).toBe(
          "A droplet with a similar title is in progress or already exists.",
        ),
      { timeout: 4000 },
    );
  });
});
