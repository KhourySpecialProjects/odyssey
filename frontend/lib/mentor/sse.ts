import "server-only";

import { encodeMentorEvent, MENTOR_PING, type MentorEvent } from "./events";

// The streamed response behind POST /api/mentor (ODY-886). `next start` gzips
// a response unless its Cache-Control says no-transform, and gzip holds the
// stream back until the end, so no-transform is what makes an answer arrive
// as it's written. A Cache-Control from next.config's headers() would win over
// this one and quietly turn gzip back on.

export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
} as const;

/** Under the load balancer's idle timeout, so a long think isn't cut off */
export const SSE_PING_MS = 15_000;

export type SseStream = {
  response: Response;
  /** Does nothing once closed or cancelled */
  send(event: MentorEvent): void;
  close(): void;
};

/**
 * An open event stream that pings until it's closed, or the browser goes away
 * (`onCancel`). It pings at once too: Next sends the headers with the first
 * chunk, and the browser's fetch waits for them.
 */
export function openSse({
  onCancel,
}: { onCancel?: () => void } = {}): SseStream {
  const encoder = new TextEncoder();
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  let open = true;
  const write = (chunk: string) => {
    if (open) controller.enqueue(encoder.encode(chunk));
  };
  const ping = setInterval(() => write(MENTOR_PING), SSE_PING_MS);
  const stop = () => {
    open = false;
    clearInterval(ping);
  };
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      write(MENTOR_PING);
    },
    cancel() {
      if (!open) return;
      stop();
      onCancel?.();
    },
  });
  return {
    response: new Response(body, { headers: SSE_HEADERS }),
    send: (event) => write(encodeMentorEvent(event)),
    close() {
      if (!open) return;
      stop();
      controller.close();
    },
  };
}
