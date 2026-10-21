import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { LessonRenderer } from "@/components/droplets/lessons/lesson-renderer";
import {
  createHighlight,
  updateHighlight,
  deleteHighlight,
  getHighlightsByAuthorizedUserAndLesson,
} from "@/lib/requests/highlights";
import { createNote } from "@/lib/requests/notes";
import { toast } from "sonner";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { AuthorizedUser, Highlight, Lesson } from "@/types";

jest.mock("@/lib/requests/highlights", () => ({
  createHighlight: jest.fn(),
  updateHighlight: jest.fn(),
  deleteHighlight: jest.fn(),
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
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

// Stand-in that exposes the highlight list and the highlight/note callbacks
jest.mock("@/components/droplets/lessons/generic-block-renderer", () => ({
  __esModule: true,
  default: ({
    highlights,
    onHighlight,
    onUpdateHighlight,
    onDeleteHighlight,
    onNote,
  }: {
    highlights: Highlight[];
    onHighlight: (
      highlight: Highlight,
      isWithNote?: boolean,
    ) => Promise<Highlight | null>;
    onUpdateHighlight: (
      id: number,
      changes: { color?: Highlight["color"] },
    ) => Promise<Highlight | null>;
    onDeleteHighlight: (id: number) => Promise<boolean>;
    onNote: (notePos: number, highlight: Highlight) => void;
  }) => (
    <div>
      <ul data-testid="highlights">
        {highlights.map((h) => (
          <li key={h.id} data-color={h.color}>
            {h.text}
          </li>
        ))}
      </ul>
      <button onClick={() => onUpdateHighlight(7, { color: "#86efac" })}>
        Recolour highlight
      </button>
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
      <button
        onClick={() => {
          onDeleteHighlight(7);
          onDeleteHighlight(7);
        }}
      >
        Delete highlight twice
      </button>
      <button
        onClick={() =>
          onNote(120, {
            id: 7,
            text: "Server highlight",
            color: "#fff300",
            position: { start: 0, end: 6 },
            blockId: 1,
          })
        }
      >
        Add note
      </button>
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

  it("renders server-provided highlights without fetching on mount", async () => {
    render(<LessonRenderer {...props} />);

    expect(screen.getByTestId("highlights")).toHaveTextContent(
      "Server highlight",
    );
    await waitFor(() =>
      expect(screen.getByText("Test Lesson")).toBeInTheDocument(),
    );
    for (const request of [
      getHighlightsByAuthorizedUserAndLesson,
      createHighlight,
      updateHighlight,
      deleteHighlight,
    ]) {
      expect(request).not.toHaveBeenCalled();
    }
  });

  it("adds a created highlight to the server-provided list", async () => {
    jest.mocked(createHighlight).mockResolvedValue({
      ok: true,
      error: null,
      data: {
        id: 8,
        text: "New highlight",
        color: "#86efac",
        position: { start: 0, end: 3 },
        blockId: 1,
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
    expect(createHighlight).toHaveBeenCalledWith({
      text: "New highlight",
      color: "#86efac",
      position: { start: 0, end: 3 },
      blockId: 1,
      lessonId: 1,
    });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight saved"),
    );
  });

  it("shows a new highlight before the save returns and drops it if the save fails", async () => {
    jest.mocked(createHighlight).mockResolvedValue({
      ok: false,
      error: "Failed to save highlight",
      data: null,
    });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Highlight"));

    // Synchronously after the click: the save hasn't been awaited yet
    expect(screen.getByTestId("highlights")).toHaveTextContent("New highlight");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to save highlight"),
    );
    expect(screen.getByTestId("highlights")).not.toHaveTextContent(
      "New highlight",
    );
  });

  it("removes a deleted server-provided highlight", async () => {
    jest
      .mocked(deleteHighlight)
      .mockResolvedValue({ ok: true, error: null, data: { id: 7 } });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Delete highlight"));

    await waitFor(() =>
      expect(screen.getByTestId("highlights")).not.toHaveTextContent(
        "Server highlight",
      ),
    );
    expect(deleteHighlight).toHaveBeenCalledWith(7);
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight removed"),
    );
  });

  it("ignores a repeat delete for an id that is already being deleted", async () => {
    jest
      .mocked(deleteHighlight)
      .mockResolvedValueOnce({ ok: true, error: null, data: { id: 7 } })
      .mockResolvedValue({
        ok: false,
        error: "Highlight not found",
        data: null,
      });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Delete highlight twice"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight removed"),
    );
    expect(deleteHighlight).toHaveBeenCalledTimes(1);
    expect(toast.error).not.toHaveBeenCalled();
    expect(screen.getByTestId("highlights")).not.toHaveTextContent(
      "Server highlight",
    );
  });

  it("treats 'Highlight not found' as already removed", async () => {
    jest.mocked(deleteHighlight).mockResolvedValue({
      ok: false,
      error: "Highlight not found",
      data: null,
    });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Delete highlight"));

    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledWith(7));
    await waitFor(() =>
      expect(screen.getByTestId("highlights")).not.toHaveTextContent(
        "Server highlight",
      ),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("puts a highlight back when deleting it fails", async () => {
    jest.mocked(deleteHighlight).mockResolvedValue({
      ok: false,
      error: "Failed to delete highlight",
      data: null,
    });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Delete highlight"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to remove highlight"),
    );
    expect(screen.getByTestId("highlights")).toHaveTextContent(
      "Server highlight",
    );
  });

  it("recolours a highlight at once and keeps the server's record", async () => {
    jest.mocked(updateHighlight).mockResolvedValue({
      ok: true,
      error: null,
      data: { ...serverHighlights[0], color: "#86efac" },
    });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Recolour highlight"));

    // Before the update has been awaited
    expect(screen.getByText("Server highlight")).toHaveAttribute(
      "data-color",
      "#86efac",
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlight updated"),
    );
    expect(updateHighlight).toHaveBeenCalledWith(7, { color: "#86efac" });
    expect(screen.getByText("Server highlight")).toHaveAttribute(
      "data-color",
      "#86efac",
    );
  });

  it("puts the old colour back when the update fails", async () => {
    jest.mocked(updateHighlight).mockResolvedValue({
      ok: false,
      error: "Failed to update highlight",
      data: null,
    });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Recolour highlight"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Failed to update highlight"),
    );
    expect(screen.getByText("Server highlight")).toHaveAttribute(
      "data-color",
      "#fff300",
    );
  });

  it("creates a note from a highlight and asks the wrapper to refetch", async () => {
    jest.mocked(getEnrollByID).mockResolvedValue({ id: "5" } as never);
    jest.mocked(createNote).mockResolvedValue({ success: true });

    render(<LessonRenderer {...props} />);
    fireEvent.click(screen.getByText("Add note"));

    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledTimes(1));
    expect(props.setExpanded).toHaveBeenCalledWith(true);
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
