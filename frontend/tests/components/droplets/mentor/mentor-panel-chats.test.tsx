import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "sonner";
import { MentorPanel } from "@/components/droplets/lessons/mentor/mentor-panel";
import { acceptNotice } from "@/components/droplets/lessons/mentor/mentor-notice";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";
import {
  deleteMentorChat,
  getMentorChat,
  listMentorChats,
} from "@/lib/requests/mentor-chats";
import {
  mentorDone,
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
jest.mock("@/lib/requests/mentor-feedback", () => ({
  saveMentorFeedback: jest.fn(),
}));
jest.mock("@/lib/requests/enrollment", () => ({ getEnrollByID: jest.fn() }));
jest.mock("@/lib/mentor/locate", () => ({
  showCitation: jest.fn(),
  noteYFor: jest.fn(() => 0),
}));
jest.mock("@/lib/requests/mentor-chats", () => ({
  listMentorChats: jest.fn(),
  getMentorChat: jest.fn(),
  deleteMentorChat: jest.fn(),
}));

const lesson = { id: 9, name: "Joins" } as Lesson;
const fetchMock = jest.fn();
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();

const chat = (
  documentId: string,
  title: string,
  over: Record<string, unknown> = {},
) => ({
  documentId,
  kind: "lesson" as const,
  title,
  lastMessageAt: hoursAgo(2),
  lesson: { id: 9, name: "Joins" },
  droplet: { id: 3, name: "SQL Basics" },
  ...over,
});
// Newest first, as Strapi returns them
const CHATS = [
  chat("chatAAAA1111", "What is a join?"),
  chat("chatBBBB2222", "Why index?", {
    lastMessageAt: hoursAgo(50),
    lesson: { id: 4, name: "Indexes" },
    droplet: { id: 8, name: "Performance" },
  }),
  chat("chatCCCC3333", "Explain this", { kind: "explain" }),
];
const saved = (text: string) => ({
  ok: true,
  data: {
    chat: CHATS[0],
    messages: [
      { documentId: "m1", role: "user", text, citations: null },
      {
        documentId: "m2",
        role: "assistant",
        text: "An answer [p2].",
        citations: [],
      },
    ],
  },
});

const withChatId = (res: Response, id: string) =>
  Object.defineProperty(res, "headers", {
    value: {
      get: (k: string) => (k.toLowerCase() === "x-mentor-chat-id" ? id : null),
    },
  });
const panel = (l: Lesson = lesson) => (
  <>
    <button id="ask-mentor-button">Ask Mentor</button>
    <MentorPanel dropletId={3} lesson={l} userId={7} onNoteSaved={jest.fn()} />
  </>
);
const renderPanel = () =>
  render(
    <>
      <button id="ask-mentor-button">Ask Mentor</button>
      <MentorPanel
        dropletId={3}
        lesson={lesson}
        userId={7}
        onNoteSaved={jest.fn()}
      />
    </>,
  );
const open = () =>
  act(() =>
    useLessonPanelStore.setState({
      panel: "mentor",
      mentorKept: true,
      ownerLessonId: 9,
    }),
  );
const showList = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Chats" }));
  return screen.findByRole("list", { name: "Saved chats" });
};

beforeEach(async () => {
  await new Promise((r) => setTimeout(r, 10));
  jest.clearAllMocks();
  jest.mocked(useMediaQuery).mockReturnValue(true);
  localStorage.clear();
  acceptNotice();
  useLessonPanelStore.getState().reset();
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockImplementation(async (_u, init) =>
    mentorSseResponse([mentorText("Hi."), mentorDone()], {
      signal: init.signal,
    }),
  );
  jest
    .mocked(listMentorChats)
    .mockResolvedValue({ ok: true, data: CHATS as never });
  jest
    .mocked(getMentorChat)
    .mockImplementation(async () => saved("What is a join?") as never);
  jest.mocked(deleteMentorChat).mockResolvedValue({ ok: true });
});

describe("?mentorChat link", () => {
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("opens that chat once and drops the param from the URL", async () => {
    window.history.replaceState(null, "", "/d/x/y?mentorChat=chatBBBB2222&a=1");
    jest
      .mocked(getMentorChat)
      .mockImplementation(async () => saved("Why index?") as never);
    renderPanel();
    open();

    expect(await screen.findByText("Why index?")).toBeInTheDocument();
    expect(getMentorChat).toHaveBeenCalledWith("chatBBBB2222");
    expect(getMentorChat).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?a=1");
  });

  it("announces a failed link in the phone sheet, not only a toast", async () => {
    jest.mocked(useMediaQuery).mockReturnValue(false);
    window.history.replaceState(null, "", "/d/x/y?mentorChat=chatZZZZ9999");
    jest
      .mocked(getMentorChat)
      .mockResolvedValue({ ok: false, error: "not_found" });
    renderPanel();
    open();

    expect(
      await screen.findByText("Couldn't open that chat"),
    ).toBeInTheDocument();
    expect(toast.error).toHaveBeenCalledWith("Couldn't open that chat");
  });

  it("is not replaced by the most recent chat's default load", async () => {
    window.history.replaceState(null, "", "/d/x/y?mentorChat=chatBBBB2222");
    jest
      .mocked(getMentorChat)
      .mockImplementation(async () => saved("Why index?") as never);
    renderPanel();
    open();

    expect(await screen.findByText("Why index?")).toBeInTheDocument();
    await waitFor(() => expect(listMentorChats).not.toHaveBeenCalled());
    expect(getMentorChat).not.toHaveBeenCalledWith("chatAAAA1111");
    expect(screen.queryByText("What is a join?")).toBeNull();
  });
});

