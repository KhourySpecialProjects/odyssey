/** @jest-environment node */
import { revalidateTag } from "next/cache";
import {
  deleteChatRows,
  MENTOR_CHAT_RETENTION_DAYS,
  ownedChat,
  purgeExpiredMentorChats,
  saveMentorExchange,
  startMentorChat,
} from "@/lib/mentor/chat-history";
import {
  agedChat,
  fakeMentorStrapi,
} from "@/testing/mocks/mentorChatStrapiMock";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));
jest.mock("@/lib/strapi-document-id", () => ({
  resolveDocumentId: jest.fn(async (c: string, id: number) => `${c}:${id}`),
}));

let store: ReturnType<typeof fakeMentorStrapi>;
const start = (userId = 7, title = "What is an index?") =>
  startMentorChat({
    userId,
    dropletId: 5,
    lessonId: 9,
    kind: "lesson",
    title,
  });

beforeEach(() => {
  jest.clearAllMocks();
  store = fakeMentorStrapi();
  global.fetch = store.fetchMock as unknown as typeof fetch;
  process.env.NEXT_PUBLIC_STRAPI_API_URL = "http://strapi.invalid";
});

describe("startMentorChat and ownedChat", () => {
  it("starts a chat for the user and cuts the title to 80 characters", async () => {
    const id = await start(7, `  ${"q".repeat(120)}  `);

    expect(store.chats).toEqual([
      expect.objectContaining({
        documentId: id,
        userId: 7,
        title: "q".repeat(80),
      }),
    ]);
  });

  it("returns the chat to its owner and null to anyone else", async () => {
    const id = await start(7);

    expect(await ownedChat(7, id)).toMatchObject({ documentId: id });
    expect(await ownedChat(8, id)).toBeNull();
    expect(await ownedChat(7, "not a document id!")).toBeNull();
    expect(await ownedChat(0, id)).toBeNull();
  });
});

describe("saveMentorExchange", () => {
  it("writes the question, then the answer, and sets lastMessageAt", async () => {
    const chatDocumentId = await start(7);

    await saveMentorExchange({
      chatDocumentId,
      userId: 7,
      question: "What is an index?",
      answer: "It speeds reads [p2].",
      citations: [{ ref: "p2" } as never],
    });

    expect(store.messages.map((m) => [m.role, m.chat])).toEqual([
      ["user", chatDocumentId],
      ["assistant", chatDocumentId],
    ]);
    expect(store.messages[1].citations).toEqual([{ ref: "p2" }]);
    expect(store.chats[0].lastMessageAt).not.toBeNull();
    expect(revalidateTag).toHaveBeenCalledWith("mentor-chats-7");
  });
});

describe("purgeExpiredMentorChats", () => {
  it("deletes only chats past 30 days, with their messages", async () => {
    expect(MENTOR_CHAT_RETENTION_DAYS).toBe(30);
    const old = agedChat(store, 7, 31);
    const recent = agedChat(store, 7, 29);

    expect(await purgeExpiredMentorChats()).toBe(1);

    expect(store.chats.map((c) => c.documentId)).toEqual([recent.documentId]);
    expect(store.messages.map((m) => m.chat)).toEqual([recent.documentId]);
    expect(store.messages.some((m) => m.chat === old.documentId)).toBe(false);
  });

  it("limits itself to one user when given one", async () => {
    agedChat(store, 7, 40);
    const other = agedChat(store, 8, 40);

    expect(await purgeExpiredMentorChats(7)).toBe(1);
    expect(store.chats.map((c) => c.documentId)).toEqual([other.documentId]);
    expect(revalidateTag).toHaveBeenCalledWith("mentor-chats-7");
  });

  it("deletes a chat that never got a message once it is 30 days old", async () => {
    const id = await start(7);
    store.chats[0].createdAt = new Date(
      Date.now() - 31 * 86_400_000,
    ).toISOString();

    expect(await purgeExpiredMentorChats(7)).toBe(1);
    expect(await ownedChat(7, id)).toBeNull();
  });

  it("keeps going quietly when Strapi fails", async () => {
    global.fetch = jest.fn(
      async () => new Response("{}", { status: 500 }),
    ) as never;
    jest.spyOn(console, "error").mockImplementation(() => {});

    expect(await purgeExpiredMentorChats()).toBe(0);
  });
});

describe("logging", () => {
  it("never passes message text, titles or questions to console", async () => {
    const secret = "SECRET-STUDENT-WORDS";
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => jest.spyOn(console, m).mockImplementation(() => {}),
    );
    const id = await start(7, secret);
    global.fetch = jest.fn(
      async () => new Response(`{"echo":"${secret}"}`, { status: 500 }),
    ) as never;

    await expect(
      saveMentorExchange({
        chatDocumentId: id,
        userId: 7,
        question: secret,
        answer: secret,
        citations: [],
      }),
    ).rejects.toThrow();
    await deleteChatRows(id).catch(() => {});
    await purgeExpiredMentorChats();

    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(secret);
  });
});
