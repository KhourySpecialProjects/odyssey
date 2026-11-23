import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MentorChatsPage } from "@/components/feed/mentor-chats-page";
import {
  deleteAllMentorChats,
  deleteMentorChat,
  getMentorChat,
  listMentorChats,
} from "@/lib/requests/mentor-chats";

const replace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/activity/mentor-chats",
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));
jest.mock("@/lib/requests/mentor-chats", () => ({
  listMentorChats: jest.fn(),
  getMentorChat: jest.fn(),
  deleteMentorChat: jest.fn(),
  deleteAllMentorChats: jest.fn(),
}));

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
const chat = (documentId: string, title: string, over = {}) => ({
  documentId,
  kind: "lesson" as const,
  title,
  lastMessageAt: hoursAgo(2),
  lesson: { id: 9, name: "Joins", slug: "joins" },
  droplet: { id: 3, name: "SQL Basics", slug: "sql-basics" },
  ...over,
});
const CHATS = [
  chat("chatAAAA1111", "What is a join?"),
  chat("chatBBBB2222", "Explain this", { kind: "explain" }),
];
const user = () => userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest
    .mocked(listMentorChats)
    .mockResolvedValue({ ok: true, data: CHATS as never });
  jest.mocked(getMentorChat).mockResolvedValue({
    ok: true,
    data: {
      chat: CHATS[0] as never,
      messages: [
        {
          documentId: "m1",
          role: "user",
          text: "What is a join?",
          citations: null,
        },
        {
          documentId: "m2",
          role: "assistant",
          text: "It combines rows.",
          citations: [],
        },
      ],
    },
  });
  jest.mocked(deleteMentorChat).mockResolvedValue({ ok: true });
  jest.mocked(deleteAllMentorChats).mockResolvedValue({ ok: true, deleted: 2 });
});
afterEach(() => jest.useRealTimers());