describe("Mentor chat list", () => {
  it("opens the most recent lesson chat by default", async () => {
    renderPanel();
    open();

    expect(await screen.findByText("What is a join?")).toBeInTheDocument();
    expect(getMentorChat).toHaveBeenCalledWith("chatAAAA1111");
    expect(screen.getByText("An answer.")).toBeInTheDocument();
  });

  it("starts empty when there are no chats", async () => {
    jest.mocked(listMentorChats).mockResolvedValue({ ok: true, data: [] });
    renderPanel();
    open();

    await waitFor(() => expect(listMentorChats).toHaveBeenCalled());
    expect(getMentorChat).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Chats" }));
    // The list and the live region both say it
    await waitFor(() =>
      expect(screen.getAllByText("No saved chats yet")).toHaveLength(2),
    );
  });

  it("lists this panel's chats newest first with where they started", async () => {
    renderPanel();
    open();
    const list = await showList();

    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("What is a join?");
    expect(rows[0]).toHaveTextContent("Started in Joins · SQL Basics");
    expect(rows[0]).toHaveTextContent("2 hr ago");
    expect(rows[1]).toHaveTextContent("Why index?");
    expect(rows[1]).toHaveTextContent("2 days ago");
    expect(screen.queryByText("Explain this")).toBeNull();
  });

  it("highlights the open chat and opens another on click, without citations from another lesson", async () => {
    renderPanel();
    open();
    await screen.findByText("An answer.");
    await showList();
    expect(
      screen.getByRole("button", { name: /^What is a join/ }),
    ).toHaveAttribute("aria-current", "true");

    jest.mocked(getMentorChat).mockResolvedValueOnce({
      ok: true,
      data: {
        chat: CHATS[1],
        messages: [
          {
            documentId: "m1",
            role: "user",
            text: "Why index?",
            citations: null,
          },
          {
            documentId: "m2",
            role: "assistant",
            text: "Speed [p1].",
            citations: [
              {
                ref: "p1",
                anchor: { v: 1, field: "blocks", blockId: "b" },
                blockIndex: 0,
                label: "Old source",
              },
            ],
          },
        ],
      },
    } as never);
    await userEvent.click(screen.getByRole("button", { name: /^Why index/ }));

    expect(await screen.findByText("Speed.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Old source/ })).toBeNull();
    expect(screen.getByRole("textbox", { name: /ask about/i })).toHaveFocus();
  });

  it("New chat clears the conversation and the next ask has no chatId", async () => {
    renderPanel();
    open();
    await screen.findByText("An answer.");
    // Continuing sends the open chat's id
    fetchMock.mockImplementation(async (_u, init) => {
      const res = mentorSseResponse([mentorText("Hi."), mentorDone()], {
        signal: init.signal,
      });
      Object.defineProperty(res, "headers", {
        value: {
          get: (k: string) =>
            k.toLowerCase() === "x-mentor-chat-id" ? "chatAAAA1111" : null,
        },
      });
      return res;
    });
    await userEvent.type(
      screen.getByRole("textbox", { name: /ask about/i }),
      "more{Enter}",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "New chat" })).toBeEnabled(),
    );
    await userEvent.click(screen.getByRole("button", { name: "New chat" }));
    expect(screen.queryByText("An answer.")).toBeNull();

    await userEvent.type(
      screen.getByRole("textbox", { name: /ask about/i }),
      "fresh{Enter}",
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.chatId).toBeUndefined();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).chatId).toBe(
      "chatAAAA1111",
    );
  });

  it("asks before deleting; Cancel keeps the chat", async () => {
    renderPanel();
    open();
    await showList();

    await userEvent.click(
      screen.getByRole("button", { name: "Delete chat: Why index?" }),
    );
    expect(
      screen.getByText("Delete this chat? This can't be undone."),
    ).toBeVisible();
    expect(deleteMentorChat).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteMentorChat).not.toHaveBeenCalled();
    expect(screen.getByText("Why index?")).toBeInTheDocument();
  });

  it("Delete removes the chat from the list", async () => {
    renderPanel();
    open();
    await showList();

    await userEvent.click(
      screen.getByRole("button", { name: "Delete chat: Why index?" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(screen.queryByText("Why index?")).toBeNull());
    expect(deleteMentorChat).toHaveBeenCalledWith("chatBBBB2222");
    expect(screen.getByText("What is a join?")).toBeInTheDocument();
  });

  it("deleting the open chat leaves an empty new chat", async () => {
    renderPanel();
    open();
    await screen.findByText("An answer.");
    await showList();

    await userEvent.click(
      screen.getByRole("button", { name: "Delete chat: What is a join?" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() =>
      expect(screen.queryByText("What is a join?")).toBeNull(),
    );

    await userEvent.click(screen.getByRole("button", { name: "Back to chat" }));
    expect(screen.queryByText("An answer.")).toBeNull();
    expect(screen.getByText("Summarize this lesson")).toBeInTheDocument();
  });

  it("shows an error with a retry when the list can't load", async () => {
    jest
      .mocked(listMentorChats)
      .mockResolvedValueOnce({ ok: false, error: "failed" })
      .mockResolvedValueOnce({ ok: false, error: "failed" });
    renderPanel();
    open();
    await userEvent.click(await screen.findByRole("button", { name: "Chats" }));

    expect(await screen.findByText(/Couldn't load your chats/)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("list", { name: "Saved chats" }),
    ).toBeInTheDocument();
  });

  it("announces the list result", async () => {
    renderPanel();
    open();
    await showList();
    expect(screen.getByText("2 chats")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Delete chat: Why index?" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("1 chat")).toBeInTheDocument();
  });

  it("puts focus on the list heading after a delete", async () => {
    renderPanel();
    open();
    await showList();

    await userEvent.click(
      screen.getByRole("button", { name: "Delete chat: Why index?" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Your chats" })).toHaveFocus(),
    );
  });

  it("shows a row for a new chat until the list includes it", async () => {
    jest.mocked(listMentorChats).mockResolvedValue({ ok: true, data: [] });
    fetchMock.mockImplementation(async (_u, init) =>
      withChatId(
        mentorSseResponse([mentorText("Hi."), mentorDone()], {
          signal: init.signal,
        }),
        "chatNEW11111",
      ),
    );
    renderPanel();
    open();
    await waitFor(() => expect(listMentorChats).toHaveBeenCalled());
    await userEvent.type(
      screen.getByRole("textbox", { name: /ask about/i }),
      "  How do joins work?{Enter}",
    );
    await screen.findByText("Hi.");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "New chat" })).toBeEnabled(),
    );

    const list = await showList();
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(list).toHaveTextContent("How do joins work?");
    expect(list).toHaveTextContent("just now");

    jest.mocked(listMentorChats).mockResolvedValue({
      ok: true,
      data: [chat("chatNEW11111", "How do joins work?")] as never,
    });
    await userEvent.click(screen.getByRole("button", { name: "Back to chat" }));
    await userEvent.click(screen.getByRole("button", { name: "Chats" }));
    await waitFor(() =>
      expect(
        screen.getByRole("list", { name: "Saved chats" }),
      ).toHaveTextContent("2 hr ago"),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("drops a saved answer's sources and Read line once the lesson changes", async () => {
    const citation = {
      ref: "p1",
      anchor: { v: 1, field: "blocks", blockId: "b" },
      blockIndex: 0,
      label: "Join source",
    };
    jest.mocked(getMentorChat).mockResolvedValue({
      ok: true,
      data: {
        chat: CHATS[0],
        messages: [
          { documentId: "m1", role: "user", text: "Q", citations: null },
          {
            documentId: "m2",
            role: "assistant",
            text: "An answer [p1].",
            citations: [citation],
          },
        ],
      },
    } as never);
    const { rerender } = render(panel());
    open();
    expect(
      await screen.findByRole("button", { name: /Join source/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("Read Joins")).toBeInTheDocument();

    act(() => useLessonPanelStore.setState({ ownerLessonId: 10 }));
    rerender(panel({ id: 10, name: "Views" } as Lesson));

    expect(await screen.findByText("An answer.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Join source/ })).toBeNull();
    expect(screen.queryByText(/^Read /)).toBeNull();
  });

  describe("at phone width", () => {
    beforeEach(() => jest.mocked(useMediaQuery).mockReturnValue(false));

    it("switches between the list and the conversation", async () => {
      renderPanel();
      open();
      await screen.findByText("An answer.");

      await showList();
      expect(screen.queryByText("An answer.")).toBeNull();
      await userEvent.click(
        screen.getByRole("button", { name: "Back to chat" }),
      );
      expect(screen.getByText("An answer.")).toBeInTheDocument();

      await showList();
      await userEvent.click(screen.getByRole("button", { name: /^Why index/ }));
      expect(
        await screen.findByRole("textbox", { name: /ask about/i }),
      ).toBeVisible();
      expect(screen.queryByRole("list", { name: "Saved chats" })).toBeNull();
    });

    it("announces a failed open in the sheet, not only a toast", async () => {
      renderPanel();
      open();
      await screen.findByText("An answer.");
      await showList();
      jest
        .mocked(getMentorChat)
        .mockResolvedValueOnce({ ok: false, error: "failed" });
      await userEvent.click(screen.getByRole("button", { name: /^Why index/ }));

      expect(
        await screen.findByText("Couldn't open that chat"),
      ).toBeInTheDocument();
    });
  });
});
