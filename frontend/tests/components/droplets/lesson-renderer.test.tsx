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
import { AuthorizedUser, Highlight, Lesson, Note } from "@/types";

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
    onMergeHighlights,
    onDeleteHighlight,
    onNote,
  }: {
    highlights: Highlight[];
    onMergeHighlights: (
      baseId: number,
      changes: {
        color: Highlight["color"];
        position: { start: number; end: number };
        text: string;
      },
      removeIds: number[],
    ) => Promise<Highlight | null>;
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
      <button onClick={() => onUpdateHighlight(7, { color: "#93c5fd" })}>
        Recolour highlight blue
      </button>
      <button
        onClick={() =>
          onMergeHighlights(
            7,
            {
              color: "#86efac",
              position: { start: 0, end: 12 },
              text: "Server highlight and more",
            },
            [9],
          )
        }
      >
        Merge highlights
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

  describe("keeping the notes in step with their highlight (audit W1)", () => {
    const noted = [
      { id: 1, content: "", positionY: 0, highlight: { id: 7 } },
    ] as unknown as Note[];

    it("refreshes the notes once after recolouring a highlight that has a note", async () => {
      jest.mocked(updateHighlight).mockResolvedValue({
        ok: true,
        error: null,
        data: { ...serverHighlights[0], color: "#86efac" },
      });
      render(<LessonRenderer {...props} notes={noted} />);

      fireEvent.click(screen.getByText("Recolour highlight"));

      await waitFor(() => expect(props.onUpdate).toHaveBeenCalledTimes(1));
    });

    it("does not refresh the notes for a plain recolour", async () => {
      jest.mocked(updateHighlight).mockResolvedValue({
        ok: true,
        error: null,
        data: { ...serverHighlights[0], color: "#86efac" },
      });
      render(<LessonRenderer {...props} notes={[]} />);

      fireEvent.click(screen.getByText("Recolour highlight"));

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Highlight updated"),
      );
      expect(props.onUpdate).not.toHaveBeenCalled();
    });

    it("does not refresh the notes when the update fails", async () => {
      jest.mocked(updateHighlight).mockResolvedValue({
        ok: false,
        error: "Failed to update highlight",
        data: null,
      });
      render(<LessonRenderer {...props} notes={noted} />);

      fireEvent.click(screen.getByText("Recolour highlight"));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(props.onUpdate).not.toHaveBeenCalled();
    });

    it("refreshes the notes after a merge whose base has a note", async () => {
      jest.mocked(updateHighlight).mockResolvedValue({
        ok: true,
        error: null,
        data: { ...serverHighlights[0], position: { start: 0, end: 12 } },
      });
      jest
        .mocked(deleteHighlight)
        .mockResolvedValue({ ok: true, error: null, data: { id: 9 } });
      const withOther = [
        ...serverHighlights,
        {
          id: 9,
          text: "Plain highlight",
          color: "#fff300",
          position: { start: 7, end: 12 },
          blockId: 1,
        },
      ] as Highlight[];
      render(
        <LessonRenderer
          {...props}
          initialHighlights={withOther}
          notes={noted}
        />,
      );

      fireEvent.click(screen.getByText("Merge highlights"));

      await waitFor(() => expect(props.onUpdate).toHaveBeenCalledTimes(1));
    });

    it("does not refresh the notes after a merge whose base has none", async () => {
      jest.mocked(updateHighlight).mockResolvedValue({
        ok: true,
        error: null,
        data: { ...serverHighlights[0], position: { start: 0, end: 12 } },
      });
      render(<LessonRenderer {...props} notes={[]} />);

      fireEvent.click(screen.getByText("Merge highlights"));

      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Highlights merged"),
      );
      expect(props.onUpdate).not.toHaveBeenCalled();
    });

    it("refreshes the notes after deleting a highlight that has a note, not otherwise", async () => {
      jest
        .mocked(deleteHighlight)
        .mockResolvedValue({ ok: true, error: null, data: { id: 7 } });
      const { unmount } = render(<LessonRenderer {...props} notes={noted} />);
      fireEvent.click(screen.getByText("Delete highlight"));
      await waitFor(() => expect(props.onUpdate).toHaveBeenCalledTimes(1));
      unmount();

      jest.mocked(props.onUpdate).mockClear();
      render(<LessonRenderer {...props} notes={[]} />);
      fireEvent.click(screen.getByText("Delete highlight"));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Highlight removed"),
      );
      expect(props.onUpdate).not.toHaveBeenCalled();
    });
  });

  describe("overlapping recolours (audit S3)", () => {
    it("keeps the newer colour on screen when an older update fails afterwards", async () => {
      let failFirst!: (value: {
        ok: false;
        error: "Failed to update highlight";
        data: null;
      }) => void;
      jest
        .mocked(updateHighlight)
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              failFirst = resolve;
            }),
        )
        .mockResolvedValueOnce({
          ok: true,
          error: null,
          data: { ...serverHighlights[0], color: "#93c5fd" },
        });
      render(<LessonRenderer {...props} />);

      // yellow -> green (slow), then green -> blue (succeeds)
      fireEvent.click(screen.getByText("Recolour highlight"));
      fireEvent.click(screen.getByText("Recolour highlight blue"));
      await waitFor(() =>
        expect(toast.success).toHaveBeenCalledWith("Highlight updated"),
      );

      failFirst({
        ok: false,
        error: "Failed to update highlight",
        data: null,
      });
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith("Failed to update highlight"),
      );

      expect(screen.getByText("Server highlight")).toHaveAttribute(
        "data-color",
        "#93c5fd",
      );
    });
  });

  describe("a lapsed session (audit S5)", () => {
    const expired = {
      ok: false,
      error: "unauthenticated",
      data: null,
    } as const;
    const message =
      "Your session has expired. Sign in again to save highlights.";

    it("says so when saving, recolouring and removing are refused", async () => {
      jest.mocked(createHighlight).mockResolvedValue(expired);
      jest.mocked(updateHighlight).mockResolvedValue(expired);
      jest.mocked(deleteHighlight).mockResolvedValue(expired);
      render(<LessonRenderer {...props} />);

      fireEvent.click(screen.getByText("Highlight"));
      await waitFor(() =>
        expect(toast.error).toHaveBeenLastCalledWith(message),
      );
      jest.mocked(toast.error).mockClear();

      fireEvent.click(screen.getByText("Recolour highlight"));
      await waitFor(() =>
        expect(toast.error).toHaveBeenLastCalledWith(message),
      );
      jest.mocked(toast.error).mockClear();

      fireEvent.click(screen.getByText("Delete highlight"));
      await waitFor(() =>
        expect(toast.error).toHaveBeenLastCalledWith(message),
      );
      // nothing generic was shown
      expect(toast.error).not.toHaveBeenCalledWith(
        "Failed to remove highlight",
      );
    });
  });

  it("never absorbs a highlight that has a note, even when the block asked to", async () => {
    jest.mocked(updateHighlight).mockResolvedValue({
      ok: true,
      error: null,
      data: { ...serverHighlights[0], position: { start: 0, end: 12 } },
    });
    const withNoted = [
      ...serverHighlights,
      {
        id: 9,
        text: "Noted highlight",
        color: "#fff300",
        position: { start: 7, end: 12 },
        blockId: 1,
      },
    ] as Highlight[];
    const notes = [
      { id: 1, content: "", positionY: 0, highlight: { id: 9 } },
    ] as unknown as Note[];

    render(
      <LessonRenderer {...props} initialHighlights={withNoted} notes={notes} />,
    );
    fireEvent.click(screen.getByText("Merge highlights"));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Highlights merged"),
    );
    expect(deleteHighlight).not.toHaveBeenCalled();
    expect(screen.getByTestId("highlights")).toHaveTextContent(
      "Noted highlight",
    );
  });

  it("deletes the absorbed highlights of a merge that have no note", async () => {
    jest.mocked(updateHighlight).mockResolvedValue({
      ok: true,
      error: null,
      data: { ...serverHighlights[0], position: { start: 0, end: 12 } },
    });
    jest
      .mocked(deleteHighlight)
      .mockResolvedValue({ ok: true, error: null, data: { id: 9 } });
    const withOther = [
      ...serverHighlights,
      {
        id: 9,
        text: "Plain highlight",
        color: "#fff300",
        position: { start: 7, end: 12 },
        blockId: 1,
      },
    ] as Highlight[];

    render(
      <LessonRenderer {...props} initialHighlights={withOther} notes={[]} />,
    );
    fireEvent.click(screen.getByText("Merge highlights"));

    await waitFor(() => expect(deleteHighlight).toHaveBeenCalledWith(9));
    expect(screen.getByTestId("highlights")).not.toHaveTextContent(
      "Plain highlight",
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
