import { renderHook, act } from "@testing-library/react";
import { useLessonOrder } from "@/components/draft/metadata/hooks/useLessonOrder";
import { Lesson } from "@/types";
import { updateLesson } from "@/lib/requests/lesson";

jest.mock('@/lib/requests/lesson', () => ({
  updateLesson: jest.fn().mockResolvedValue({ ok: true }),
}));

describe("useLessonOrder", () => {
  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    droplets: [],
    notes: [],
    orderIndex: 1,
    blocks: [
      {
        id: 1,
        __component: "droplets.generic",
        content: "Generic content",
      },
      {
        id: 2,
        __component: "droplets.expandable",
        title: "Expandable title",
        content: "Expandable content",
      },
      {
        id: 3,
        __component: "droplets.video",
        url: "https://example.com/video",
      },
      {
        id: 4,
        __component: "droplets.callout",
        content: "Callout content",
        type: "info",
        color: "bg-sky-50",
      },
      {
        id: 5,
        __component: "droplets.quiz",
        questions: [
          {
            id: 1,
            content: "Quiz question",
            answerOptions: [
              { id: 1, content: "Option 1", isCorrect: true },
              { id: 2, content: "Option 2", isCorrect: false },
            ],
          },
        ],
      },
      {
        id: 6,
        __component: "droplets.open-ended-quiz",
        questions: [
          {
            id: 1,
            content: "Open ended question",
            correctAnswer: "Correct answer",
          },
        ],
      },
    ],
  };
  const mockDroplet = {
    id: 1,
    lessons: [
      { id: 1, orderIndex: 0 },
      { id: 2, orderIndex: 1 },
    ] as Lesson[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should handle lesson reordering", async () => {
    (updateLesson as jest.Mock).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    const newOrder = [
      { ...mockLesson, id: 2, orderIndex: 0 },
      { ...mockLesson, id: 1, orderIndex: 1 },
    ];

    await act(async () => {
      result.current.handleLessonReorder(newOrder);
    });

    expect(updateLesson).toHaveBeenCalledWith(
      1,
      {
        lessons: newOrder.map((dl, index) => ({
          id: dl.id,
          orderIndex: index,
        })),
      },
      { revalidate: true },
    );
  });

  it("should handle update error", async () => {
    (updateLesson as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Error",
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    await act(async () => {
      result.current.handleLessonReorder([
        { ...mockLesson, id: 2, orderIndex: 0 },
        { ...mockLesson, id: 1, orderIndex: 1 },
      ]);
    });

    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("should call processQueue when orderQueue length is greater than 0", async () => {
    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    const newOrder = [
      { ...mockLesson, id: 1, orderIndex: 1 },
      { ...mockLesson, id: 2, orderIndex: 0 },
    ];

    act(() => {
      result.current.handleLessonReorder(newOrder);
    });

    expect(updateLesson).toHaveBeenCalled();
  });

  jest.mock("@/lib/requests/lesson", () => ({
    updateLesson: jest.fn(),
  }));

  test("processes multiple queue items sequentially", async () => {
    (updateLesson as jest.Mock).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    await act(async () => {
      result.current.handleLessonReorder([
        { ...mockLesson, id: 2, orderIndex: 0 },
        { ...mockLesson, id: 1, orderIndex: 1 },
      ]);
    });

    await act(async () => {
      result.current.handleLessonReorder([
        { ...mockLesson, id: 1, orderIndex: 0 },
        { ...mockLesson, id: 2, orderIndex: 1 },
      ]);
    });

    expect(updateLesson).toHaveBeenLastCalledWith(
      1,
      {
        lessons: [
          { id: 1, orderIndex: 0 },
          { id: 2, orderIndex: 1 },
        ],
      },
      { revalidate: true },
    );
  });
});
