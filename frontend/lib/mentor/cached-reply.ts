import "server-only";
import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { MentorCompleted } from "./answer";
import type { MentorAsk } from "./ask";
import { storeCachedReply, type CachedReplyRow } from "./cached-reply-store";
import {
  buildMentorRequest,
  MENTOR_NOT_COVERED,
  MENTOR_PROMPT_VERSION,
  MENTOR_SETUP,
  type MentorSetup,
} from "./prompt";
import { summaryRequest } from "./summary-request";
import type { LessonContext } from "./types";

// Saved Mentor replies (ODY-967): the key a reply is saved under, what may be
// saved, and saving it. A key hashes everything the model reads, so any
// change to the lesson, prompt, model or effort is a miss. Nothing here holds
// student data: a reply's request is built without history or learner block.

/** The longest text Strapi takes (backend/src/lib/mentor-cached-replies.ts) */
const TEXT_MAX = 20000;

export type CachedReply = {
  key: string;
  /** The key without its hash: one live version per slot and droplet */
  slot: string;
  /** The request to send on a miss: the one the key names. Never mutate it. */
  params: Anthropic.MessageCreateParamsNonStreaming;
  row: Omit<CachedReplyRow, "text">;
};
type ReplyIds = { dropletId: number; lessonId: number };
type ReplyVersions = { setup?: MentorSetup; promptVersion?: string };

/** SHA-256 (hex) of everything the model reads, plus the prompt version */
export function replyHash(
  params: Anthropic.MessageCreateParamsNonStreaming,
  promptVersion = MENTOR_PROMPT_VERSION,
): string {
  return createHash("sha256")
    .update(JSON.stringify({ promptVersion, params }))
    .digest("hex");
}

function build(
  scope: CachedReplyRow["scope"],
  slot: string,
  params: Anthropic.MessageCreateParamsNonStreaming,
  ids: ReplyIds,
  setup: MentorSetup,
  promptVersion: string,
): CachedReply {
  const key = `${slot}:${replyHash(params, promptVersion)}`;
  return {
    key,
    slot,
    params,
    row: {
      key,
      slot,
      scope,
      dropletId: ids.dropletId,
      lessonId: ids.lessonId,
      promptVersion,
      model: setup.model,
    },
  };
}

function checkLesson(context: LessonContext, ids: ReplyIds) {
  // A bug, not a bad request: the route built the context from the same id
  if (context.lessonId !== ids.lessonId) {
    throw new Error("The context is for another lesson");
  }
}

/** The lesson's summary: `lesson:<lessonId>:<hash>` of the canonical request */
export function summaryReply(
  context: LessonContext,
  ids: ReplyIds,
  {
    setup = MENTOR_SETUP,
    promptVersion = MENTOR_PROMPT_VERSION,
  }: ReplyVersions = {},
): CachedReply {
  checkLesson(context, ids);
  return build(
    "lesson",
    `lesson:${ids.lessonId}`,
    summaryRequest(context, setup),
    ids,
    setup,
    promptVersion,
  );
}

/** A wrong pick's explanation: `hint:<lessonId>:<questionId>:<answerId>:<hash>` */
export function hintReply(
  context: LessonContext,
  ask: Extract<MentorAsk, { kind: "quiz-hint" }>,
  ids: ReplyIds,
  {
    setup = MENTOR_SETUP,
    promptVersion = MENTOR_PROMPT_VERSION,
  }: ReplyVersions = {},
): CachedReply {
  checkLesson(context, ids);
  return build(
    "hint",
    `hint:${ids.lessonId}:${ask.question.questionId}:${ask.chosenOptionId}`,
    buildMentorRequest(context, ask, setup),
    ids,
    setup,
    promptVersion,
  );
}

/** Why a finished answer mustn't be shared, or null when it can be */
export function unstorableReason(
  completed: MentorCompleted | null,
): string | null {
  if (!completed) return "not finished";
  if (completed.stopReason !== "end_turn") {
    return `stop reason ${completed.stopReason}`;
  }
  if (completed.citations.length === 0) return "no citations";
  if (completed.text.includes(MENTOR_NOT_COVERED)) return "not covered";
  if (completed.text.length > TEXT_MAX) return "too long";
  return null;
}

/** Stores the answer once it has ended, if it may be shared. Logs, never throws. */
export async function storeCachedReplyWhenDone(
  reply: CachedReply,
  completed: Promise<MentorCompleted | null>,
): Promise<void> {
  try {
    const done = await completed;
    const reason = unstorableReason(done);
    if (reason || !done) {
      console.info(
        `[mentor] saved reply not stored (${reason}), ${reply.slot}`,
      );
      return;
    }
    const result = await storeCachedReply({ ...reply.row, text: done.text });
    console.info(
      result
        ? `[mentor] saved reply ${result.stored ? "stored" : "already stored"}, ${reply.slot}`
        : `[mentor] saved reply couldn't be stored, ${reply.slot}`,
    );
  } catch (error) {
    console.error(
      `[mentor] saved reply couldn't be stored, ${reply.slot}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}
