import { requireRole } from "@/lib/auth/require-role";
import { AuthorizedUserRoleTitle } from "@/lib/globals";
import type { MentorHttpError } from "@/lib/mentor/events";
import { openSse, type SseStream } from "@/lib/mentor/sse";

// A canned Mentor answer that proves streaming works on dev, behind the load
// balancer, before the real route lands (ODY-886). `?gap=70` pauses 70
// seconds mid-answer with only pings flowing, past the load balancer's idle
// timeout. System Admins only, and it never calls a model. ODY-886's last PR
// deletes it.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STEP_MS = 300;
const MAX_GAP_S = 120;

const refuse = (status: number, body: MentorHttpError) =>
  Response.json(body, { status });

export async function GET(request: Request) {
  const gate = await requireRole([AuthorizedUserRoleTitle.SysAdmin]);
  if (!gate.ok) {
    return gate.error === "forbidden"
      ? refuse(403, { error: "forbidden", message: "System Admins only." })
      : refuse(401, { error: "unauthenticated", message: "Sign in first." });
  }
  const gapS = Number(new URL(request.url).searchParams.get("gap")) || 0;
  const gapMs = Math.min(Math.max(gapS, 0), MAX_GAP_S) * 1000;
  const stopped = new AbortController();
  const sse = openSse({
    onCancel: () => {
      // The dev proof checks this reaches the server through the load balancer
      console.info("[mentor/stream-check] client went away");
      stopped.abort();
    },
  });
  void play(sse, gapMs, stopped.signal);
  return sse.response;
}

// Resolves after `ms`, or as soon as the signal aborts
function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener("abort", finish, { once: true });
  });
}

async function play(sse: SseStream, gapMs: number, signal: AbortSignal) {
  for (let i = 1; i <= 10; i++) {
    sse.send({ type: "text", text: `${i} ` });
    await wait(STEP_MS, signal);
    if (signal.aborted) return;
  }
  if (gapMs > 0) await wait(gapMs, signal);
  if (signal.aborted) return;
  sse.send({ type: "text", text: "after the gap" });
  sse.send({ type: "done", citations: [], truncated: false });
  sse.close();
}
