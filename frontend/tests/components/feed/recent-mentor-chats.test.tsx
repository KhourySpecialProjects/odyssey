import { render, screen, within } from "@testing-library/react";
import { RecentMentorChats } from "@/components/feed/recent-mentor-chats";
import { getCurrentUser } from "@/lib/auth/session";
import { listMentorChats } from "@/lib/requests/mentor-chats";

jest.mock("@/lib/auth/session", () => ({ getCurrentUser: jest.fn() }));
jest.mock("@/lib/requests/mentor-chats", () => ({
  listMentorChats: jest.fn(),
}));

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600e3).toISOString();
const chat = (documentId: string, title: string, over = {}) => ({
  documentId,
  kind: "lesson" as const,
  title,
  lastMessageAt: hoursAgo(2),
  lesson: { name: "Joins", slug: "joins" },
  droplet: { name: "SQL Basics", slug: "sql-basics" },
  ...over,
});
const ok = (data: unknown[]) =>
  jest.mocked(listMentorChats).mockResolvedValue({ ok: true, data } as never);
const show = async () => render(await RecentMentorChats());

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(getCurrentUser)
    .mockResolvedValue({ email: "a@b.edu", roles: ["User"] } as never);
});

describe("RecentMentorChats", () => {
  it("lists only the 3 newest with lesson and explain links", async () => {
    ok([
      chat("chatAAAA1111", "What is a join?"),
      chat("chatBBBB2222", "Explain this", { kind: "explain" }),
      chat("chatCCCC3333", "Third"),
      chat("chatDDDD4444", "Fourth"),
    ]);
    await show();
    expect(
      screen.getByRole("heading", { name: "Recent Mentor chats" }),
    ).toBeInTheDocument();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(screen.queryByText("Fourth")).not.toBeInTheDocument();
    expect(
      screen.getAllByText("Started in Joins · SQL Basics · 2 hr ago"),
    ).toHaveLength(3);
    expect(
      screen.getByRole("link", { name: "Continue: What is a join?" }),
    ).toHaveAttribute("href", "/d/sql-basics/joins?mentorChat=chatAAAA1111");
    expect(
      screen.getByRole("link", { name: "View in Mentor chats: Explain this" }),
    ).toHaveAttribute("href", "/activity/mentor-chats");
    expect(screen.getByRole("link", { name: "See all" })).toHaveAttribute(
      "href",
      "/activity/mentor-chats",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders nothing with no chats", async () => {
    ok([]);
    expect(await RecentMentorChats()).toBeNull();
  });

  it("renders nothing when signed out, without listing", async () => {
    jest.mocked(getCurrentUser).mockResolvedValue(null as never);
    expect(await RecentMentorChats()).toBeNull();
    expect(listMentorChats).not.toHaveBeenCalled();
  });

  it("renders nothing for faculty", async () => {
    jest
      .mocked(getCurrentUser)
      .mockResolvedValue({ email: "p@b.edu", roles: ["Faculty"] } as never);
    expect(await RecentMentorChats()).toBeNull();
    expect(listMentorChats).not.toHaveBeenCalled();
  });

  it("renders nothing when the list fails or throws", async () => {
    jest
      .mocked(listMentorChats)
      .mockResolvedValue({ ok: false, error: "failed" });
    expect(await RecentMentorChats()).toBeNull();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.mocked(listMentorChats).mockRejectedValue(new Error("boom"));
    expect(await RecentMentorChats()).toBeNull();
  });
});
