import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { citationsFor } from "./context";
import type { MentorErrorCode, MentorEvent } from "./events";
import { openSse, type SseStream } from "./sse";
import type { LessonContext } from "./types";
import type { MentorTokenUsage } from "./usage";

// Streams one Mentor answer from Claude to the browser (ODY-886). It uses the
// SDK's listeners, attached before connecting, rather than its async
// iterator, which drops an error that arrives while the loop body runs.
// Thinking is counted for the usage record, never sent.

/** The longest an answer may take. Answers are about 120 words. */
export const MENTOR_TIMEOUT_MS = 90_000;

/** What the browser shows when an answer ends with an error event */
export const MENTOR_STREAM_MESSAGES: Record<MentorErrorCode, string> = {
  refused:
    "Mentor can't help with that. Try asking about the lesson another way.",
  failed: "Mentor couldn't finish this answer. Try again.",
};

export type MentorAnswer = {
  /** The event stream for the route to return */
  response: Response;
  /**
   * What the answer used, once it has ended. Null if Claude never started.
   * An answer cut short counts at least the characters that streamed, at
   * about 4 to a token, because its last usage report never came.
   */
  usage: Promise<MentorTokenUsage | null>;
};

const failure = (code: MentorErrorCode): MentorEvent => ({
  type: "error",
  code,
  message: MENTOR_STREAM_MESSAGES[code],
});

const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** How a finished answer ends */
function ending(
  stopReason: Anthropic.StopReason | null | undefined,
  answer: string,
  context: LessonContext,
): MentorEvent {
  if (stopReason === "refusal") return failure("refused");
  if (!answer.trim()) return failure("failed");
  return {
    type: "done",
    citations: citationsFor(context, answer),
    truncated: stopReason === "max_tokens",
  };
}

function usedTokens(
  message: Anthropic.Message | null,
  streamedChars: number,
): MentorTokenUsage | null {
  if (!message) return null;
  const { usage } = message;
  return {
    input_tokens: usage.input_tokens,
    cache_creation_input_tokens: usage.cache_creation_input_tokens,
    cache_read_input_tokens: usage.cache_read_input_tokens,
    output_tokens: Math.max(usage.output_tokens, Math.ceil(streamedChars / 4)),
  };
}

/**
 * Asks Claude and streams the answer. Resolves when Claude starts answering,
 * or with null if it couldn't be reached, when nothing is billed. Every
 * stream ends with one done or error event, except one the student stopped
 * (`signal`, or the body being cancelled), which aborts the Claude call.
 */
export async function streamMentorAnswer({
  client,
  params,
  context,
  signal,
  timeoutMs = MENTOR_TIMEOUT_MS,
}: {
  client: Anthropic;
  params: Anthropic.MessageCreateParamsNonStreaming;
  context: LessonContext;
  /** The request's, which aborts when the browser goes away */
  signal: AbortSignal;
  timeoutMs?: number;
}): Promise<MentorAnswer | null> {
  const abort = new AbortController();
  let stoppedBy: "student" | "timeout" | null = null;
  const stop = (by: "student" | "timeout") => {
    stoppedBy ??= by;
    abort.abort();
  };
  const onGone = () => stop("student");
  signal.addEventListener("abort", onGone, { once: true });
  if (signal.aborted) onGone();
  const timer = setTimeout(() => stop("timeout"), timeoutMs);
  const cleanUp = () => {
    clearTimeout(timer);
    signal.removeEventListener("abort", onGone);
  };

  let sse: SseStream | null = null;
  let answer = "";
  let thinkingChars = 0;
  // Set by a listener, so TypeScript mustn't narrow it to null
  let message = null as Anthropic.Message | null;
  const stream = client.messages.stream(params, { signal: abort.signal });
  stream.on("text", (delta) => {
    answer += delta;
    sse?.send({ type: "text", text: delta });
  });
  stream.on("thinking", (delta) => {
    thinkingChars += delta.length;
  });
  // The snapshot holds the usage and stop reason reported so far
  stream.on("streamEvent", (_, snapshot) => {
    message = snapshot;
  });

  try {
    await stream.withResponse();
  } catch (error) {
    cleanUp();
    if (!stoppedBy)
      console.error("[mentor] Claude didn't start:", errorText(error));
    return null;
  }

  const open = (sse = openSse({ onCancel: () => stop("student") }));
  // Text that arrived while the stream opened
  if (answer) open.send({ type: "text", text: answer });
  const usage = (async () => {
    let end: MentorEvent | null = null;
    let finished = false;
    try {
      await stream.done();
      finished = true;
      end = ending(message?.stop_reason, answer, context);
    } catch (error) {
      if (stoppedBy !== "student") {
        console.error(
          "[mentor] the answer broke off:",
          stoppedBy ?? errorText(error),
        );
        end = failure("failed");
      }
    } finally {
      cleanUp();
    }
    if (end) open.send(end);
    open.close();
    return usedTokens(message, finished ? 0 : answer.length + thinkingChars);
  })();
  return { response: open.response, usage };
}
