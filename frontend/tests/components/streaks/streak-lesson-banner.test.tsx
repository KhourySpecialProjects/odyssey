import { act, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import {
  refreshStreakAfterLesson,
  StreakLessonBanner,
} from "@/components/streaks/streak-lesson-banner";
import { getMyStreak } from "@/lib/requests/streaks";
import { useStreakStore } from "@/stores/streak-store";
import { makeStreak } from "@/testing/mocks/streakMock";

jest.mock("sonner", () => ({ toast: { success: jest.fn() } }));
jest.mock("@/lib/requests/streaks", () => ({ getMyStreak: jest.fn() }));

const mockedGetMyStreak = jest.mocked(getMyStreak);
const setStreak = (streak: ReturnType<typeof makeStreak>) =>
  act(() => useStreakStore.setState({ streak }));

const mockReducedMotion = (reduce: boolean) => {
  window.matchMedia = jest.fn().mockReturnValue({
    matches: reduce,
  }) as unknown as typeof window.matchMedia;
};

afterEach(() => {
  // @ts-expect-error jsdom has no matchMedia
  delete window.matchMedia;
});

beforeEach(() => {
  jest.clearAllMocks();
  useStreakStore.setState({ streak: null });
});

describe("StreakLessonBanner", () => {
  it("shows nothing until the header has the streak", () => {
    const { container } = render(
      <StreakLessonBanner lessonCompleted={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    [
      false,
      "Finish this lesson to keep your streak",
      "Day 24 unlocks Spilling Sack.",
    ],
    [
      true,
      "Finish a new lesson to keep your streak",
      "Day 24 unlocks Spilling Sack.",
    ],
  ])(
    "before today is lit (lesson done %s) says what finishing one unlocks",
    (lessonCompleted, title, detail) => {
      render(<StreakLessonBanner lessonCompleted={lessonCompleted} />);
      setStreak(makeStreak({ current: 23 }));

      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.getByText(detail)).toBeInTheDocument();
    },
  );

  it("before today is lit shows the greyed treasure, then the next one", () => {
    const { container } = render(<StreakLessonBanner lessonCompleted />);
    setStreak(makeStreak({ current: 23 }));

    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveClass("grayscale");
    expect(images[1]).not.toHaveClass("grayscale");
  });

  it.each([
    [24, "Day 24 · You earned the Spilling Sack!", "2 days to the Two Sacks"],
    [7, "Day 7 · A whole week!", "2 of 3 days to the Big Pile"],
    [100, "Day 100 · The final treasure is yours!", null],
  ])(
    "once day %i is lit shows one full-colour treasure, the day and %p",
    (current, title, progress) => {
      mockReducedMotion(true);
      const { container } = render(<StreakLessonBanner lessonCompleted />);
      setStreak(makeStreak({ current: current - 1 }));
      setStreak(makeStreak({ current, litToday: true }));

      const images = container.querySelectorAll("img");
      expect(images).toHaveLength(1);
      expect(images[0]).not.toHaveClass("grayscale");
      expect(screen.getByText(String(current))).toBeInTheDocument();
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.queryByText(/days to the/)?.textContent ?? null).toBe(
        progress,
      );
    },
  );

  it.each([
    ["lights here", true, false, 6, "5", true],
    ["was already lit when the lesson opened", false, false, 6, "6", false],
    ["lights here with reduced motion", true, true, 6, "6", false],
    ["lights day 1 here, with no day 0", true, false, 1, "1", true],
  ])(
    "when the streak %s, the count starts right and animates only then",
    (_, lightsHere, reduce, current, first, animated) => {
      jest.useFakeTimers();
      mockReducedMotion(reduce);
      const { container } = render(<StreakLessonBanner lessonCompleted />);
      if (lightsHere) setStreak(makeStreak({ current: current - 1 }));
      setStreak(makeStreak({ current, litToday: true }));

      expect(screen.getByText(first)).toBeInTheDocument();
      expect(!!container.querySelector(".animate-in")).toBe(animated);
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(screen.getByText(String(current))).toBeInTheDocument();
      jest.useRealTimers();
    },
  );

  it("keeps one status region as the streak lights, so it's read out", () => {
    render(<StreakLessonBanner lessonCompleted />);
    setStreak(makeStreak({ current: 2 }));
    const region = screen.getByRole("status");

    setStreak(makeStreak({ current: 3, litToday: true }));

    expect(screen.getByRole("status")).toBe(region);
    expect(region).toHaveTextContent("Day 3 · You earned the Three Coins!");
  });
});

describe("refreshStreakAfterLesson", () => {
  const lit = makeStreak({ current: 24, litToday: true });

  it("does nothing once today is already lit", async () => {
    useStreakStore.setState({ streak: lit });

    await refreshStreakAfterLesson({ announce: true });

    expect(mockedGetMyStreak).not.toHaveBeenCalled();
  });

  it.each([
    [true, 1],
    [false, 0],
  ])(
    "lights the streak, with a toast when announce is %s",
    async (announce, toasts) => {
      useStreakStore.setState({ streak: makeStreak({ current: 23 }) });
      mockedGetMyStreak.mockResolvedValue({ ok: true, error: null, data: lit });

      await refreshStreakAfterLesson({ announce });

      expect(useStreakStore.getState().streak).toBe(lit);
      expect(toast.success).toHaveBeenCalledTimes(toasts);
      if (toasts) {
        expect(toast.success).toHaveBeenCalledWith(
          "Day 24 · You earned the Spilling Sack!",
          expect.objectContaining({
            description: "Come back tomorrow for day 25.",
          }),
        );
      }
    },
  );

  it.each([
    ["a refused read", async () => ({ ok: false, error: "x", data: null })],
    [
      "a rejected call",
      async () => {
        throw new Error("network");
      },
    ],
  ])("keeps the streak it had after %s", async (_, read) => {
    const before = makeStreak({ current: 23 });
    useStreakStore.setState({ streak: before });
    mockedGetMyStreak.mockImplementation(read as never);

    await refreshStreakAfterLesson({ announce: true });

    expect(useStreakStore.getState().streak).toBe(before);
    expect(toast.success).not.toHaveBeenCalled();
  });
});
