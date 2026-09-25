import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DropletLessonWrapper } from "@/components/droplets/lessons/droplet-lesson-wrapper";
import { getNotesByAuthorizedUserAndLesson } from "@/lib/requests/notes";
import { AuthorizedUser, Droplet, Highlight, Lesson, Note } from "@/types";

jest.mock("@/lib/requests/notes", () => ({
  getNotesByAuthorizedUserAndLesson: jest.fn(),
}));

jest.mock("@/components/droplets/lessons/lesson-renderer", () => ({
  LessonRenderer: ({
    expanded,
    setExpanded,
    initialHighlights,
    onUpdate,
  }: {
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
    initialHighlights: Highlight[];
    onUpdate: () => void;
  }) => (
    <div>
      <button onClick={() => setExpanded(!expanded)}>Toggle notes</button>
      <button onClick={onUpdate}>Note from highlight</button>
      <ul data-testid="highlights">
        {initialHighlights.map((h) => (
          <li key={h.id}>{h.text}</li>
        ))}
      </ul>
    </div>
  ),
}));

jest.mock("@/components/droplets/lessons/note-taking/notes-bar", () => ({
  NotesBar: ({ initNotes }: { initNotes: Note[] }) => (
    <ul data-testid="notes-bar">
      {initNotes.map((n) => (
        <li key={n.id}>{n.content}</li>
      ))}
    </ul>
  ),
}));

jest.mock("@/components/droplets/footer", () => ({
  __esModule: true,
  default: () => null,
}));

describe("DropletLessonWrapper", () => {
  const serverNotes = [
    { id: 1, content: "Server note", positionY: 100 },
  ] as Note[];
  const serverHighlights = [
    {
      id: 7,
      text: "Server highlight",
      color: "#fff300",
      position: { start: 0, end: 6 },
      blockId: 1,
    },
  ] as Highlight[];

  const props = {
    lesson: { id: 1, slug: "test-lesson" } as Lesson,
    droplet: { id: 1 } as Droplet,
    enrollmentId: "5",
    completedLessonIds: [],
    author: false,
    authUser: { id: 1 } as AuthorizedUser,
    userId: 1,
    initialNotes: serverNotes,
    initialHighlights: serverHighlights,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getNotesByAuthorizedUserAndLesson).mockResolvedValue([]);
  });

  it("does not mount the notes bar until the panel is opened", async () => {
    render(<DropletLessonWrapper {...props} />);

    expect(screen.queryByTestId("notes-bar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Toggle notes"));

    expect(await screen.findByTestId("notes-bar")).toBeInTheDocument();
  });

  it("keeps the notes bar mounted after the panel is collapsed", async () => {
    render(<DropletLessonWrapper {...props} />);

    fireEvent.click(screen.getByText("Toggle notes"));
    expect(await screen.findByTestId("notes-bar")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getByTestId("notes-bar")).toBeInTheDocument();
  });

  it("passes server-provided notes to the notes bar without fetching on mount", async () => {
    render(<DropletLessonWrapper {...props} />);

    fireEvent.click(screen.getByText("Toggle notes"));

    const notesBar = await screen.findByTestId("notes-bar");
    expect(notesBar).toHaveTextContent("Server note");
    expect(getNotesByAuthorizedUserAndLesson).not.toHaveBeenCalled();
  });

  it("passes server-provided highlights to the lesson renderer", () => {
    render(<DropletLessonWrapper {...props} />);

    expect(screen.getByTestId("highlights")).toHaveTextContent(
      "Server highlight",
    );
  });

  it("refetches notes after a note is created from a highlight", async () => {
    jest
      .mocked(getNotesByAuthorizedUserAndLesson)
      .mockResolvedValue([
        ...serverNotes,
        { id: 2, content: "New note", positionY: 300 } as Note,
      ]);

    render(<DropletLessonWrapper {...props} />);
    fireEvent.click(screen.getByText("Toggle notes"));
    await screen.findByTestId("notes-bar");

    fireEvent.click(screen.getByText("Note from highlight"));

    await waitFor(() =>
      expect(screen.getByTestId("notes-bar")).toHaveTextContent("New note"),
    );
    expect(getNotesByAuthorizedUserAndLesson).toHaveBeenCalledTimes(1);
    expect(getNotesByAuthorizedUserAndLesson).toHaveBeenCalledWith(
      1,
      "test-lesson",
    );
  });

  it("never renders the notes panel without an enrollment", () => {
    render(<DropletLessonWrapper {...props} enrollmentId={undefined} />);

    fireEvent.click(screen.getByText("Toggle notes"));

    expect(screen.queryByTestId("notes-bar")).not.toBeInTheDocument();
    expect(getNotesByAuthorizedUserAndLesson).not.toHaveBeenCalled();
  });
});
