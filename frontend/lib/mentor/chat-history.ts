import "server-only";
import { revalidateTag } from "next/cache";
import qs from "qs";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { resolveDocumentId } from "@/lib/strapi-document-id";
import { readJsonOrNull } from "@/lib/strapi-response";
import { flattenAttributes, STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import type { Citation } from "./types";

// Saved Mentor chats (ODY-937), through Strapi's service-token routes. Not a
// "use server" file: these trust the user id they are given. They never log
// text, titles or questions, only ids, counts and error names.

export const MENTOR_CHAT_RETENTION_DAYS = 30;
export const MENTOR_CHAT_TITLE_MAX = 80;
const BATCH = 100;
const MAX_BATCHES = 20;
const DOCUMENT_ID = /^[A-Za-z0-9]{8,40}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type MentorChatRow = {
  id: number;
  documentId: string;
  kind: "lesson" | "explain";
  title: string | null;
  lastMessageAt: string | null;
};

export const isChatId = (value: unknown): value is string =>
  typeof value === "string" && DOCUMENT_ID.test(value);

/** What a log line may say about an error */
export const errorName = (error: unknown) =>
  error instanceof Error ? error.name : "UnknownError";

/** One Strapi call. Throws a bare error with the status, never the body. */
export async function chatApi<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  options: {
    query?: object;
    body?: object;
    next?: { revalidate: number; tags: string[] };
  } = {},
): Promise<T> {
  const query = qs.stringify(options.query, { encodeValuesOnly: true });
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api${path}${query ? `?${query}` : ""}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.STRAPI_ACCESS_TOKEN}`,
      ...STRAPI_RESPONSE_FORMAT_HEADER,
    },
    ...(options.body && { body: JSON.stringify(options.body) }),
    ...(options.next ? { next: options.next } : { cache: "no-store" as const }),
  });
  if (!response.ok) {
    const error = new Error(`Strapi ${method} ${path} ${response.status}`);
    error.name = "MentorChatRequestError";
    throw error;
  }
  const json = await readJsonOrNull(response);
  return flattenAttributes(json?.data) as T;
}

/** Starts a chat and returns its documentId. The title is the question, cut to 80. */
export async function startMentorChat(input: {
  userId: number;
  dropletId: number;
  lessonId: number;
  kind: "lesson" | "explain";
  title: string;
}): Promise<string> {
  const [authorizedUser, droplet, lesson] = await Promise.all([
    resolveDocumentId("authorized-users", input.userId),
    resolveDocumentId("droplets", input.dropletId),
    resolveDocumentId("lessons", input.lessonId),
  ]);
  const created = await chatApi<{ documentId: string }>(
    "POST",
    "/mentor-chats",
    {
      body: {
        data: {
          authorizedUser,
          droplet,
          lesson,
          kind: input.kind,
          title: input.title.trim().slice(0, MENTOR_CHAT_TITLE_MAX),
        },
      },
    },
  );
  return created.documentId;
}

/** The chat if `userId` owns it, else null. A bad id is null, not an error. */
export async function ownedChat(
  userId: number,
  chatDocumentId: string,
): Promise<MentorChatRow | null> {
  if (!Number.isInteger(userId) || userId < 1 || !isChatId(chatDocumentId)) {
    return null;
  }
  const rows = await chatApi<MentorChatRow[] | null>("GET", "/mentor-chats", {
    query: {
      filters: {
        documentId: { $eq: chatDocumentId },
        authorizedUser: { id: { $eq: userId } },
      },
      fields: ["documentId", "kind", "title", "lastMessageAt"],
      pagination: { pageSize: 1 },
    },
  });
  return rows?.[0] ?? null;
}

/** Writes the student's question and Mentor's answer, then moves lastMessageAt. */
export async function saveMentorExchange(input: {
  chatDocumentId: string;
  /** Whose chat it is, for the list cache */
  userId: number;
  question: string;
  answer: string;
  citations: Citation[];
}): Promise<void> {
  const chat = input.chatDocumentId;
  // In order, so the question sorts before its answer
  await chatApi("POST", "/mentor-messages", {
    body: { data: { chat, role: "user", text: input.question } },
  });
  await chatApi("POST", "/mentor-messages", {
    body: {
      data: {
        chat,
        role: "assistant",
        text: input.answer,
        citations: input.citations,
      },
    },
  });
  await chatApi("PUT", `/mentor-chats/${chat}`, {
    body: { data: { lastMessageAt: new Date().toISOString() } },
  });
  revalidateTag(CACHE_TAGS.mentorChats(input.userId));
}

/** Deletes a chat's messages, then the chat. */
export async function deleteChatRows(chatDocumentId: string): Promise<void> {
  for (let i = 0; i < MAX_BATCHES; i++) {
    const messages = await chatApi<{ documentId: string }[] | null>(
      "GET",
      "/mentor-messages",
      {
        query: {
          filters: { chat: { documentId: { $eq: chatDocumentId } } },
          fields: ["documentId"],
          pagination: { pageSize: BATCH },
        },
      },
    );
    if (!messages?.length) break;
    await Promise.all(
      messages.map((m) =>
        chatApi("DELETE", `/mentor-messages/${m.documentId}`),
      ),
    );
  }
  await chatApi("DELETE", `/mentor-chats/${chatDocumentId}`);
}

/** Deletes every chat matching `filters`, in batches. Returns how many. */
async function deleteChatsWhere(filters: object): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const chats = await chatApi<{ documentId: string }[] | null>(
      "GET",
      "/mentor-chats",
      {
        query: {
          filters,
          fields: ["documentId"],
          pagination: { pageSize: BATCH },
        },
      },
    );
    if (!chats?.length) break;
    for (const chat of chats) {
      await deleteChatRows(chat.documentId);
      deleted += 1;
    }
  }
  return deleted;
}

/** Deletes all of one student's chats. */
export async function deleteMentorChatsOf(userId: number): Promise<number> {
  const deleted = await deleteChatsWhere({
    authorizedUser: { id: { $eq: userId } },
  });
  revalidateTag(CACHE_TAGS.mentorChats(userId));
  return deleted;
}

/**
 * Deletes chats whose last message is over 30 days old (never-saved ones by
 * their creation date), for one student or everyone. Never throws.
 */
export async function purgeExpiredMentorChats(
  userId?: number,
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(
    now.getTime() - MENTOR_CHAT_RETENTION_DAYS * DAY_MS,
  ).toISOString();
  try {
    const deleted = await deleteChatsWhere({
      $or: [
        { lastMessageAt: { $lt: cutoff } },
        { lastMessageAt: { $null: true }, createdAt: { $lt: cutoff } },
      ],
      ...(userId !== undefined && { authorizedUser: { id: { $eq: userId } } }),
    });
    if (deleted > 0 && userId !== undefined) {
      revalidateTag(CACHE_TAGS.mentorChats(userId));
    }
    return deleted;
  } catch (error) {
    console.error("[mentor] chat purge failed:", errorName(error));
    return 0;
  }
}
