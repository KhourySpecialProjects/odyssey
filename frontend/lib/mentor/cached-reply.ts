import "server-only";
import { createHash } from "node:crypto";
import type Anthropic from "@anthropic-ai/sdk";
import type { MentorAnswer, MentorCompleted } from "./answer";
import type { MentorAsk } from "./ask";
import { citationsFor } from "./context";
import { storeCachedReply, type CachedReplyRow } from "./cached-reply-store";
import {
  buildMentorRequest,
  MENTOR_NOT_COVERED,
  MENTOR_PROMPT_VERSION,
  MENTOR_SETUP,
  type MentorSetup,
} from "./prompt";
import { openSse } from "./sse";
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

/** Words per text event when a saved reply is replayed */
export const REPLAY_CHUNK_WORDS = 4;
/** No replay takes longer than this; short ones finish sooner (30 ms a step) */
export const REPLAY_TOTAL_MS = 2000;
/** ...and never waits longer than this between events */
export const REPLAY_STEP_MS = 30;

/** The text in pieces of a few words; joined, they're exactly the text */
export function replayChunks(text: string): string[] {
  const words = text.split(/(?<=\s)(?=\S)/);
  // Leading whitespace stays with the first word
  if (words.length > 1 && !words[0].trim()) {
    words.splice(0, 2, words[0] + words[1]);
  }
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += REPLAY_CHUNK_WORDS) {
    chunks.push(words.slice(i, i + REPLAY_CHUNK_WORDS).join(""));
  }
  return chunks;
}

/**
 * A saved reply as the events a live answer sends: its text a few words
 * at a time, paced so any length takes about 2 s, then done with
 * citations from the current context. Shaped like streamMentorAnswer's
 * answer, with no usage. Stops, with no done, when the student goes.
 */
export function replayCachedReply({
  text,
  context,
  signal,
}: {
  text: string;
  context: LessonContext;
  signal: AbortSignal;
}): MentorAnswer {
  const chunks = replayChunks(text);
  const step = Math.min(REPLAY_STEP_MS, REPLAY_TOTAL_MS / chunks.length);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let settle!: (value: MentorCompleted | null) => void;
  const completed = new Promise<MentorCompleted | null>((resolve) => {
    settle = resolve;
  });

  const stop = () => {
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
    sse.close();
    settle(null);
  };
  const sse = openSse({ onCancel: stop });
  signal.addEventListener("abort", stop, { once: true });

  const finish = () => {
    const citations = citationsFor(context, text);
    sse.send({ type: "done", citations, truncated: false });
    sse.close();
    signal.removeEventListener("abort", stop);
    settle({ text, citations, stopReason: "end_turn" });
  };
  const sendFrom = (i: number) => {
    sse.send({ type: "text", text: chunks[i] });
    if (i + 1 < chunks.length) timer = setTimeout(() => sendFrom(i + 1), step);
    else finish();
  };

  if (signal.aborted) stop();
  else if (chunks.length) sendFrom(0);
  else finish();

  return { response: sse.response, usage: Promise.resolve(null), completed };
}
