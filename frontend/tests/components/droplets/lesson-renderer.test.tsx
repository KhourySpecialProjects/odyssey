import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import {
  createHighlight,
  deleteHighlight,
  getHighlights,
  getHighlightsByAuthorizedUserAndLesson,
} from "@/lib/requests/highlights";
import { createNote } from "@/lib/requests/notes";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { AuthorizedUser, Highlight, Lesson } from "@/types";

jest.mock("@/lib/requests/highlights", () => ({
  createHighlight: jest.fn(),
  deleteHighlight: jest.fn(),
  getHighlights: jest.fn(),
  getHighlightsByAuthorizedUserAndLesson: jest.fn(),
}));

jest.mock("@/lib/requests/notes", () => ({
  createNote: jest.fn(),
}));

jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollByID: jest.fn(),
}));

jest.mock("posthog-js", () => ({
  __esModule: true,
  default: { init: jest.fn(), identify: jest.fn(), capture: jest.fn() },
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// Stand-in that exposes the highlight list and the highlight/note callbacks
jest.mock("@/components/droplets/lessons/generic-block-renderer", () => ({
  __esModule: true,
  default: ({
    highlights,
    onHighlight,
    onDeleteHighlight,
    onNote,
  }: {
    highlights: Highlight[];
    onHighlight: (highlight: Highlight, isWithNote?: boolean) => void;
    onDeleteHighlight: (id: number) => void;
    onNote: (notePos: number, text: string) => void;
  }) => (
    <div>
      <ul data-testid="highlights">
        {highlights.map((h) => (
          <li key={h.id}>{h.text}</li>
        ))}
      </ul>
      <button
        onClick={() =>
          onHighlight({
            text: "New highlight",
            color: "#86efac",
            position: { start: 0, end: 3 },
            blockId: 1,
          })
        }
      >
        Highlight
      </button>
      <button onClick={() => onDeleteHighlight(7)}>Delete highlight</button>
      <button onClick={() => onNote(120, "Server highlight")}>Add note</button>
    </div>
  ),
}));

jest.mock("@/components/droplets/lessons/highlight-dropdown", () => ({
  HighlightDropdown: () => null,
}));
jest.mock("@/components/droplets/lessons/highlight-hint-banner", () => ({
  HighlightHintBanner: () => null,
}));
jest.mock("@/components/droplets/lessons/quiz", () => ({
  QuizBlock: () => null,
}));
jest.mock("@/components/droplets/lessons/open-ended-quiz", () => ({
  OpenEndedQuizBlock: () => null,
}));
jest.mock("@/components/draft/lesson/code-block-viewer", () => ({
  CodeBlockViewer: () => null,
}));
jest.mock("@/components/notebook/notebook-code-viewer", () => ({
  NotebookCodeViewer: () => null,
}));
jest.mock("@/lib/pyodide/pyodide-context", () => ({
  PyodideProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("LessonRenderer (viewer)", () => {
  const serverHighlights = [
    {
      id: 7,
      text: "Server highlight",
      color: "#fff300",
      position: { start: 0, end: 6 },
      blockId: 1,
    },
  ] as Highlight[];

  const lesson = {
    id: 1,
    name: "Test Lesson",
    slug: "test-lesson",
    blocks: [{ id: 1, __component: "droplets.generic", content: "<p>Hi</p>" }],
  } as unknown as Lesson;

  const props = {
    lesson,
    droplet: { id: 1, name: "Test Droplet", lessons: [], datasets: [] },
    enrollmentId: "5",
    completedLessonIds: [],
    authUser: { id: 1 } as AuthorizedUser,
    initialHighlights: serverHighlights,
    onUpdate: jest.fn(),
    expanded: false,
    setExpanded: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the lesson title the page's only h1 (content h1s become h2s)", async () => {
    render(
      <LessonRenderer
        {...props}
        lesson={
          {
            ...lesson,
            blocks: [
              {
                id: 2,
                __component: "droplets.expandable",
                title: "More",
                content: "<h1>Expandable heading</h1><p>Body</p>",
              },
              {
                id: 3,
                __component: "droplets.callout",
                iconEnabled: false,
                content: [
                  {
                    type: "heading",
                    level: 1,
                    children: [{ type: "text", text: "Callout heading" }],
                  },
                ],
              },
            ],
          } as unknown as Lesson
        }
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 1, name: "Test Lesson" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText("More"));
    expect(
      screen.getByRole("heading", { level: 2, name: "Expandable heading" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Callout heading" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders server-provided highlights without fetching on mount", async () => {
    render(<LessonRenderer {...props} />);

    expect(screen.getByTestId("highlights")).toHaveTextContent(
      "Server highlight",
    );
    await waitFor(() =>
      expect(screen.getByText("Test Lesson")).toBeInTheDocument(),
    );
    for (const request of [
      getHighlights,
      getHighlightsByAuthorizedUserAndLesson,
      createHighlight,
      deleteHighlight,
    ]) {
      expect(request).not.toHaveBeenCalled();
    }
  });

  it("adds a created highlight to the server-provided list", async () => {
    jest.mocked(createHighlight).mockResolvedValue({
      data: {
        id: 8,
        attributes: {
          text: "New highlight",
          color: "#86efac",
          position: { start: 0, end: 3 },
          blockId: 1,
        },
      },
    });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Highlight"));

    await waitFor(() =>
      expect(screen.getByTestId("highlights")).toHaveTextContent(
        "New highlight",
      ),
    );
    expect(screen.getByTestId("highlights")).toHaveTextContent(
      "Server highlight",
    );
  });

  it("removes a deleted server-provided highlight", async () => {
    jest.mocked(deleteHighlight).mockResolvedValue({ data: { id: 7 } });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Delete highlight"));

    await waitFor(() =>
      expect(screen.getByTestId("highlights")).not.toHaveTextContent(
        "Server highlight",
      ),
    );
    expect(deleteHighlight).toHaveBeenCalledWith(7, 1);
  });

  it("creates a note from a highlight and asks the wrapper to refetch", async () => {
    jest.mocked(getEnrollByID).mockResolvedValue({ id: "5" } as never);
    jest.mocked(getHighlights).mockResolvedValue(serverHighlights);
    jest.mocked(createNote).mockResolvedValue({ success: true });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Add note"));

    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledTimes(1));
    expect(props.setExpanded).toHaveBeenCalledWith(true);
    expect(getHighlights).toHaveBeenCalledWith(1, "Server highlight");
    expect(createNote).toHaveBeenCalledWith(
      lesson,
      { id: "5" },
      120,
      1,
      serverHighlights[0],
    );
  });

  it("shows the enrollment gate instead of highlights when not enrolled", () => {
    render(<LessonRenderer {...props} enrollmentId={undefined} />);

    expect(screen.getByText("Enrollment Required")).toBeInTheDocument();
    expect(screen.queryByTestId("highlights")).not.toBeInTheDocument();
  });
});
