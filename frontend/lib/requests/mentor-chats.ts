"use server";

import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  chatApi,
  deleteChatRows,
  deleteMentorChatsOf,
  errorName,
  ownedChat,
  purgeExpiredMentorChats,
  type MentorChatRow,
} from "@/lib/mentor/chat-history";
import type { Citation } from "@/lib/mentor/types";
import { chatIdSchema } from "@/lib/validations/mentor";

// The signed-in student's saved Mentor chats (ODY-937). Owner only: every
// export takes the caller from the session and never from an argument, and
// instructors have no way in. Errors are logged by name, never with text.

export type MentorChatSummary = MentorChatRow & {
  droplet: { name: string; slug: string } | null;
  lesson: { name: string; slug: string } | null;
};
export type MentorChatMessage = {
  id: number;
  documentId: string;
  role: "user" | "assistant";
  text: string;
  citations: Citation[] | null;
};
type Failure = { ok: false; error: "unauthenticated" | "not_found" | "failed" };

const listSchema = z.object({
  lessonId: z.number().int().positive().optional(),
});

function failed(error: unknown): Failure {
  console.error("[mentor] chat history failed:", errorName(error));
  return { ok: false, error: "failed" };
}

/** The student's chats, newest first. Chats over 30 days old are deleted first. */
export async function listMentorChats(
  input: { lessonId?: number } = {},
): Promise<{ ok: true; data: MentorChatSummary[] } | Failure> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: "unauthenticated" };
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "not_found" };
  const userId = gate.user.id;
  try {
    await purgeExpiredMentorChats(userId);
    const rows = await chatApi<MentorChatSummary[] | null>(
      "GET",
      "/mentor-chats",
      {
        query: {
          filters: {
            authorizedUser: { id: { $eq: userId } },
            lastMessageAt: { $notNull: true },
            ...(parsed.data.lessonId !== undefined && {
              lesson: { id: { $eq: parsed.data.lessonId } },
            }),
          },
          fields: ["documentId", "kind", "title", "lastMessageAt"],
          populate: {
            droplet: { fields: ["name", "slug"] },
            lesson: { fields: ["name", "slug"] },
          },
          sort: ["lastMessageAt:desc"],
          pagination: { pageSize: 100 },
        },
        next: { revalidate: 60, tags: [CACHE_TAGS.mentorChats(userId)] },
      },
    );
    return { ok: true, data: rows ?? [] };
  } catch (error) {
    return failed(error);
  }
}

/** One of the student's chats with its messages, oldest first. */
export async function getMentorChat(
  chatId: string,
): Promise<
  | { ok: true; data: { chat: MentorChatRow; messages: MentorChatMessage[] } }
  | Failure
> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: "unauthenticated" };
  const id = chatIdSchema.safeParse(chatId);
  if (!id.success) return { ok: false, error: "not_found" };
  try {
    const chat = await ownedChat(gate.user.id, id.data);
    if (!chat) return { ok: false, error: "not_found" };
    const messages = await chatApi<MentorChatMessage[] | null>(
      "GET",
      "/mentor-messages",
      {
        query: {
          filters: { chat: { documentId: { $eq: chat.documentId } } },
          fields: ["documentId", "role", "text", "citations"],
          sort: ["createdAt:asc", "id:asc"],
          pagination: { pageSize: 100 },
        },
      },
    );
    return { ok: true, data: { chat, messages: messages ?? [] } };
  } catch (error) {
    return failed(error);
  }
}

/** Deletes one of the student's chats and its messages. */
export async function deleteMentorChat(
  chatId: string,
): Promise<{ ok: true } | Failure> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: "unauthenticated" };
  const id = chatIdSchema.safeParse(chatId);
  if (!id.success) return { ok: false, error: "not_found" };
  try {
    const chat = await ownedChat(gate.user.id, id.data);
    if (!chat) return { ok: false, error: "not_found" };
    await deleteChatRows(chat.documentId);
    revalidateTag(CACHE_TAGS.mentorChats(gate.user.id));
    return { ok: true };
  } catch (error) {
    return failed(error);
  }
}

/** Deletes every chat of the signed-in student. */
export async function deleteAllMentorChats(): Promise<
  { ok: true; deleted: number } | Failure
> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: "unauthenticated" };
  try {
    return { ok: true, deleted: await deleteMentorChatsOf(gate.user.id) };
  } catch (error) {
    return failed(error);
  }
}
