import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { MentorPanel } from "@/components/droplets/lessons/mentor/mentor-panel";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";
import { createNote } from "@/lib/requests/notes";
import { showCitation } from "@/lib/mentor/locate";
import {
  mentorCitation,
  mentorDone,
  mentorHttpErrorResponse,
  mentorSseResponse,
  mentorText,
} from "@/testing/mocks/mentorEventsMock";
import type { Lesson } from "@/types";

jest.mock("sonner", () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }: { children: string }) => <p>{children}</p>,
}));
jest.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: jest.fn(() => true),
}));
jest.mock("@/lib/requests/notes", () => ({ createNote: jest.fn() }));
jest.mock("@/lib/requests/enrollment", () => ({
  getEnrollByID: jest.fn().mockResolvedValue({ id: 5 }),
}));
jest.mock("@/lib/mentor/locate", () => ({
  showCitation: jest.fn(),
  noteYFor: jest.fn(() => 120),
}));

import { useMediaQuery } from "@/hooks/use-media-query";

const lesson = { id: 9, name: "Joins" } as Lesson;
const onNoteSaved = jest.fn();
const fetchMock = jest.fn();
const KEY = "mentor-notice-v1";

const renderPanel = (enrollmentId = "5") =>
  render(
    <>
      <button id="ask-mentor-button">Ask Mentor</button>
      <MentorPanel
        dropletId={3}
        lesson={lesson}
        enrollmentId={enrollmentId}
        userId={7}
        onNoteSaved={onNoteSaved}
      />
    </>,
  );
const open = () => {
  useLessonPanelStore.setState({
    panel: "mentor",
    mentorKept: true,
    ownerLessonId: 9,
  });
};
const composer = () => screen.getByRole("textbox", { name: /ask about/i });
const answer = (events = [mentorText("A join [p2]."), mentorDone()]) =>
  fetchMock.mockImplementation(async (_u, init) =>
    mentorSseResponse(events, { signal: init.signal }),
  );

beforeEach(async () => {
  // The last test's closing focus timer would otherwise steal this one's focus
  await new Promise((r) => setTimeout(r, 10));
  jest.clearAllMocks();
  document.querySelector(".lesson-wrapper")?.remove();
  localStorage.clear();
  localStorage.setItem(KEY, "1");
  useLessonPanelStore.getState().reset();
  jest.mocked(useMediaQuery).mockReturnValue(true);
  global.fetch = fetchMock as unknown as typeof fetch;
  answer();
});

