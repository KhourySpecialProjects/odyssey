import "server-only";
import { revalidateTag } from "next/cache";
import qs from "qs";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { readJsonOrNull } from "@/lib/strapi-response";
import { STRAPI_RESPONSE_FORMAT_HEADER } from "@/lib/utils";
import type { Citation } from "./types";

// Saved Mentor chats (ODY-937), through Strapi's custom /mentor-chats/owned
// routes with the service token. Strapi owns the owner check, the 30-day
// rule and the cleanup. Not a "use server" file: it trusts the user id it is
// given. It never logs text, titles or questions, only ids and statuses.

export const MENTOR_CHAT_TITLE_MAX = 80;
/** Strapi rejects message text longer than this */
const MENTOR_TEXT_MAX = 20000;
const DOCUMENT_ID = /^[A-Za-z0-9]{8,40}$/;

export type MentorChatRow = {
  documentId: string;
  kind: "lesson" | "explain";
  title: string | null;
  lastMessageAt: string | null;
  /** Where the chat started */
  droplet?: { id: number; name: string } | null;
  lesson?: { id: number; name: string } | null;
};

export const isChatId = (value: unknown): value is string =>
  typeof value === "string" && DOCUMENT_ID.test(value);

export class MentorChatRequestError extends Error {
  constructor(
    method: string,
    path: string,
    readonly status: number,
  ) {
    super(`Strapi ${method} ${path} ${status}`);
    this.name = "MentorChatRequestError";
  }
}

/** What a log line may say about an error: request errors keep method, path and status */
export const errorName = (error: unknown) =>
  error instanceof MentorChatRequestError
    ? error.message
    : error instanceof Error
      ? error.name
      : "UnknownError";

/** One Strapi call. Throws a bare error with the status, never the body. */
export async function chatApi<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  options: {
    query?: object;
    body?: object;
    next?: { revalidate: number; tags: string[] };
  } = {},
): Promise<T> {
  const query = qs.stringify(options.query, { encodeValuesOnly: true });
  const url = `${process.env.NEXT_PUBLIC_STRAPI_API_URL}/api/mentor-chats${path}${query ? `?${query}` : ""}`;
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
    throw new MentorChatRequestError(
      method,
      `/mentor-chats${path}`,
      response.status,
    );
  }
  const json = await readJsonOrNull(response);
  return json?.data as T;
}

/** Starts a chat and returns its documentId. The title is the question, cut to 80. */
export async function startMentorChat(input: {
  userId: number;
  dropletId: number;
  lessonId: number;
  kind: "lesson" | "explain";
  title: string;
}): Promise<string> {
  const created = await chatApi<{ documentId: string }>("POST", "/start", {
    body: {
      ...input,
      title: input.title.trim().slice(0, MENTOR_CHAT_TITLE_MAX),
    },
  });
  return created.documentId;
}

/**
 * The chat if `userId` owns it, it is under 30 days old and it matches the
 * kind when given, on any lesson, else null. A bad id is null, not an error.
 */
export async function ownedChat(
  userId: number,
  chatDocumentId: string,
  match: { kind?: "lesson" | "explain" } = {},
): Promise<MentorChatRow | null> {
  if (!Number.isInteger(userId) || userId < 1 || !isChatId(chatDocumentId)) {
    return null;
  }
  try {
    const found = await chatApi<{ chat: MentorChatRow }>(
      "GET",
      `/owned/${chatDocumentId}`,
      { query: { userId, ...match } },
    );
    return found?.chat ?? null;
  } catch (error) {
    if (error instanceof MentorChatRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/** Writes the question and answer (cut to 20000 characters, the Strapi limit). Strapi re-checks the chat first. */
export async function saveMentorExchange(input: {
  chatDocumentId: string;
  /** Whose chat it is */
  userId: number;
  question: string;
  answer: string;
  citations: Citation[];
}): Promise<void> {
  await chatApi("POST", `/owned/${input.chatDocumentId}/exchange`, {
    body: {
      userId: input.userId,
      question: input.question.slice(0, MENTOR_TEXT_MAX),
      answer: input.answer.slice(0, MENTOR_TEXT_MAX),
      citations: input.citations,
    },
  });
  revalidateTag(CACHE_TAGS.mentorChats(input.userId));
}

/** Deletes one of the user's chats and all its messages. False if it isn't theirs. */
export async function deleteMentorChatOf(
  userId: number,
  chatDocumentId: string,
): Promise<boolean> {
  try {
    await chatApi("DELETE", `/owned/${chatDocumentId}`, { query: { userId } });
  } catch (error) {
    if (error instanceof MentorChatRequestError && error.status === 404) {
      return false;
    }
    throw error;
  }
  revalidateTag(CACHE_TAGS.mentorChats(userId));
  return true;
}

/** Deletes all of one student's chats. Returns how many. */
export async function deleteMentorChatsOf(userId: number): Promise<number> {
  const result = await chatApi<{ deleted: number }>("DELETE", "/owned", {
    query: { userId },
  });
  revalidateTag(CACHE_TAGS.mentorChats(userId));
  return result?.deleted ?? 0;
}
