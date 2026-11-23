import qs from "qs";

// An in-memory stand-in for Strapi's /mentor-chats/owned routes (ODY-937).
// Strapi's own tests cover the 30-day rule; this checks what the frontend sends.

export type FakeChat = {
  documentId: string;
  userId: number;
  lessonId: number;
  kind: string;
  title: string;
  lastMessageAt: string | null;
};
export type FakeMessage = {
  documentId: string;
  chat: string;
  role: string;
  text: string;
  citations: unknown;
};

export function fakeMentorStrapi() {
  const chats: FakeChat[] = [];
  const messages: FakeMessage[] = [];
  let next = 0;

  const handle = async (url: string, init: RequestInit = {}) => {
    const [path, query = ""] = url
      .replace(/^.*\/api\/mentor-chats/, "")
      .split("?");
    const q = qs.parse(query) as Record<string, string>;
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body as string) : {};
    const json = (data: unknown) => new Response(JSON.stringify({ data }));
    const missing = () => new Response("{}", { status: 404 });
    const userId = Number(q.userId ?? body.userId);
    const [, , documentId, action] = path.split("/");

    if (path === "/start") {
      next += 1;
      const row: FakeChat = {
        documentId: `chat${String(next).padStart(8, "0")}`,
        userId,
        lessonId: body.lessonId,
        kind: body.kind,
        title: body.title,
        lastMessageAt: null,
      };
      chats.push(row);
      return json({ documentId: row.documentId });
    }
    const owned = chats.find(
      (c) => c.documentId === documentId && c.userId === userId,
    );
    if (path === "/owned") {
      if (method === "DELETE") {
        const mine = chats.filter((c) => c.userId === userId);
        for (const c of mine) removeChat(c);
        return json({ deleted: mine.length });
      }
      return json(
        chats
          .filter(
            (c) =>
              c.userId === userId &&
              c.lastMessageAt !== null &&
              (q.lessonId === undefined || `${c.lessonId}` === q.lessonId),
          )
          .sort((a, b) => b.lastMessageAt!.localeCompare(a.lastMessageAt!)),
      );
    }
    if (
      !owned ||
      (q.lessonId !== undefined && `${owned.lessonId}` !== q.lessonId) ||
      (q.kind !== undefined && owned.kind !== q.kind)
    ) {
      return missing();
    }
    if (action === "exchange") {
      next += 2;
      messages.push(
        {
          documentId: `msg${next - 1}`,
          chat: owned.documentId,
          role: "user",
          text: body.question,
          citations: null,
        },
        {
          documentId: `msg${next}`,
          chat: owned.documentId,
          role: "assistant",
          text: body.answer,
          citations: body.citations ?? null,
        },
      );
      owned.lastMessageAt = new Date().toISOString();
      return json({ ok: true });
    }
    if (method === "DELETE") {
      removeChat(owned);
      return json({ deleted: 1 });
    }
    return json({
      chat: owned,
      ...(q.messages === "true" && {
        messages: messages.filter((m) => m.chat === owned.documentId),
      }),
    });
  };

  const removeChat = (chat: FakeChat) => {
    chats.splice(chats.indexOf(chat), 1);
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].chat === chat.documentId) messages.splice(i, 1);
    }
  };

  const fetchMock = jest.fn(handle);
  return { chats, messages, fetchMock };
}
