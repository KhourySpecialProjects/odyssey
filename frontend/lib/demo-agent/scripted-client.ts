import type Anthropic from "@anthropic-ai/sdk";
import type { AgentRequest, ClaudeClient } from "./agent";

/**
 * A stand-in for Claude that replays a script, so the runner can be tried
 * end to end without an API key or any cost (`npm run demo:agent -- ...
 * --script file.json`). A step names its element the way the snapshot
 * shows it, like `link "Python Basics"`, and the client finds its ref in
 * the latest page.
 */
export type ScriptStep = {
  tool: string;
  /** Snapshot text that identifies the element, like `button "Check answer"`. */
  target?: string;
  input?: Record<string, unknown>;
};

type MessageParam = Anthropic.Beta.BetaMessageParam;

function messageText(message: MessageParam) {
  if (typeof message.content === "string") return message.content;
  return message.content
    .map((block) => {
      if (block.type === "text") return block.text;
      if (block.type === "tool_result") {
        return typeof block.content === "string"
          ? block.content
          : (block.content ?? [])
              .map((part) => (part.type === "text" ? part.text : ""))
              .join("\n");
      }
      return "";
    })
    .join("\n");
}

/** The newest page the agent was shown: the latest message with element refs. */
export function latestPage(messages: MessageParam[]) {
  for (let index = messages.length - 1; index >= 0; index--) {
    const text = messageText(messages[index]);
    if (text.includes("[ref=")) return text;
  }
  return "";
}

/** The ref of the first element whose snapshot line contains `target`. */
export function findRef(page: string, target: string) {
  for (const line of page.split("\n")) {
    const found = line.includes(target) && line.match(/\[ref=([^\]]+)\]/);
    if (found) return found[1];
  }
  return null;
}

export function createScriptedClient(script: ScriptStep[]): ClaudeClient {
  let next = 0;
  return {
    async send(request: AgentRequest) {
      const index = next++;
      const step: ScriptStep = script[index] ?? {
        tool: "finish",
        input: { outcome: "stuck", summary: "The script ran out of steps." },
      };
      const input: Record<string, unknown> = { ...step.input };
      if (step.target) {
        const found = findRef(latestPage(request.messages), step.target);
        if (!found) {
          throw new Error(
            `Script step ${index + 1}: nothing on the page matches ${step.target}`,
          );
        }
        input.ref = found;
      }
      const message = {
        id: `scripted_${index + 1}`,
        type: "message",
        role: "assistant",
        model: request.model,
        content: [
          {
            type: "tool_use",
            id: `toolu_scripted_${index + 1}`,
            name: step.tool,
            input,
          },
        ],
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      } as unknown as Anthropic.Beta.BetaMessage;
      return { kind: "message", message };
    },
  };
}
