import { renderHook, act, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import {
  settleDropletUpdates,
  useDropletUpdate,
} from "@/components/draft/metadata/hooks/useDropletUpdate";
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

  describe("settleDropletUpdates (ODY-806: Stop editing on the Overview)", () => {
    it("sends a change still waiting out its debounce, and resolves once it's saved", async () => {
      let saved = () => {};
      (updateDroplet as jest.Mock).mockReturnValue(
        new Promise((resolve) => {
          saved = () => resolve({ error: null, data: { attributes: {} } });
        }),
      );
      const { result } = renderHook(() => useDropletUpdate(1));
      act(() => result.current.handleChange({ overview: "<p>New</p>" }));

      let settled = false;
      const settling = settleDropletUpdates().then(() => (settled = true));
      expect(updateDroplet).toHaveBeenCalledWith(1, { overview: "<p>New</p>" });
      await act(async () => {});
      expect(settled).toBe(false);

      await act(async () => saved());
      await settling;
      expect(settled).toBe(true);
    });

    it("sends a waiting change when its editor closes", () => {
      (updateDroplet as jest.Mock).mockResolvedValue({
        error: null,
        data: { attributes: {} },
      });
      const { result, unmount } = renderHook(() => useDropletUpdate(1));
      act(() => result.current.handleChange({ description: "Closed" }));

      unmount();

      expect(updateDroplet).toHaveBeenCalledWith(1, { description: "Closed" });
    });

    it("resolves at once with nothing to save", async () => {
      await expect(settleDropletUpdates()).resolves.toBeUndefined();
      expect(updateDroplet).not.toHaveBeenCalled();
    });
  });
});
