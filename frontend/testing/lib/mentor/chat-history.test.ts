/** @jest-environment node */
import { revalidateTag } from "next/cache";
import {
  deleteMentorChatOf,
  errorName,
  ownedChat,
  saveMentorExchange,
  startMentorChat,
} from "@/lib/mentor/chat-history";
import { fakeMentorStrapi } from "@/testing/mocks/mentorChatStrapiMock";

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

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

  it("refreshes the user's cached chat list when a chat starts", async () => {
    await start(7);

    expect(revalidateTag).toHaveBeenCalledWith("mentor-chats-7");
  });

  it("returns the chat to its owner and null to anyone else", async () => {
    const id = await start(7);

    expect(await ownedChat(7, id)).toMatchObject({ documentId: id });
    expect(await ownedChat(8, id)).toBeNull();
    expect(await ownedChat(7, "not a document id!")).toBeNull();
    expect(await ownedChat(0, id)).toBeNull();
  });

  it("matches the kind when given, whatever the lesson", async () => {
    const id = await start(7);

    expect(await ownedChat(7, id, { kind: "lesson" })).not.toBeNull();
    expect(await ownedChat(7, id, { kind: "explain" })).toBeNull();
  });

  it("keeps the HTTP status in the error it throws", async () => {
    const id = await start(7);
    global.fetch = jest.fn(
      async () => new Response("{}", { status: 503 }),
    ) as never;

    const error = await ownedChat(7, id).catch((e) => e);

    expect(errorName(error)).toMatch(/GET .*owned\/.* 503$/);
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

describe("saveMentorExchange length", () => {
  it("cuts a question and answer over 20000 characters so they are still saved", async () => {
    const chatDocumentId = await start(7);

    await saveMentorExchange({
      chatDocumentId,
      userId: 7,
      question: "q".repeat(25000),
      answer: "a".repeat(30000),
      citations: [],
    });

    expect(store.messages.map((m) => (m.text as string).length)).toEqual([
      20000, 20000,
    ]);
  });
});

describe("deleteMentorChatOf", () => {
  it("deletes the owner's chat with its messages and says no for anyone else", async () => {
    const id = await start(7);
    await saveMentorExchange({
      chatDocumentId: id,
      userId: 7,
      question: "q",
      answer: "a",
      citations: [],
    });

    expect(await deleteMentorChatOf(8, id)).toBe(false);
    expect(store.chats).toHaveLength(1);
    expect(await deleteMentorChatOf(7, id)).toBe(true);
    expect(store.chats).toHaveLength(0);
    expect(store.messages).toHaveLength(0);
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
    await deleteMentorChatOf(7, id).catch(() => {});

    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(secret);
  });
});
