import { renderHook, act } from "@testing-library/react";
import { updateDroplet } from "@/lib/actions";
import { useLessonOrder } from "@/components/draft/metadata/hooks/useLessonOrder";
import { DropletLesson } from "@/types";

jest.mock("@/lib/actions");

describe("useLessonOrder", () => {
  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    droplet_lessons: [],
    droplets: [],
    notes: [],
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
    droplet_lessons: [
      { id: 1, orderIndex: 0, lesson: mockLesson },
      { id: 2, orderIndex: 1, lesson: mockLesson },
    ] as DropletLesson[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with droplet lessons", () => {
    const { result } = renderHook(() => useLessonOrder(mockDroplet));
    expect(result.current.dropletLessons).toEqual(mockDroplet.droplet_lessons);
  });

  it("should handle lesson reordering", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    const newOrder = [
      { id: 2, orderIndex: 0, lesson: mockLesson },
      { id: 1, orderIndex: 1, lesson: mockLesson },
    ];

    await act(async () => {
      result.current.handleLessonReorder(newOrder);
    });

    expect(updateDroplet).toHaveBeenCalledWith(
      1,
      {
        droplet_lessons: newOrder.map((dl, index) => ({
          id: dl.id,
          orderIndex: index,
        })),
      },
      { revalidate: true },
    );
  });

  it("should handle update error", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Error",
    });
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    await act(async () => {
      result.current.handleLessonReorder([
        { id: 2, orderIndex: 0, lesson: mockLesson },
        { id: 1, orderIndex: 1, lesson: mockLesson },
      ]);
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.dropletLessons).toEqual(mockDroplet.droplet_lessons);

    consoleSpy.mockRestore();
  });

  it("processes queue items in order", async () => {
    (updateDroplet as jest.Mock).mockResolvedValue({ ok: true });

    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    await act(async () => {
      result.current.handleLessonReorder([
        { id: 2, orderIndex: 0, lesson: mockLesson },
        { id: 1, orderIndex: 1, lesson: mockLesson },
      ]);
      result.current.handleLessonReorder([
        { id: 1, orderIndex: 0, lesson: mockLesson },
        { id: 2, orderIndex: 1, lesson: mockLesson },
      ]);
    });

    expect(updateDroplet).toHaveBeenLastCalledWith(
      1,
      {
        droplet_lessons: [
          { id: 2, orderIndex: 0 },
          { id: 1, orderIndex: 1 },
        ],
      },
      { revalidate: true },
    );
  });
});
