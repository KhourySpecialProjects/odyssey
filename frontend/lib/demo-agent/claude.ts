import Anthropic from "@anthropic-ai/sdk";
import type {
  AgentRequest,
  ClaudeClient,
  ClaudeReply,
  TokenUsage,
} from "./agent";

/**
 * Sends the demo agent's turns (agent.ts) to the Claude API. Each turn is
 * streamed and collected with finalMessage(), as the SDK recommends for
 * long prompts. The app's SDK version predates some request fields
 * (output_config, context_management, eager_input_streaming), so the
 * request is cast here; the API reads them all the same.
 */

const BETAS = ["context-management-2025-06-27"];
// The SDK retries failures before a stream starts; these are for errors partway through one
const MID_STREAM_RETRY_DELAYS_MS = [2000, 6000];

type StreamParams = Parameters<Anthropic["beta"]["messages"]["stream"]>[0];

// SDK 0.54 has no error class for a tool input that isn't valid JSON
const isUnparseableToolInput = (error: unknown) =>
  !(error instanceof Anthropic.APIError) &&
  error instanceof Error &&
  error.message.startsWith("Unable to parse tool parameter JSON");

export function createClaudeClient(
  apiKey: string,
  { retryDelaysMs = MID_STREAM_RETRY_DELAYS_MS } = {},
): ClaudeClient {
  // The SDK retries rate limits, overload and connection errors before a stream starts
  const client = new Anthropic({ apiKey, maxRetries: 4 });

  return {
    async send(request: AgentRequest, signal?: AbortSignal) {
      const extraUsage: TokenUsage[] = [];
      for (let attempt = 0; ; attempt++) {
        // A controller per request: the SDK adds an abort listener to the
        // signal it's given and never removes it
        const controller = new AbortController();
        const forward = () => controller.abort();
        if (signal?.aborted) controller.abort();
        else signal?.addEventListener("abort", forward, { once: true });
        const stream = client.beta.messages.stream(
          { ...request, betas: BETAS } as unknown as StreamParams,
          { signal: controller.signal },
        );
        try {
          const message = await stream.finalMessage();
          return { kind: "message", message, extraUsage } as ClaudeReply;
        } catch (error) {
          // Whatever the failed attempt used is billed all the same
          const spent = stream.currentMessage?.usage;
          if (spent) extraUsage.push(spent);
          if (isUnparseableToolInput(error)) {
            // The SDK keeps reading the stream after this error, so stop it
            stream.abort();
            return { kind: "unparseable_tool_input", extraUsage };
          }
          if (signal?.aborted || error instanceof Anthropic.APIUserAbortError) {
            throw error;
          }
          if (error instanceof Anthropic.AuthenticationError) {
            throw new Error("The Claude API rejected DEMO_AGENT_API_KEY.");
          }
          if (error instanceof Anthropic.PermissionDeniedError) {
            throw new Error(
              `The Claude API refused the request: ${error.message}`,
            );
          }
          // An error event partway through the stream (like overloaded_error)
          // has no HTTP status
          if (
            error instanceof Anthropic.APIError &&
            error.status === undefined &&
            attempt < retryDelaysMs.length
          ) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelaysMs[attempt]),
            );
            continue;
          }
          throw error;
        } finally {
          signal?.removeEventListener("abort", forward);
        }
      }
    },
  };
}
