import { act, render } from "@testing-library/react";
import { DraftTour, TOUR_KEY } from "@/components/draft/draft-tour";
import {
  VoyageFormTour,
  VOYAGE_TOUR_KEY,
} from "@/components/voyages/voyage-form-tour";

const popover = () => document.querySelector(".driver-popover");
const click = (selector: string) =>
  act(() => {
    document.querySelector<HTMLElement>(selector)!.click();
  });

// A parent that never re-renders, like one unmounted by a browser back
const noRerender = () => jest.fn();

describe.each([
  ["DraftTour", DraftTour, TOUR_KEY],
  ["VoyageFormTour", VoyageFormTour, VOYAGE_TOUR_KEY],
])("%s", (_name, Tour, key) => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    document.body.innerHTML = "";
    document.body.className = "";
  });

  const start = (setRun = noRerender()) => {
    const view = render(<Tour run={true} setRun={setRun} />);
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(popover()).not.toBeNull();
    return { ...view, setRun };
  };

  it("removes the tour when it unmounts mid-tour", () => {
    const { unmount } = start();
    unmount();
    expect(popover()).toBeNull();
    expect(document.body).not.toHaveClass("driver-active");
  });

  it("closes on the X even if the parent doesn't re-render", () => {
    const { setRun } = start();
    click(".driver-popover-close-btn");
    expect(popover()).toBeNull();
    expect(setRun).toHaveBeenCalledWith(false);
    expect(localStorage.getItem(key)).toBe("completed");
  });

  it("closes on Done at the last step even if the parent doesn't re-render", () => {
    start();
    // Step through to the last step, whose next button reads "Done"
    for (let i = 0; i < 20; i++) {
      const next = document.querySelector<HTMLElement>(
        ".driver-popover-next-btn",
      );
      if (!next) break;
      act(() => {
        next.click();
        jest.runOnlyPendingTimers();
      });
    }
    expect(popover()).toBeNull();
    expect(localStorage.getItem(key)).toBe("completed");
  });

  it("closes on Escape", () => {
    start();
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keyup", { key: "Escape" }));
    });
    expect(popover()).toBeNull();
    expect(localStorage.getItem(key)).toBe("completed");
  });
});
