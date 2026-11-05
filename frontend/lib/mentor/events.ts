import type { Citation } from "./types";

// What POST /api/mentor streams (ODY-886), and the reader the browser uses.
// Client-safe: the sidebar (ODY-887) and quiz hints (ODY-888) read answers
// with readMentorEvents. EventSource can't POST, so they fetch and read the body.

export type MentorErrorCode =
  /** The model declined to answer. Some text may have arrived. */
  | "refused"
  /** The answer broke off: the API failed, it took too long, or it was empty */
  | "failed";

/** One event of an answer. Every answer ends with exactly one done or error. */
export type MentorEvent =
  /**
   * The next piece of the answer, in order. A [pN] ref can be split across
   * two pieces, so find refs in the whole answer so far.
   */
  | { type: "text"; text: string }
  /** The answer is complete. `truncated`: it hit the token limit. */
  | { type: "done"; citations: Citation[]; truncated: boolean }
  /** Discard the answer's text and show `message` */
  | { type: "error"; code: MentorErrorCode; message: string };

/** Why a request failed before its answer began, in the order they're checked */
export type MentorHttpErrorCode =
  | "unauthenticated" // 401
  | "too_large" // 413
  | "invalid_request" // 400
  | "not_found" // 404
  | "forbidden" // 403: the droplet isn't published, or is hidden
  | "cannot_answer" // 400
  | "busy" // 429: answers already in flight
  | "daily_limit" // 429
  | "monthly_cap" // 503
  | "disabled" // 503
  | "not_in_pilot" // 503
  | "unavailable" // 503: the usage check failed
  | "model_unavailable" // 502
  | "internal"; // 500

/**
 * The JSON body of a failed request. Show `message`. A 502 or 504 from the
 * load balancer isn't JSON, so read the body only if it parses.
 */
export type MentorHttpError = {
  error: MentorHttpErrorCode;
  message: string;
  retryAt?: string | null;
};

/** The stream broke: it ended before done or error, or sent a frame that isn't JSON */
export class MentorStreamError extends Error {
  name = "MentorStreamError";
}

/** A comment the server sends while the model thinks; readers skip it */
export const MENTOR_PING = ": ping\n\n";

const EVENT_TYPES = new Set<string>([
  "text",
  "done",
  "error",
] satisfies MentorEvent["type"][]);
const FRAME_END = /\r?\n\r?\n/;

/** One event as a server-sent event frame. JSON keeps newlines on one data line. */
export function encodeMentorEvent({ type, ...data }: MentorEvent): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function parseFrame(frame: string): MentorEvent | null {
  let type = "message";
  const data: string[] = [];
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "event") type = value;
    else if (field === "data") data.push(value);
  }
  if (!EVENT_TYPES.has(type) || data.length === 0) return null;
  try {
    return { ...JSON.parse(data.join("\n")), type } as MentorEvent;
  } catch {
    throw new MentorStreamError(`Mentor sent a ${type} event that isn't JSON`);
  }
}

/**
 * The events of a 200 from POST /api/mentor, in order, ending with its one
 * done or error. Pings and unknown events are skipped. Throws a
 * MentorStreamError if the stream breaks, and the fetch's AbortError if the
 * student stopped it: treat any other throw as failed. Stopping early (a
 * break or a throw) cancels the body; to stop an answer, abort the fetch.
 */
export async function* readMentorEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<MentorEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let end: RegExpExecArray | null;
      while ((end = FRAME_END.exec(buffer))) {
        const event = parseFrame(buffer.slice(0, end.index));
        buffer = buffer.slice(end.index + end[0].length);
        if (!event) continue;
        yield event;
        if (event.type !== "text") return;
      }
      if (done) throw new MentorStreamError("Mentor's answer ended early");
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}