describe("MentorChatsPage", () => {
  it("lists chats in order with where they started and an Explain badge", async () => {
    render(<MentorChatsPage />);

    const list = await screen.findByRole("list", { name: "Saved chats" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("What is a join?");
    expect(rows[0]).toHaveTextContent(
      "Started in Joins · SQL Basics · 2 hr ago",
    );
    expect(rows[1]).toHaveTextContent("Explain");
    expect(screen.getByText("2 chats")).toBeInTheDocument();
  });

  it("searches after a pause without touching the URL, and clears", async () => {
    const u = user();
    render(<MentorChatsPage />);
    await screen.findByRole("list");
    const url = window.location.href;

    await u.type(
      screen.getByRole("searchbox", { name: "Search Mentor chats" }),
      "join",
    );
    expect(listMentorChats).toHaveBeenCalledTimes(1);
    act(() => jest.advanceTimersByTime(300));
    await waitFor(() =>
      expect(listMentorChats).toHaveBeenLastCalledWith({ q: "join" }),
    );
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.href).toBe(url);

    await u.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("searchbox")).toHaveValue("");
    await waitFor(() => expect(listMentorChats).toHaveBeenLastCalledWith({}));
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.href).toBe(url);
  });

  it("keeps characters typed while a search is loading and shows no-results", async () => {
    const u = user();
    render(<MentorChatsPage />);
    await screen.findByRole("list");
    jest.mocked(listMentorChats).mockResolvedValue({ ok: true, data: [] });

    const box = screen.getByRole("searchbox");
    await u.type(box, "zzz");
    act(() => jest.advanceTimersByTime(300));
    await u.type(box, "y");

    expect(box).toHaveValue("zzzy");
    await waitFor(() =>
      expect(screen.getByText("No chats match ‘zzz’")).toBeInTheDocument(),
    );
  });

  it("shows the empty state without a delete-all button", async () => {
    jest.mocked(listMentorChats).mockResolvedValue({ ok: true, data: [] });
    render(<MentorChatsPage />);

    expect(await screen.findByText("No saved chats yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete all chats" }),
    ).toBeNull();
  });

  it("asks the student to sign in when signed out", async () => {
    jest
      .mocked(listMentorChats)
      .mockResolvedValue({ ok: false, error: "unauthenticated" });
    render(<MentorChatsPage />);

    expect(
      await screen.findByText("Sign in to see your Mentor chats."),
    ).toBeInTheDocument();
  });

  it("expands a row to its conversation with a Continue in lesson link", async () => {
    render(<MentorChatsPage />);
    const u = user();
    await u.click(
      await screen.findByRole("button", { name: /^What is a join\?/ }),
    );

    expect(await screen.findByText("It combines rows.")).toBeInTheDocument();
    expect(getMentorChat).toHaveBeenCalledWith("chatAAAA1111");
    expect(
      screen.getByRole("link", { name: "Continue in lesson" }),
    ).toHaveAttribute("href", "/d/sql-basics/joins?mentorChat=chatAAAA1111");
  });

  it("offers no Continue link on an Explain chat", async () => {
    render(<MentorChatsPage />);
    await user().click(
      await screen.findByRole("button", { name: /^Explain this/ }),
    );

    await screen.findByText("Mentor");
    expect(
      screen.queryByRole("link", { name: "Continue in lesson" }),
    ).toBeNull();
  });

  it("asks before deleting one chat, then removes it", async () => {
    const u = user();
    render(<MentorChatsPage />);
    await u.click(
      await screen.findByRole("button", {
        name: "Delete chat: What is a join?",
      }),
    );

    expect(
      screen.getByText("Delete this chat? This can't be undone."),
    ).toBeInTheDocument();
    expect(deleteMentorChat).not.toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(screen.queryByText("What is a join?")).toBeNull(),
    );
    expect(deleteMentorChat).toHaveBeenCalledWith("chatAAAA1111");
    expect(screen.getByText("Explain this")).toBeInTheDocument();
  });

  it("asks before deleting all chats, then empties the list", async () => {
    const u = user();
    render(<MentorChatsPage />);
    await u.click(
      await screen.findByRole("button", { name: "Delete all chats" }),
    );

    expect(
      screen.getByText("Delete all your Mentor chats? This can't be undone."),
    ).toBeInTheDocument();
    expect(deleteAllMentorChats).not.toHaveBeenCalled();
    await u.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("No saved chats yet")).toBeInTheDocument();
    expect(deleteAllMentorChats).toHaveBeenCalledTimes(1);
  });

  it("keeps the chat when cancelling", async () => {
    const u = user();
    render(<MentorChatsPage />);
    await u.click(
      await screen.findByRole("button", { name: "Delete all chats" }),
    );
    await u.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteAllMentorChats).not.toHaveBeenCalled();
    expect(screen.getByText("What is a join?")).toBeInTheDocument();
  });

  it("uses no role=status live regions", async () => {
    const u = user();
    const { container } = render(<MentorChatsPage />);
    await u.click(
      await screen.findByRole("button", { name: /^What is a join\?/ }),
    );
    await screen.findByText("It combines rows.");

    expect(container.querySelectorAll("[role='status']")).toHaveLength(0);
  });

  describe("focus after the delete dialog", () => {
    const openOne = async (u: ReturnType<typeof user>) => {
      const button = await screen.findByRole("button", {
        name: "Delete chat: What is a join?",
      });
      await u.click(button);
      return button;
    };

    it("returns to the opening button after Cancel", async () => {
      const u = user();
      render(<MentorChatsPage />);
      const button = await openOne(u);
      await u.click(screen.getByRole("button", { name: "Cancel" }));

      await waitFor(() => expect(button).toHaveFocus());
    });

    it("returns to the opening button after Escape", async () => {
      const u = user();
      render(<MentorChatsPage />);
      const button = await openOne(u);
      await u.keyboard("{Escape}");

      await waitFor(() => expect(button).toHaveFocus());
    });

    it("returns to the opening button after a failed delete", async () => {
      jest
        .mocked(deleteMentorChat)
        .mockResolvedValue({ ok: false, error: "failed" } as never);
      const u = user();
      render(<MentorChatsPage />);
      const button = await openOne(u);
      await u.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() => expect(button).toHaveFocus());
    });

    it("moves to the heading after a successful delete", async () => {
      const u = user();
      render(<MentorChatsPage />);
      await openOne(u);
      await u.click(screen.getByRole("button", { name: "Delete" }));

      await waitFor(() =>
        expect(
          screen.getByRole("heading", { name: "Mentor chats" }),
        ).toHaveFocus(),
      );
    });
  });

  it("says Delete all removes every chat, not only the matches, while searching", async () => {
    const u = user();
    render(<MentorChatsPage />);
    await screen.findByRole("list");
    jest
      .mocked(listMentorChats)
      .mockResolvedValue({ ok: true, data: [CHATS[0]] as never });
    await u.type(screen.getByRole("searchbox"), "join");
    act(() => jest.advanceTimersByTime(300));
    await screen.findByText("1 chat match ‘join’");

    await u.click(screen.getByRole("button", { name: "Delete all chats" }));

    expect(
      screen.getByText(
        "This deletes all 2 of your chats, not only the ones matching ‘join’. This can't be undone.",
      ),
    ).toBeInTheDocument();
  });
});
