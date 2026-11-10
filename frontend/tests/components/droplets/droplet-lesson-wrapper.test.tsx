import { StrictMode } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { useViewedLessonsStore } from "@/stores/viewed-lessons-store";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";
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
    completedLessonIds,
  }: {
    expanded: boolean;
    setExpanded: (expanded: boolean) => void;
    initialHighlights: Highlight[];
    onUpdate: () => void;
    completedLessonIds: number[];
  }) => (
    <div>
      <span data-testid="renderer-completed">
        {completedLessonIds.join(",")}
      </span>
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

jest.mock("@/components/droplets/lessons/mentor/mentor-panel", () => ({
  MentorPanel: () => <div data-testid="mentor-panel" />,
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
    mentor: false,
    initialNotes: serverNotes,
    initialHighlights: serverHighlights,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useViewedLessonsStore.setState({ pendingViewed: {} });
    useLessonPanelStore.getState().reset();
    jest.mocked(getNotesByAuthorizedUserAndLesson).mockResolvedValue([]);
  });

  it("gives the renderer the lessons pending for this enrollment, so the next lesson isn't locked while Next saves", () => {
    useViewedLessonsStore.getState().markViewed("5", 7);
    useViewedLessonsStore.getState().markViewed("6", 8);

    render(<DropletLessonWrapper {...props} completedLessonIds={[1]} />);

    expect(screen.getByTestId("renderer-completed")).toHaveTextContent("1,7");
  });

  it("updates the renderer's lessons when a view becomes pending", () => {
    render(<DropletLessonWrapper {...props} completedLessonIds={[1]} />);
    expect(screen.getByTestId("renderer-completed")).toHaveTextContent(/^1$/);

    act(() => useViewedLessonsStore.getState().markViewed("5", 7));

    expect(screen.getByTestId("renderer-completed")).toHaveTextContent("1,7");
  });

  it("does not mount the notes bar until the panel is opened", async () => {
    render(<DropletLessonWrapper {...props} />);

    expect(screen.queryByTestId("notes-bar")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Toggle notes"));

    expect(await screen.findByTestId("notes-bar")).toBeInTheDocument();
  });

  it("announces only the loading message while the notes panel loads", async () => {
    // Fresh module so the notes bar chunk isn't already loaded by other tests
    let Fresh: typeof DropletLessonWrapper = DropletLessonWrapper;
    jest.isolateModules(() => {
      Fresh =
        require("@/components/droplets/lessons/droplet-lesson-wrapper").DropletLessonWrapper;
    });
    render(<Fresh {...props} />);

    fireEvent.click(screen.getByText("Toggle notes"));

    const liveRegion = screen.getByText("Loading notes").closest("[aria-live]");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).not.toHaveTextContent("My Notes");
    // The footer's quiz gate counts [role="status"] as answered questions
    expect(document.querySelector('[role="status"]')).toBeNull();
    expect(
      screen.getByRole("heading", { name: "My Notes" }),
    ).toBeInTheDocument();

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

  describe("notes panel close animation", () => {
    const state = () => screen.getByTestId("notes-panel").dataset.state;
    const mockReducedMotion = (matches: boolean) =>
      jest.mocked(window.matchMedia).mockImplementation(
        (query: string) =>
          ({
            matches,
            media: query,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          }) as unknown as MediaQueryList,
      );

    afterEach(() => {
      jest.useRealTimers();
      mockReducedMotion(false);
    });

    it("is closed until opened, then open", () => {
      render(<DropletLessonWrapper {...props} />);
      expect(state()).toBe("closed");

      fireEvent.click(screen.getByText("Toggle notes"));
      expect(state()).toBe("open");
    });

    it("plays the closing state, then closes when the animation ends", () => {
      render(<DropletLessonWrapper {...props} />);
      fireEvent.click(screen.getByText("Toggle notes"));

      fireEvent.keyDown(document, { key: "Escape" });
      expect(state()).toBe("closing");

      fireEvent.animationEnd(screen.getByTestId("notes-panel"));
      expect(state()).toBe("closed");
    });

    it("closes after the animation time even if animationend never fires", () => {
      jest.useFakeTimers();
      render(<DropletLessonWrapper {...props} />);
      fireEvent.click(screen.getByText("Toggle notes"));
      fireEvent.click(screen.getByText("Toggle notes"));
      expect(state()).toBe("closing");

      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(state()).toBe("closed");
    });

    it("shows the panel open when reopened during the closing animation", () => {
      jest.useFakeTimers();
      render(<DropletLessonWrapper {...props} />);
      fireEvent.click(screen.getByText("Toggle notes"));
      fireEvent.click(screen.getByText("Toggle notes"));
      expect(state()).toBe("closing");

      fireEvent.click(screen.getByText("Toggle notes"));
      expect(state()).toBe("open");

      act(() => {
        jest.advanceTimersByTime(400);
      });
      expect(state()).toBe("open");
    });

    it("closes at once for reduced motion", () => {
      mockReducedMotion(true);
      render(<DropletLessonWrapper {...props} />);
      fireEvent.click(screen.getByText("Toggle notes"));

      fireEvent.click(screen.getByText("Toggle notes"));

      expect(state()).toBe("closed");
    });
  });

  it("never renders the notes panel without an enrollment", () => {
    render(<DropletLessonWrapper {...props} enrollmentId={undefined} />);

    fireEvent.click(screen.getByText("Toggle notes"));

    expect(screen.queryByTestId("notes-bar")).not.toBeInTheDocument();
    expect(getNotesByAuthorizedUserAndLesson).not.toHaveBeenCalled();
  });

  describe("lesson panels", () => {
    it("swaps Mentor for Notes and keeps the conversation", () => {
      useLessonPanelStore.getState().openMentor();
      render(<DropletLessonWrapper {...props} />);

      fireEvent.click(screen.getByText("Toggle notes"));

      const state = useLessonPanelStore.getState();
      expect(state.panel).toBe("notes");
      expect(state.mentorKept).toBe(true);
    });

    it("closes Notes on Escape but leaves Mentor alone", () => {
      render(<DropletLessonWrapper {...props} />);
      fireEvent.click(screen.getByText("Toggle notes"));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(useLessonPanelStore.getState().panel).toBeNull();

      act(() => useLessonPanelStore.getState().openMentor());
      fireEvent.keyDown(document, { key: "Escape" });
      expect(useLessonPanelStore.getState().panel).toBe("mentor");
    });

    it("doesn't carry an open panel over to the next lesson", async () => {
      const lessonB = { id: 2, slug: "lesson-b" } as Lesson;
      const { rerender, container } = render(
        <DropletLessonWrapper key={1} {...props} />,
      );
      fireEvent.click(screen.getByText("Toggle notes"));
      expect(await screen.findByTestId("notes-bar")).toBeInTheDocument();

      rerender(<DropletLessonWrapper key={2} {...props} lesson={lessonB} />);

      expect(screen.queryByTestId("notes-bar")).not.toBeInTheDocument();
      expect(container.querySelector(".pr-\\[420px\\]")).toBeNull();
    });

    it("mounts MentorPanel only while this lesson keeps a conversation", async () => {
      const { rerender } = render(<DropletLessonWrapper key={1} {...props} />);
      expect(screen.queryByTestId("mentor-panel")).toBeNull();

      act(() => useLessonPanelStore.getState().openMentor());
      expect(await screen.findByTestId("mentor-panel")).toBeInTheDocument();

      act(() => useLessonPanelStore.getState().closeMentor());
      expect(screen.queryByTestId("mentor-panel")).toBeNull();

      // Another lesson never sees a stale mentorKept
      act(() => useLessonPanelStore.getState().openMentor());
      rerender(
        <DropletLessonWrapper
          key={2}
          {...props}
          lesson={{ id: 2, slug: "b" } as Lesson}
        />,
      );
      expect(screen.queryByTestId("mentor-panel")).toBeNull();
    });

    describe("Ask Mentor availability", () => {
      const lessons = [
        { id: 1, orderIndex: 1 },
        { id: 2, orderIndex: 2 },
      ] as Lesson[];
      const droplet = { id: 1, lessons } as Droplet;
      const available = () => useLessonPanelStore.getState().mentorAvailable;

      it.each([
        ["mentor on and the lesson open", true, 1, true],
        ["mentor off", false, 1, false],
        ["the lesson locked behind the previous one", true, 2, false],
      ])("is %s -> %s", (_label, mentor, lessonId, expected) => {
        render(
          <DropletLessonWrapper
            {...props}
            droplet={droplet}
            lesson={{ id: lessonId, slug: "l" } as Lesson}
            mentor={mentor}
          />,
        );
        expect(available()).toBe(expected);
      });

      it("is off without an enrollment, and off again after unmount", () => {
        const { unmount } = render(
          <DropletLessonWrapper
            {...props}
            droplet={droplet}
            enrollmentId={undefined}
            mentor
          />,
        );
        expect(available()).toBe(false);
        unmount();

        const second = render(
          <DropletLessonWrapper {...props} droplet={droplet} mentor />,
        );
        expect(available()).toBe(true);
        second.unmount();
        expect(available()).toBe(false);
      });

      it("is set again when the next lesson's wrapper replaces this one", () => {
        const { rerender } = render(
          <DropletLessonWrapper key={1} {...props} mentor />,
        );
        rerender(
          <DropletLessonWrapper
            key={2}
            {...props}
            lesson={{ id: 2, slug: "b" } as Lesson}
            mentor
          />,
        );
        expect(available()).toBe(true);
      });

      it("survives Strict Mode's extra effect cleanup", () => {
        render(
          <StrictMode>
            <DropletLessonWrapper {...props} mentor />
          </StrictMode>,
        );
        expect(available()).toBe(true);
      });

      it("closes an open sheet when Mentor stops being available", () => {
        const { rerender } = render(<DropletLessonWrapper {...props} mentor />);
        act(() => useLessonPanelStore.getState().openMentor());

        rerender(<DropletLessonWrapper {...props} mentor={false} />);

        expect(useLessonPanelStore.getState()).toMatchObject({
          panel: null,
          mentorKept: false,
          mentorAvailable: false,
        });
      });
    });

    it("resets the store on unmount", () => {
      const { unmount } = render(<DropletLessonWrapper {...props} />);
      act(() => {
        useLessonPanelStore.getState().openMentor();
        useLessonPanelStore.getState().setMentorAvailable(true);
      });

      unmount();

      expect(useLessonPanelStore.getState()).toMatchObject({
        panel: null,
        mentorKept: false,
        mentorAvailable: false,
      });
    });
  });
});
