"use server";

import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  chatApi,
  deleteMentorChatOf,
  deleteMentorChatsOf,
  errorName,
  MentorChatRequestError,
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
  documentId: string;
  role: "user" | "assistant";
  text: string;
  citations: Citation[] | null;
};
type Failure = { ok: false; error: "unauthenticated" | "not_found" | "failed" };

const listSchema = z.object({
  lessonId: z.number().int().positive().optional(),
  q: z.string().trim().min(1).max(100).optional(),
});

function failed(error: unknown): Failure {
  console.error("[mentor] chat history failed:", errorName(error));
  return { ok: false, error: "failed" };
}

/** The student's chats, newest first, optionally matching `q` (title, droplet or lesson name). Chats over 30 days old are left out. */
export async function listMentorChats(
  input: { lessonId?: number; q?: string } = {},
): Promise<{ ok: true; data: MentorChatSummary[] } | Failure> {
  const gate = await requireRole([]);
  if (!gate.ok) return { ok: false, error: "unauthenticated" };
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "not_found" };
  const userId = gate.user.id;
  try {
    const rows = await chatApi<MentorChatSummary[] | null>("GET", "/owned", {
      query: { userId, lessonId: parsed.data.lessonId },
      // In a header, not the URL, so no request log carries what was typed
      headers: parsed.data.q
        ? { "X-Mentor-Search": encodeURIComponent(parsed.data.q) }
        : undefined,
      next: { revalidate: 60, tags: [CACHE_TAGS.mentorChats(userId)] },
    });
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
    const found = await chatApi<{
      chat: MentorChatRow;
      messages: MentorChatMessage[];
    }>("GET", `/owned/${id.data}`, {
      query: { userId: gate.user.id, messages: true },
    }).catch((error) => {
      if (error instanceof MentorChatRequestError && error.status === 404) {
        return null;
      }
      throw error;
    });
    if (!found) return { ok: false, error: "not_found" };
    return {
      ok: true,
      data: { chat: found.chat, messages: found.messages ?? [] },
    };
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
    const deleted = await deleteMentorChatOf(gate.user.id, id.data);
    return deleted ? { ok: true } : { ok: false, error: "not_found" };
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
