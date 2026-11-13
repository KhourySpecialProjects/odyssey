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

  it("lights in place once a lesson is finished today", () => {
    render(<StreakLessonBanner lessonCompleted />);
    setStreak(makeStreak({ current: 23 }));
    setStreak(makeStreak({ current: 24, litToday: true }));

    expect(
      screen.getByText("Day 24 · You earned the Spilling Sack!"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Come back tomorrow for day 25."),
    ).toBeInTheDocument();
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
