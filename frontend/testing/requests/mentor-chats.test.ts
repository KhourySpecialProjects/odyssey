/** @jest-environment node */
import { revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import {
  deleteAllMentorChats,
  deleteMentorChat,
  getMentorChat,
  listMentorChats,
} from "@/lib/requests/mentor-chats";
import { saveMentorExchange, startMentorChat } from "@/lib/mentor/chat-history";
import { fakeMentorStrapi } from "@/testing/mocks/mentorChatStrapiMock";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/auth/require-role", () => ({ requireRole: jest.fn() }));

const gate = jest.mocked(requireRole);
let store: ReturnType<typeof fakeMentorStrapi>;

/** A chat with one saved exchange */
async function saved(userId: number, question = "What is an index?") {
  const chatDocumentId = await startMentorChat({
    userId,
    dropletId: 5,
    lessonId: 9,
    kind: "lesson",
    title: question,
  });
  await saveMentorExchange({
    chatDocumentId,
    userId,
    question,
    answer: "It speeds reads.",
    citations: [],
  });
  return chatDocumentId;
}

beforeEach(() => {
  jest.clearAllMocks();
  store = fakeMentorStrapi();
  global.fetch = store.fetchMock as unknown as typeof fetch;
  process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://strapi.invalid";
  gate.mockResolvedValue({
    ok: true,
    user: { id: 7, email: "s@example.invalid", roles: [] },
  } as never);
});

describe("signed out", () => {
  it("rejects every action and touches nothing", async () => {
    gate.mockResolvedValue({ ok: false, error: "unauthenticated" });

    const results = await Promise.all([
      listMentorChats(),
      getMentorChat("abcdefgh1234"),
      deleteMentorChat("abcdefgh1234"),
      deleteAllMentorChats(),
    ]);

    expect(results).toEqual(
      Array(4).fill({ ok: false, error: "unauthenticated" }),
    );
    expect(store.fetchMock).not.toHaveBeenCalled();
    expect(gate).toHaveBeenCalledWith([]);
  });
});

describe("listMentorChats", () => {
  it("lists only the caller's saved chats, newest first", async () => {
    const first = await saved(7, "first");
    await new Promise((r) => setTimeout(r, 5));
    const second = await saved(7, "second");
    await saved(8, "someone else's");

    const res = await listMentorChats();

    expect(res.ok && res.data.map((c) => c.documentId)).toEqual([
      second,
      first,
    ]);
  });

  it("refuses a bad lessonId", async () => {
    expect(await listMentorChats({ lessonId: -1 })).toEqual({
      ok: false,
      error: "not_found",
    });
  });
});

describe("getMentorChat", () => {
  it("returns the caller's chat with its messages, oldest first", async () => {
    const id = await saved(7);

    const res = await getMentorChat(id);

    expect(res.ok && res.data.messages.map((m) => m.role)).toEqual([
      "user",
      "assistant",
    ]);
  });

  it("answers not found for another user's chat", async () => {
    const id = await saved(8);

    expect(await getMentorChat(id)).toEqual({ ok: false, error: "not_found" });
  });
});

describe("deleteMentorChat", () => {
  it("deletes the chat and its messages, and revalidates", async () => {
    const id = await saved(7);

    expect(await deleteMentorChat(id)).toEqual({ ok: true });
    expect(store.chats).toHaveLength(0);
    expect(store.messages).toHaveLength(0);
    expect(revalidateTag).toHaveBeenCalledWith("mentor-chats-7");
  });

  it("cannot delete another user's chat", async () => {
    const id = await saved(8);

    expect(await deleteMentorChat(id)).toEqual({
      ok: false,
      error: "not_found",
    });
    expect(store.chats).toHaveLength(1);
    expect(store.messages).toHaveLength(2);
  });
});

describe("deleteAllMentorChats", () => {
  it("deletes only the caller's chats", async () => {
    await saved(7, "a");
    await saved(7, "b");
    const theirs = await saved(8, "c");

    expect(await deleteAllMentorChats()).toEqual({ ok: true, deleted: 2 });
    expect(store.chats.map((c) => c.documentId)).toEqual([theirs]);
    expect(store.messages.every((m) => m.chat === theirs)).toBe(true);
  });
});
