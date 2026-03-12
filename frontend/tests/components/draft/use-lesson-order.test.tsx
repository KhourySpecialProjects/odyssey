import { renderHook, act, waitFor } from "@testing-library/react";
import { useLessonOrder } from "@/components/draft/metadata/hooks/useLessonOrder";
import { Lesson } from "@/types";
import { updateLesson } from "@/lib/requests/lesson";

jest.mock("@/lib/requests/lesson", () => ({
  updateLesson: jest.fn().mockResolvedValue({ ok: true }),
}));

describe("useLessonOrder", () => {
  const mockLesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    type: "standard",
    droplets: [],
    notes: "",
    orderIndex: 1,
    blocks: [
      {
        id: 1,
        __component: "droplets.generic" as const,
        content: "Generic content",
      },
      {
        id: 2,
        __component: "droplets.expandable" as const,
        title: "Expandable title",
        content: "Expandable content",
      },
      {
        id: 3,
        __component: "droplets.video" as const,
        url: "https://example.com/video",
      },
      {
        id: 4,
        __component: "droplets.callout" as const,
        content: [
          {
            type: "paragraph",
            children: [{ type: "text", text: "Callout content" }],
          },
        ],
        type: "info",
        color: "bg-sky-50",
      },
      {
        id: 5,
        __component: "droplets.quiz" as const,
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
        __component: "droplets.open-ended-quiz" as const,
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

  it("initializes with droplet lessons", () => {
    const { result } = renderHook(() => useLessonOrder(mockDroplet));
    expect(result.current.dropletLessons).toEqual(mockDroplet.lessons);
  });

  it("calls updateLesson for each reordered lesson", async () => {
    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    const newOrder = [
      {
        id: 2,
        name: "Test Lesson",
        slug: "test-lesson",
        type: "standard",
        blocks: [],
        droplets: [],
        notes: "",
        orderIndex: 0,
      },
      {
        id: 1,
        name: "Test Lesson",
        slug: "test-lesson",
        type: "standard",
        blocks: [],
        droplets: [],
        notes: "",
        orderIndex: 1,
      },
    ];

    await act(async () => {
      result.current.handleLessonReorder(newOrder);
    });

    await waitFor(() => {
      expect(updateLesson).toHaveBeenCalledTimes(2);
    });

    expect(updateLesson).toHaveBeenNthCalledWith(1, 2, { orderIndex: 0 });
    expect(updateLesson).toHaveBeenNthCalledWith(2, 1, { orderIndex: 1 });
  });

  it("sets isProcessing true while processing", async () => {
    const { result } = renderHook(() => useLessonOrder(mockDroplet));

    const newOrder: Lesson[] = [
      {
        id: 2,
        name: "Test Lesson",
        slug: "test-lesson",
        type: "standard",
        blocks: [],
        droplets: [],
        notes: "",
        orderIndex: 0,
      },
      {
        id: 1,
        name: "Test Lesson",
        slug: "test-lesson",
        type: "standard",
        blocks: [],
        droplets: [],
        notes: "",
        orderIndex: 1,
      },
    ];

    act(() => {
      result.current.handleLessonReorder(newOrder);
    });

    expect(result.current.isProcessing).toBe(true);

    await waitFor(() => expect(result.current.isProcessing).toBe(false));
  });
});