describe("MentorPanel", () => {
  it("blocks asking until the notice is accepted, then focuses the composer", async () => {
    localStorage.clear();
    renderPanel();
    act(open);

    expect(composer()).toBeDisabled();
    expect(screen.queryByText("Summarize this lesson")).toBeNull();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Got it" })).toHaveFocus(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Got it" }));

    expect(localStorage.getItem(KEY)).toBe("1");
    expect(composer()).toBeEnabled();
    expect(composer()).toHaveFocus();
  });

  it("focuses the composer on open and a starter sends its text", async () => {
    renderPanel();
    act(open);
    await waitFor(() => expect(composer()).toHaveFocus());

    await userEvent.click(
      screen.getByRole("button", { name: "Explain the example" }),
    );

    await waitFor(() =>
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toBe(
        "Explain the example",
      ),
    );
    expect(screen.queryByText("Summarize this lesson")).toBeNull();
  });

  it("Esc closes, clears the conversation and focuses Ask Mentor", async () => {
    renderPanel();
    act(open);
    await waitFor(() => expect(composer()).toHaveFocus());

    await userEvent.keyboard("{Escape}");

    expect(useLessonPanelStore.getState()).toMatchObject({
      panel: null,
      mentorKept: false,
    });
    await waitFor(() => expect(screen.getByText("Ask Mentor")).toHaveFocus());
  });

  it("shows Stop while streaming and aborts, keeping the text", async () => {
    fetchMock.mockImplementation(async (_u, init) =>
      mentorSseResponse([mentorText("One "), mentorText("two"), mentorDone()], {
        delayMs: 100,
        signal: init.signal,
      }),
    );
    renderPanel();
    act(open);
    await userEvent.type(composer(), "Why?{Enter}");

    await userEvent.click(await screen.findByRole("button", { name: "Stop" }));

    expect(await screen.findByText("Stopped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("announces a finished answer in a polite region that isn't role=status", async () => {
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");

    await waitFor(() =>
      expect(document.querySelector("[aria-live=polite]")).toHaveTextContent(
        "Mentor answered: A join.",
      ),
    );
    expect(document.querySelector('[role="status"]')).toBeNull();
  });

  it("locks the composer with the server's message", async () => {
    fetchMock.mockResolvedValue(
      mentorHttpErrorResponse(429, {
        error: "daily_limit",
        message: "You've used today's questions.",
      }),
    );
    renderPanel();
    act(open);
    await userEvent.type(composer(), "Hi{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You've used today's questions.",
    );
    expect(composer()).toBeDisabled();
  });

  it("saves the answer as an HTML note, then refreshes notes", async () => {
    jest.mocked(createNote).mockResolvedValue({ success: true });
    answer([
      mentorText("A join <b>x</b>."),
      mentorDone({ citations: [mentorCitation()] }),
    ]);
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div class="lesson-wrapper"></div>',
    );
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");
    await userEvent.click(
      await screen.findByRole("button", { name: /save to notes/i }),
    );

    await waitFor(() => expect(onNoteSaved).toHaveBeenCalled());
    expect(createNote).toHaveBeenCalledWith(
      lesson,
      { id: 5 },
      120,
      7,
      undefined,
      "<p><strong>What?</strong></p><p>A join &lt;b&gt;x&lt;/b&gt;.</p>",
    );
    expect(toast.success).toHaveBeenCalledWith(
      "Saved to your notes",
      expect.objectContaining({
        action: expect.objectContaining({ label: "View notes" }),
      }),
    );
  });

  it("offers no View notes action on a phone, where the toast is behind the modal", async () => {
    jest.mocked(useMediaQuery).mockReturnValue(false);
    jest.mocked(createNote).mockResolvedValue({ success: true });
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");
    await userEvent.click(
      await screen.findByRole("button", { name: /save to notes/i }),
    );

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Saved to your notes",
        undefined,
      ),
    );
  });

  it("toasts when the note can't be saved", async () => {
    jest.mocked(createNote).mockResolvedValue({ success: false });
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");
    await userEvent.click(
      await screen.findByRole("button", { name: /save to notes/i }),
    );

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Couldn't save to your notes"),
    );
    expect(onNoteSaved).not.toHaveBeenCalled();
  });

  it("the View notes action swaps to Notes and keeps the conversation", async () => {
    jest.mocked(createNote).mockResolvedValue({ success: true });
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");
    await userEvent.click(
      await screen.findByRole("button", { name: /save to notes/i }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    const options = jest.mocked(toast.success).mock.calls[0][1] as unknown as {
      action: { onClick: () => void };
    };
    act(() => options.action.onClick());

    expect(useLessonPanelStore.getState()).toMatchObject({
      panel: "notes",
      mentorKept: true,
    });
    expect(screen.queryByText("What?")).toBeNull();
    act(() => useLessonPanelStore.getState().setPanel("mentor"));
    expect(await screen.findByText("What?")).toBeInTheDocument();
  });

  it("a swap to Notes doesn't pull focus to Ask Mentor, and reopening clears the announcement", async () => {
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");
    await waitFor(() =>
      expect(document.querySelector("[aria-live=polite]")).toHaveTextContent(
        "Mentor answered",
      ),
    );

    act(() => useLessonPanelStore.getState().setPanel("notes"));
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByText("Ask Mentor")).not.toHaveFocus();

    act(() => useLessonPanelStore.getState().setPanel("mentor"));
    await waitFor(() => expect(composer()).toHaveFocus());
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent(
      /^$/,
    );
  });

  it("opens on the close button when the composer is locked", async () => {
    fetchMock.mockResolvedValue(
      mentorHttpErrorResponse(429, { error: "daily_limit", message: "Done" }),
    );
    renderPanel();
    act(open);
    await userEvent.type(composer(), "Hi{Enter}");
    await screen.findByRole("alert");

    act(() => useLessonPanelStore.getState().setPanel("notes"));
    act(() => useLessonPanelStore.getState().setPanel("mentor"));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close Mentor" }),
      ).toHaveFocus(),
    );
  });

  it("hides Save to notes without an enrollment", async () => {
    renderPanel("");
    act(open);
    await userEvent.type(composer(), "What?{Enter}");

    await screen.findByRole("button", { name: /copy/i });
    expect(screen.queryByRole("button", { name: /save to notes/i })).toBeNull();
  });

  it("a Source scrolls to its passage and toasts when it isn't found", async () => {
    jest.mocked(showCitation).mockResolvedValue(false);
    answer([
      mentorText("A join."),
      mentorDone({ citations: [mentorCitation()] }),
    ]);
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");
    await userEvent.click(
      await screen.findByRole("button", { name: /show in lesson/i }),
    );

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        "Couldn't find that passage in the lesson.",
      ),
    );
    expect(useLessonPanelStore.getState().panel).toBe("mentor");
  });

  it("on a phone a Source hides the sheet but keeps the conversation", async () => {
    jest.mocked(useMediaQuery).mockReturnValue(false);
    jest.mocked(showCitation).mockResolvedValue(true);
    answer([
      mentorText("A join."),
      mentorDone({ citations: [mentorCitation()] }),
    ]);
    renderPanel();
    act(open);
    await userEvent.type(composer(), "What?{Enter}");
    await userEvent.click(
      await screen.findByRole("button", { name: /show in lesson/i }),
    );

    expect(useLessonPanelStore.getState()).toMatchObject({
      panel: null,
      mentorKept: true,
    });
    act(() => useLessonPanelStore.getState().setPanel("mentor"));
    expect(await screen.findByText("A join.")).toBeInTheDocument();
  });

  it("keeps focus on one button as Send becomes Stop and the answer ends", async () => {
    answer([mentorText("One "), mentorText("two"), mentorDone()]);
    fetchMock.mockImplementation(async (_u, init) =>
      mentorSseResponse([mentorText("One "), mentorText("two"), mentorDone()], {
        delayMs: 100,
        signal: init.signal,
      }),
    );
    renderPanel();
    act(open);
    await userEvent.type(composer(), "Why?");
    await userEvent.tab();
    const button = screen.getByRole("button", { name: "Send" });
    expect(button).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    expect(await screen.findByRole("button", { name: "Stop" })).toBe(button);
    expect(button).toHaveFocus();

    await userEvent.keyboard("{Enter}");
    await screen.findByText("Stopped");
    expect(screen.getByRole("button", { name: "Send" })).toBe(button);
    expect(button).toHaveFocus();
  });

  it("on a wide screen Esc outside the sheet keeps it open; inside it closes", async () => {
    renderPanel();
    act(open);
    await waitFor(() => expect(composer()).toHaveFocus());

    screen.getByText("Ask Mentor").focus();
    await userEvent.keyboard("{Escape}");
    expect(useLessonPanelStore.getState().panel).toBe("mentor");

    composer().focus();
    await userEvent.keyboard("{Escape}");
    expect(useLessonPanelStore.getState().panel).toBeNull();
  });

  it("announces two stops in a row", async () => {
    fetchMock.mockImplementation(async (_u, init) =>
      mentorSseResponse([mentorText("a"), mentorText("b"), mentorDone()], {
        delayMs: 100,
        signal: init.signal,
      }),
    );
    renderPanel();
    act(open);
    // A screen reader speaks a node that is added, not text that stays the same
    let spoken = 0;
    new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (n.textContent === "Mentor stopped.") spoken += 1;
        });
      }
    }).observe(document.querySelector("[aria-live=polite]")!, {
      childList: true,
    });
    for (const q of ["One", "Two"]) {
      await userEvent.type(composer(), `${q}{Enter}`);
      await userEvent.click(
        await screen.findByRole("button", { name: "Stop" }),
      );
      await screen.findByRole("button", { name: "Send" });
    }

    await waitFor(() => expect(spoken).toBe(2));
  });

  it("hides Try again on an earlier answer once the sheet is locked", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mentorHttpErrorResponse(500, { error: "internal", message: "Oops" }),
      )
      .mockResolvedValueOnce(
        mentorHttpErrorResponse(429, { error: "daily_limit", message: "Done" }),
      );
    renderPanel();
    act(open);
    await userEvent.type(composer(), "One{Enter}");
    expect(
      await screen.findByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
    await userEvent.type(composer(), "Two{Enter}");

    await screen.findByText("Done");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  describe("Explain from the lesson (ODY-889)", () => {
    const realMatchMedia = window.matchMedia;
    afterEach(() => {
      window.matchMedia = realMatchMedia;
    });

    /** The real useMediaQuery, which reads the screen on its first render */
    const screenIs = (wide: boolean) => {
      window.matchMedia = jest.fn(() => ({
        matches: wide,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      })) as never;
      jest
        .mocked(useMediaQuery)
        .mockImplementation(
          jest.requireActual("@/hooks/use-media-query").useMediaQuery,
        );
    };
    // As the lesson does: Explain opens Mentor, which mounts the panel
    const explain = (selection: string) =>
      act(() => {
        useLessonPanelStore.setState({ ownerLessonId: 9 });
        useLessonPanelStore.getState().explain(selection);
      });
    const sent = () =>
      fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));

    it.each([
      ["a wide screen leaves focus, and the selection, in the lesson", true],
      ["a phone moves focus into the sheet", false],
    ])("asks once; %s", async (_name, wide) => {
      screenIs(wide);
      const inLesson = document.body.appendChild(
        document.createElement("button"),
      );
      inLesson.focus();
      explain("LEFT JOIN");
      renderPanel();

      await waitFor(() => expect(composer()).toBeEnabled());
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      await screen.findByRole("button", { name: "Send" });
      expect(sent()).toEqual([
        expect.objectContaining({ kind: "explain", selection: "LEFT JOIN" }),
      ]);
      expect(screen.getByText("Explain “LEFT JOIN”")).toBeInTheDocument();
      expect(wide ? inLesson : composer()).toHaveFocus();
      inLesson.remove();
    });

    it("isn't stopped by StrictMode's remount", async () => {
      // Answered after a moment, as a server does, so an abort lands
      fetchMock.mockImplementation(async (_u, init) =>
        mentorSseResponse([mentorText("A join [p2]."), mentorDone()], {
          delayMs: 5,
          signal: init.signal,
        }),
      );
      explain("LEFT JOIN");
      render(
        <StrictMode>
          <MentorPanel
            dropletId={3}
            lesson={lesson}
            userId={7}
            onNoteSaved={onNoteSaved}
          />
        </StrictMode>,
      );

      await waitFor(() =>
        expect(document.querySelector("[aria-live=polite]")).toHaveTextContent(
          "Mentor answered: A join.",
        ),
      );
      expect(screen.queryByText("Stopped")).toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["is asked once the notice is accepted", false, ["explain"]],
      ["is dropped by a swap to Notes", true, []],
    ])("waiting for the notice, it %s", async (_name, swap, kinds) => {
      localStorage.clear();
      explain("LEFT JOIN");
      renderPanel();
      await screen.findByRole("button", { name: "Got it" });
      if (swap) {
        act(() => useLessonPanelStore.getState().setPanel("notes"));
        act(() => useLessonPanelStore.getState().openMentor());
      }
      await userEvent.click(screen.getByRole("button", { name: "Got it" }));
      await act(() => new Promise((r) => setTimeout(r, 20)));

      expect(sent().map((body) => body.kind)).toEqual(kinds);
    });

    it("waits for the answer that's streaming", async () => {
      fetchMock.mockImplementation(async (_u, init) =>
        mentorSseResponse([mentorText("One "), mentorDone()], {
          delayMs: 50,
          signal: init.signal,
        }),
      );
      renderPanel();
      act(open);
      await userEvent.type(composer(), "Why?{Enter}");
      await screen.findByRole("button", { name: "Stop" });
      act(() => useLessonPanelStore.getState().explain("LEFT JOIN"));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(sent().map((body) => body.kind)).toEqual(["lesson", "explain"]);
      expect(screen.queryByText("Stopped")).toBeNull();
    });
  });
});
