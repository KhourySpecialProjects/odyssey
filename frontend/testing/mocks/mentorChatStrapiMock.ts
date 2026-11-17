import qs from "qs";

// An in-memory stand-in for Strapi's mentor-chats and mentor-messages routes
// (ODY-937): v4-shaped bodies, and the few filters chat-history.ts sends.

export type FakeChat = {
  id: number;
  documentId: string;
  userId: number;
  kind: string;
  title: string;
  lastMessageAt: string | null;
  createdAt: string;
};
export type FakeMessage = {
  id: number;
  documentId: string;
  chat: string;
  role: string;
  text: string;
  citations: unknown;
};

type Filters = Record<string, any>;

export function fakeMentorStrapi() {
  const chats: FakeChat[] = [];
  const messages: FakeMessage[] = [];
  let next = 0;
  const entry = <T extends { id: number }>(row: T) => ({
    id: row.id,
    attributes: { ...row },
  });

  const chatMatches = (c: FakeChat, f: Filters): boolean => {
    if (f.documentId && c.documentId !== f.documentId.$eq) return false;
    if (f.authorizedUser && `${c.userId}` !== f.authorizedUser.id.$eq) {
      return false;
    }
    if (f.lastMessageAt?.$notNull && c.lastMessageAt === null) return false;
    if (f.$or) {
      const any = (f.$or as Filters[]).some((o) => {
        if (o.lastMessageAt?.$lt) {
          return !!c.lastMessageAt && c.lastMessageAt < o.lastMessageAt.$lt;
        }
        return c.lastMessageAt === null && c.createdAt < o.createdAt.$lt;
      });
      if (!any) return false;
    }
    return true;
  };

  const handle = async (url: string, init: RequestInit = {}) => {
    const [path, query = ""] = url.replace(/^.*\/api/, "").split("?");
    const q = qs.parse(query);
    const filters = (q.filters ?? {}) as Filters;
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(init.body as string).data : null;
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify({ data }), { status });
    const [, collection, documentId] = path.split("/");

    if (collection === "mentor-chats") {
      if (method === "POST") {
        const id = (next += 1);
        const row: FakeChat = {
          id,
          documentId: `chat${String(id).padStart(8, "0")}`,
          userId: Number(String(body.authorizedUser).split(":")[1]),
          kind: body.kind,
          title: body.title,
          lastMessageAt: null,
          createdAt: new Date().toISOString(),
        };
        chats.push(row);
        return json(entry(row), 201);
      }
      if (method === "PUT") {
        const row = chats.find((c) => c.documentId === documentId);
        if (!row) return new Response("{}", { status: 404 });
        Object.assign(row, body);
        return json(entry(row));
      }
      if (method === "DELETE") {
        const at = chats.findIndex((c) => c.documentId === documentId);
        if (at < 0) return new Response("{}", { status: 404 });
        chats.splice(at, 1);
        return new Response(null, { status: 204 });
      }
      const rows = chats
        .filter((c) => chatMatches(c, filters))
        .sort((a, b) =>
          (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""),
        );
      return json(rows.map(entry));
    }

    if (method === "POST") {
      const id = (next += 1);
      const row: FakeMessage = {
        id,
        documentId: `msg${String(id).padStart(8, "0")}`,
        chat: body.chat,
        role: body.role,
        text: body.text,
        citations: body.citations ?? null,
      };
      messages.push(row);
      return json(entry(row), 201);
    }
    if (method === "DELETE") {
      const at = messages.findIndex((m) => m.documentId === documentId);
      if (at >= 0) messages.splice(at, 1);
      return new Response(null, { status: 204 });
    }
    const wanted = filters.chat?.documentId?.$eq;
    return json(messages.filter((m) => m.chat === wanted).map(entry));
  };

  const fetchMock = jest.fn(handle);
  return { chats, messages, fetchMock };
}

/** A chat row put in the fake store directly, `days` old */
export function agedChat(
  store: ReturnType<typeof fakeMentorStrapi>,
  userId: number,
  days: number,
  title = "old question",
): FakeChat {
  const at = new Date(Date.now() - days * 86_400_000).toISOString();
  const id = 1000 + store.chats.length;
  const chat: FakeChat = {
    id,
    documentId: `aged${String(id).padStart(8, "0")}`,
    userId,
    kind: "lesson",
    title,
    lastMessageAt: at,
    createdAt: at,
  };
  store.chats.push(chat);
  store.messages.push({
    id: id + 5000,
    documentId: `agedmsg${id}`,
    chat: chat.documentId,
    role: "user",
    text: "old words",
    citations: null,
  });
  return chat;
}
