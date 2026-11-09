"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MentorStreamError, readMentorEvents } from "@/lib/mentor/events";
import { displayAnswer } from "@/lib/mentor/answer-text";
import type { MentorMsg, StudentMsg } from "@/lib/mentor/chat-types";
import type { MentorTurn } from "@/lib/mentor/types";
import {
  MENTOR_HISTORY_MAX,
  MENTOR_MESSAGE_MAX,
  MENTOR_REPLY_MAX,
} from "@/lib/validations/mentor";

export type ChatMsg = StudentMsg | MentorMsg;
/** ODY-889 adds { kind: "explain", selection } here */
export type MentorAsk = { kind: "lesson"; message: string };

// Codes the student can't fix by waiting: the composer locks
const LOCK_CODES = new Set([
  "daily_limit",
  "monthly_cap",
  "disabled",
  "not_in_pilot",
  "forbidden",
  "unauthenticated",
]);
const NO_RETRY_CODES = new Set([
  "invalid_request",
  "cannot_answer",
  "too_large",
  "not_found",
]);
const NOT_RESPONDING =
  "Mentor isn't responding right now. Try again in a minute.";
const BROKE_OFF = "The answer broke off. Try again.";

let counter = 0;
const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `mentor-msg-${(counter += 1)}`;

/** The last three finished exchanges before `upTo`, as the route takes them. */
function historyOf(messages: ChatMsg[], upTo: number): MentorTurn[] {
  const turns: MentorTurn[] = [];
  for (let i = 0; i < upTo; i++) {
    const m = messages[i];
    if (m.role !== "mentor" || m.status !== "done") continue;
    const q = messages.find((s) => s.id === m.askId);
    const answer = displayAnswer(m.text, { streaming: false }).trim();
    if (q?.role !== "student" || !answer) continue;
    turns.push(
      { role: "student", text: q.text.slice(0, MENTOR_MESSAGE_MAX) },
      { role: "mentor", text: answer.slice(0, MENTOR_REPLY_MAX) },
    );
  }
  return turns.slice(-MENTOR_HISTORY_MAX);
}

async function failureOf(res: Response) {
  let body: { error?: unknown; message?: unknown } | null = null;
  try {
    body = await res.json();
  } catch {
    // An ALB 502/504 or a framework error page isn't JSON
  }
  const message =
    typeof body?.message === "string" && body.message
      ? body.message
      : NOT_RESPONDING;
  const code = typeof body?.error === "string" ? body.error : "";
  const lock = LOCK_CODES.has(code);
  const retry =
    !lock &&
    !NO_RETRY_CODES.has(code) &&
    (res.status >= 500 || res.status === 429 || !code);
  return { message, lock, retry };
}

/** The sidebar's conversation: asks POST /api/mentor and reads its stream. */
export function useMentorChat({
  dropletId,
  lessonId,
}: {
  dropletId: number;
  lessonId: number;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [lock, setLock] = useState<string | null>(null);
  const messagesRef = useRef<ChatMsg[]>([]);
  const busy = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const stopped = useRef(false);
  const locked = useRef(false);

  const commit = useCallback((next: ChatMsg[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []);
  const patch = useCallback(
    (id: string, change: Partial<MentorMsg>) => {
      commit(
        messagesRef.current.map((m) =>
          m.id === id && m.role === "mentor" ? { ...m, ...change } : m,
        ),
      );
    },
    [commit],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const run = useCallback(
    async (answerId: string, message: string, history: MentorTurn[]) => {
      const ctl = new AbortController();
      controller.current = ctl;
      stopped.current = false;
      busy.current = true;
      setStreaming(true);
      const fail = (error: { message: string; retry: boolean }) =>
        patch(answerId, { status: "error", text: "", error });
      try {
        const res = await fetch("/api/mentor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "lesson",
            dropletId,
            lessonId,
            message,
            history,
          }),
          signal: ctl.signal,
        });
        if (!res.ok) {
          const f = await failureOf(res);
          if (f.lock) {
            commit(messagesRef.current.filter((m) => m.id !== answerId));
            locked.current = true;
            setLock(f.message);
          } else fail({ message: f.message, retry: f.retry });
          return;
        }
        if (!res.body) throw new MentorStreamError("No body");
        let text = "";
        for await (const e of readMentorEvents(res.body)) {
          if (e.type === "text") {
            text += e.text;
            patch(answerId, { text });
          } else if (e.type === "done") {
            patch(answerId, {
              status: "done",
              citations: e.citations,
              truncated: e.truncated,
            });
          } else fail({ message: e.message, retry: true });
        }
      } catch (e) {
        if (!mounted.current) return;
        if (stopped.current || ctl.signal.aborted) {
          patch(answerId, { status: "stopped" });
        } else if (e instanceof Error && e.name === "AbortError") {
          patch(answerId, { status: "stopped" });
        } else fail({ message: BROKE_OFF, retry: true });
      } finally {
        busy.current = false;
        if (mounted.current) setStreaming(false);
      }
    },
    [dropletId, lessonId, commit, patch],
  );

  const ask = useCallback(
    (input: MentorAsk) => {
      const message = input.message.trim().slice(0, MENTOR_MESSAGE_MAX);
      if (busy.current || locked.current || !message) return;
      const student: StudentMsg = {
        id: newId(),
        role: "student",
        text: message,
      };
      const answer: MentorMsg = {
        id: newId(),
        role: "mentor",
        askId: student.id,
        status: "streaming",
        text: "",
        citations: [],
        truncated: false,
      };
      const history = historyOf(
        messagesRef.current,
        messagesRef.current.length,
      );
      commit([...messagesRef.current, student, answer]);
      void run(answer.id, message, history);
    },
    [commit, run],
  );

  const retry = useCallback(
    (id: string) => {
      if (busy.current || locked.current) return;
      const list = messagesRef.current;
      const answer = list.find((m) => m.id === id);
      if (answer?.role !== "mentor") return;
      const at = list.findIndex((m) => m.id === answer.askId);
      const question = list[at];
      if (question?.role !== "student") return;
      patch(id, {
        status: "streaming",
        text: "",
        citations: [],
        truncated: false,
        error: undefined,
      });
      void run(id, question.text, historyOf(list, at));
    },
    [patch, run],
  );

  const stop = useCallback(() => {
    stopped.current = true;
    controller.current?.abort();
  }, []);

  return { messages, streaming, lock, ask, stop, retry };
}
