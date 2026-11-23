import Anthropic from "@anthropic-ai/sdk";
import { ReadableStream } from "node:stream/web";

// A fake Claude for Mentor's streaming tests (ODY-886). The real SDK talks to
// a fetch that plays back a scripted Messages stream, so its parsing, usage
// tracking and aborts are the real ones. Node test environment only.

export type ClaudeScript = {
  /** The answer's pieces, one text_delta each */
  texts?: string[];
  /** A thinking block before the text */
  thinking?: string;
  stopReason?: Anthropic.StopReason;
  /** As message_start reports it; output also comes in message_delta */
  usage?: {
    input?: number;
    cacheWrite?: number;
    cacheRead?: number;
    output?: number;
  };
  /** An API error event after the texts, as when Claude is overloaded */
  failMidway?: boolean;
  /** After the texts, the stream stays open until the request is aborted */
  hang?: boolean;
  /** The request fails with this status before anything streams */
  status?: number;
};

export type ClaudeCall = { body: string; signal: AbortSignal };

const frame = (type: string, data: object = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;

function frames({
  texts = ["An index ", "speeds up reads [p2]."],
  thinking,
  stopReason = "end_turn",
  usage = {},
  failMidway,
  hang,
}: ClaudeScript): string[] {
  const { input = 40, cacheWrite = 0, cacheRead = 900, output = 30 } = usage;
  const out = [
    frame("message_start", {
      message: {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-haiku-5-5",
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: input,
          cache_creation_input_tokens: cacheWrite,
          cache_read_input_tokens: cacheRead,
          output_tokens: 1,
        },
      },
    }),
  ];
  let index = 0;
  if (thinking) {
    out.push(
      frame("content_block_start", {
        index,
        content_block: { type: "thinking", thinking: "", signature: "" },
      }),
      frame("content_block_delta", {
        index,
        delta: { type: "thinking_delta", thinking },
      }),
      frame("content_block_stop", { index }),
    );
    index += 1;
  }
  out.push(
    frame("content_block_start", {
      index,
      content_block: { type: "text", text: "" },
    }),
    ...texts.map((text) =>
      frame("content_block_delta", {
        index,
        delta: { type: "text_delta", text },
      }),
    ),
  );
  if (failMidway) {
    out.push(
      frame("error", {
        error: { type: "overloaded_error", message: "Overloaded" },
      }),
    );
  } else if (!hang) {
    out.push(
      frame("content_block_stop", { index }),
      frame("message_delta", {
        delta: { stop_reason: stopReason, stop_sequence: null },
        usage: { output_tokens: output },
      }),
      frame("message_stop"),
    );
  }
  return out;
}

/** Lets the reader take each frame before the next is sent */
const tick = () => new Promise((resolve) => setImmediate(resolve));

/** A client whose every request plays `script`, and the requests it got */
export function fakeClaude(script: ClaudeScript = {}) {
  const calls: ClaudeCall[] = [];
  const fetch = async (_url: unknown, init: RequestInit) => {
    const signal = init.signal as AbortSignal;
    calls.push({ body: String(init.body), signal });
    if (script.status) {
      return new Response(
        JSON.stringify({
          type: "error",
          error: { type: "api_error", message: "Internal error" },
        }),
        {
          status: script.status,
          headers: { "content-type": "application/json" },
        },
      );
    }
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        const stop = () =>
          controller.error(new DOMException("Aborted", "AbortError"));
        signal.addEventListener("abort", stop, { once: true });
        for (const chunk of frames(script)) {
          if (signal.aborted) return;
          controller.enqueue(encoder.encode(chunk));
          await tick();
        }
        if (script.hang) return;
        signal.removeEventListener("abort", stop);
        controller.close();
      },
    });
    return new Response(body as unknown as BodyInit, {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  };
  const client = new Anthropic({
    apiKey: "test",
    maxRetries: 0,
    fetch: fetch as unknown as typeof globalThis.fetch,
  });
  return { client, calls };
}
