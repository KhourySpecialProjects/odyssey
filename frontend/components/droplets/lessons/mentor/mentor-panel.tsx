"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMentorChat } from "@/hooks/use-mentor-chat";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import { answerNoteHtml, displayAnswer } from "@/lib/mentor/answer-text";
import { noteYFor, showCitation } from "@/lib/mentor/locate";
import type { MentorMsg } from "@/lib/mentor/chat-types";
import type { Citation } from "@/lib/mentor/types";
import { useLessonPanelStore } from "@/stores/lesson-panel-store";
import type { Lesson } from "@/types";
import { MentorSheet } from "./mentor-sheet";
import { acceptNotice, noticeAccepted } from "./mentor-notice";

const lessonRoot = () => document.querySelector(".lesson-wrapper");

/** Holds the conversation while kept; unmounting it aborts any request. */
export function MentorPanel({
  dropletId,
  lesson,
  enrollmentId,
  userId,
  onNoteSaved,
}: {
  dropletId: number;
  lesson: Lesson;
  enrollmentId?: string;
  userId: number;
  onNoteSaved: () => Promise<void> | void;
}) {
  const open = useLessonPanelStore((s) => s.panel === "mentor");
  const setPanel = useLessonPanelStore((s) => s.setPanel);
  const closeMentor = useLessonPanelStore((s) => s.closeMentor);
  const wide = useMediaQuery("(min-width: 640px)");
  const chat = useMentorChat({ dropletId, lessonId: lesson.id });
  const [accepted, setAccepted] = useState(noticeAccepted);
  const [draft, setDraft] = useState("");
  // A new n remounts the live-region text, so an identical message is heard again
  const [announcement, setAnnouncement] = useState({ n: 0, text: "" });
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    abort.current = new AbortController();
    return () => abort.current?.abort();
  }, []);

  // Errors aren't announced here: the message card's role="alert" does it.
  // Each finished answer announces once, whichever message it is.
  const announced = useRef(new Set<string>());
  useEffect(() => {
    for (const m of chat.messages) {
      if (
        m.role !== "mentor" ||
        (m.status !== "done" && m.status !== "stopped")
      )
        continue;
      const key = `${m.id}:${m.status}`;
      if (announced.current.has(key)) continue;
      announced.current.add(key);
      const text =
        m.status === "done"
          ? `Mentor answered: ${displayAnswer(m.text, { streaming: false }).trim()}`
          : "Mentor stopped.";
      setAnnouncement((a) => ({ n: a.n + 1, text }));
    }
  }, [chat.messages]);

  const onShowSource = useCallback(
    async (citation: Citation) => {
      if (!wide) setPanel(null);
      const root = lessonRoot();
      const shown = root
        ? await showCitation(root, citation, abort.current?.signal)
        : false;
      if (!shown && !abort.current?.signal.aborted) {
        toast("Couldn't find that passage in the lesson.");
      }
    },
    [wide, setPanel],
  );

  const save = useCallback(
    async (message: MentorMsg) => {
      const question = chat.messages.find((m) => m.id === message.askId);
      const root = lessonRoot();
      try {
        const enrollment = await getEnrollByID(String(enrollmentId), {
          fields: ["id"],
          populate: {},
        });
        const result = await createNote(
          lesson,
          enrollment,
          root ? noteYFor(root, message.citations) : 0,
          userId,
          undefined,
          answerNoteHtml(question?.text ?? "", message.text),
        );
        if (!result.success) throw new Error("not saved");
        await onNoteSaved();
        toast.success("Saved to your notes", {
          action: { label: "View notes", onClick: () => setPanel("notes") },
        });
        return true;
      } catch {
        toast.error("Couldn't save to your notes");
        return false;
      }
    },
    [chat.messages, enrollmentId, lesson, userId, onNoteSaved, setPanel],
  );

  return (
    <MentorSheet
      open={open}
      modal={!wide}
      lessonName={lesson.name}
      messages={chat.messages}
      streaming={chat.streaming}
      lock={chat.lock}
      accepted={accepted}
      announcement={announcement}
      draft={draft}
      setDraft={setDraft}
      onClose={closeMentor}
      onAccept={() => {
        acceptNotice();
        setAccepted(true);
      }}
      onSend={(message) => chat.ask({ kind: "lesson", message })}
      onStop={chat.stop}
      onRetry={chat.retry}
      onShowSource={onShowSource}
      onSave={enrollmentId ? save : undefined}
    />
  );
}
