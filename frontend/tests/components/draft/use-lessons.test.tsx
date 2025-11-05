import { renderHook, act } from "@testing-library/react";
import { useLessons } from "@/components/draft/metadata/hooks/useLessons";
import { addLesson } from "@/lib/requests/lesson";

jest.mock("@/lib/requests/lesson", () => ({
  addLesson: jest.fn(),
}));

describe("useLessons", () => {
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
    lessons: [mockLesson],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with droplet lessons", () => {
    const { result } = renderHook(() => useLessons(mockDroplet));
    expect(result.current.lessons).toEqual(mockDroplet.lessons);
  });

  it("should handle adding new lesson successfully", async () => {
    const newLesson = {
      id: 3,
      attributes: { slug: "lesson-3" },
      name: "Lesson 3",
    };

    (addLesson as jest.Mock).mockResolvedValue({
      ok: true,
      data: newLesson,
    });

    const { result } = renderHook(() => useLessons(mockDroplet));

    await act(async () => {
      const response = await result.current.addNewLesson({ name: "Lesson 3" });
      expect(response).toEqual({ slug: "lesson-3" });
    });

    expect(result.current.lessons).toHaveLength(2);
    expect(result.current.lessons).toContain(newLesson);
  });

  it("should handle error when adding lesson", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    (addLesson as jest.Mock).mockResolvedValue({
      ok: false,
      error: "Failed to add lesson",
    });

    const { result } = renderHook(() => useLessons(mockDroplet));

    await act(async () => {
      await result.current.addNewLesson({ name: "Lesson 3" });
    });

    expect(consoleSpy).toHaveBeenCalled();
    expect(result.current.lessons).toHaveLength(1);

    consoleSpy.mockRestore();
  });

  it("initializes with droplet lessons", () => {
    const { result } = renderHook(() => useLessons(mockDroplet));
    expect(result.current.lessons).toEqual(mockDroplet.lessons);
  });

  it("initializes with empty array when no lessons", () => {
    const mockDroplet = {
      id: 1,
      lessons: undefined,
    };

    const { result } = renderHook(() => useLessons(mockDroplet));
    expect(result.current.lessons).toEqual([]);
  });

  it("updates lessons when droplet lessons change", () => {
    const { result, rerender } = renderHook((props) => useLessons(props), {
      initialProps: mockDroplet,
    });

    const updatedDroplet = {
      id: 1,
      lessons: [mockLesson],
    };

    rerender(updatedDroplet);
    expect(result.current.lessons).toEqual(updatedDroplet.lessons);
  });
});
