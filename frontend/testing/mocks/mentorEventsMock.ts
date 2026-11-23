import { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  encodeMentorEvent,
  readMentorEvents,
  type MentorEvent,
  type MentorHttpError,
} from "@/lib/mentor/events";
import type { Citation } from "@/lib/mentor/types";

// Mentor's streamed answers (ODY-886), for the route's tests and for the UI
// tickets (ODY-887, ODY-888) to mock POST /api/mentor with. Works in jsdom,
// the default test environment, which has no Fetch or Streams globals.

type Of<T extends MentorEvent["type"]> = Extract<MentorEvent, { type: T }>;

const Stream: typeof ReadableStream =
  globalThis.ReadableStream ??
  (NodeReadableStream as unknown as typeof ReadableStream);

export const mentorCitation = (over: Partial<Citation> = {}): Citation => ({
  ref: "p2",
  anchor: { v: 1, field: "blocks", blockId: "para-2" },
  blockIndex: 1,
  label: "An index speeds up reads",
  ...over,
});

export const mentorText = (text: string): Of<"text"> => ({
  type: "text",
  text,
});

export const mentorDone = (over: Partial<Of<"done">> = {}): Of<"done"> => ({
  type: "done",
  citations: [],
  truncated: false,
  ...over,
});

export const mentorError = (
  code: Of<"error">["code"] = "failed",
  message = "Mentor couldn't finish this answer. Try again.",
): Of<"error"> => ({ type: "error", code, message });

/** A body that arrives in exactly these chunks */
export function mentorBody(...chunks: (string | Uint8Array)[]) {
  const encoder = new TextEncoder();
  return new Stream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(
          typeof chunk === "string" ? encoder.encode(chunk) : chunk,
        );
      }
      controller.close();
    },
  });
}

/** Every event readMentorEvents gives for a body */
export async function readAllMentorEvents(body: ReadableStream<Uint8Array>) {
  const events: MentorEvent[] = [];
  for await (const event of readMentorEvents(body)) events.push(event);
  return events;
}

function response(
  body: ReadableStream<Uint8Array> | string,
  status: number,
  headers: Record<string, string>,
): Response {
  if (typeof Response === "function") {
    return new Response(body, { status, headers });
  }
  const named = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key: string) => named.get(key.toLowerCase()) ?? null },
    body: typeof body === "string" ? null : body,
    json: async () => JSON.parse(body as string),
  } as unknown as Response;
}

/**
 * A 200 like POST /api/mentor's, sending each event `delayMs` after the last.
 * Aborting `signal` errors the body with its reason, as fetch does. With
 * `dropAfter`, the connection breaks after that many events.
 */
export function mentorSseResponse(
  events: MentorEvent[],
  {
    delayMs = 0,
    signal,
    dropAfter,
  }: { delayMs?: number; signal?: AbortSignal; dropAfter?: number } = {},
): Response {
  const encoder = new TextEncoder();
  const body = new Stream<Uint8Array>({
    async start(controller) {
      const stop = () => controller.error(signal?.reason);
      if (signal?.aborted) return stop();
      signal?.addEventListener("abort", stop, { once: true });
      for (const [i, event] of events.entries()) {
        if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
        if (signal?.aborted) return;
        if (i === dropAfter) {
          signal?.removeEventListener("abort", stop);
          return controller.error(new TypeError("network error"));
        }
        controller.enqueue(encoder.encode(encodeMentorEvent(event)));
      }
      signal?.removeEventListener("abort", stop);
      controller.close();
    },
  });
  return response(body, 200, {
    "Content-Type": "text/event-stream; charset=utf-8",
  });
}

/** A request POST /api/mentor refused before answering, such as a 429 */
export function mentorHttpErrorResponse(
  status: number,
  body: MentorHttpError,
  retryAfterS?: number,
): Response {
  return response(JSON.stringify(body), status, {
    "Content-Type": "application/json",
    ...(retryAfterS === undefined ? {} : { "Retry-After": `${retryAfterS}` }),
  });
}
