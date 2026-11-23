"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MentorStreamError, readMentorEvents } from "@/lib/mentor/events";
import type { Citation } from "@/lib/mentor/types";
import { failureOf, newId } from "@/hooks/use-mentor-chat";

const BROKE_OFF = "The answer broke off. Try again.";

/** ODY-890 reads `id` (fresh per explain), `citations` and the final `text`. */
export type MentorHintState = {
  id: string;
  status: "streaming" | "done" | "error";
  /** Raw, with refs: show it through displayAnswer */
  text: string;
  citations: Citation[];
  truncated: boolean;
  error?: { message: string; retry: boolean };
};

/** One quiz hint at a time: POSTs kind "quiz-hint" to /api/mentor and reads its stream. */
export function useMentorHint({
  dropletId,
  lessonId,
}: {
  dropletId: number;
  lessonId: number;
}) {
  const [hint, setHint] = useState<MentorHintState | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);

  const explain = useCallback(
    async (questionId: number, answerIds: number[]) => {
      if (busy.current) return;
      busy.current = true;
      const ctl = new AbortController();
      controller.current = ctl;
      const id = newId();
      // A cleared or replaced hint must not receive late updates
      const live = () => mounted.current && controller.current === ctl;
      const patch = (change: Partial<MentorHintState>) => {
        if (live()) {
          setHint((h) => (h?.id === id ? { ...h, ...change } : h));
        }
      };
      const fail = (error: { message: string; retry: boolean }) =>
        patch({ status: "error", text: "", error });
      setHint({
        id,
        status: "streaming",
        text: "",
        citations: [],
        truncated: false,
      });
      try {
        const res = await fetch("/api/mentor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "quiz-hint",
            dropletId,
            lessonId,
            questionId,
            answerIds,
          }),
          signal: ctl.signal,
        });
        if (!res.ok) {
          const f = await failureOf(res);
          fail({ message: f.message, retry: f.retry });
          return;
        }
        if (!res.body) throw new MentorStreamError("No body");
        let text = "";
        for await (const e of readMentorEvents(res.body)) {
          if (e.type === "text") {
            text += e.text;
            patch({ text });
          } else if (e.type === "done") {
            patch({
              status: "done",
              citations: e.citations,
              truncated: e.truncated,
            });
          } else fail({ message: e.message, retry: true });
        }
      } catch {
        // An aborted request (clear, unmount) never shows an error
        if (!ctl.signal.aborted) fail({ message: BROKE_OFF, retry: true });
      } finally {
        if (controller.current === ctl) busy.current = false;
      }
    },
    [dropletId, lessonId],
  );

  const clear = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    busy.current = false;
    setHint(null);
  }, []);

  return { hint, explain, clear };
}
