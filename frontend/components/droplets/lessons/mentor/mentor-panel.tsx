"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useMentorChat } from "@/hooks/use-mentor-chat";
import { useMediaQuery } from "@/hooks/use-media-query";
import { getEnrollByID } from "@/lib/requests/enrollment";
import { createNote } from "@/lib/requests/notes";
import { answerNoteHtml, displayAnswer } from "@/lib/mentor/answer-text";
import { trackMentor } from "@/lib/mentor/analytics";
import { noteYFor, showCitation } from "@/lib/mentor/locate";
import type { MentorMsg } from "@/lib/mentor/chat-types";
import type { Citation } from "@/lib/mentor/types";
import {
  useLessonPanelStore,
  useOwnedPanel,
} from "@/stores/lesson-panel-store";
import type { Lesson } from "@/types";
import { MentorSheet } from "./mentor-sheet";
import { acceptNotice, noticeAccepted } from "./mentor-notice";
import { createRatingStore, type MentorFeedback } from "./mentor-rating";

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
  const open = useOwnedPanel(lesson.id) === "mentor";
  const setPanel = useLessonPanelStore((s) => s.setPanel);
  const closeMentor = useLessonPanelStore((s) => s.closeMentor);
  const explainSelection = useLessonPanelStore((s) => s.explainSelection);
  const clearExplain = useLessonPanelStore((s) => s.clearExplain);
  const openedByExplain = useLessonPanelStore((s) => s.openedByExplain);
  const wide = useMediaQuery("(min-width: 640px)");
  const chat = useMentorChat({ dropletId, lessonId: lesson.id });
  const [accepted, setAccepted] = useState(noticeAccepted);
  const [draft, setDraft] = useState("");
  // A new n remounts the live-region text, so an identical message is heard again
  const [announcement, setAnnouncement] = useState({ n: 0, text: "" });
  const abort = useRef<AbortController | null>(null);

  // A reopened sheet shouldn't replay the last announcement
  useEffect(() => {
    if (!open) return;
    setAnnouncement((a) => ({ n: a.n + 1, text: "" }));
    trackMentor("mentor_opened", {
      droplet_id: dropletId,
      lesson_id: lesson.id,
    });
  }, [open, dropletId, lesson.id]);

  useEffect(() => {
    abort.current = new AbortController();
    return () => abort.current?.abort();
  }, []);

  // Explain from the lesson waits for the notice to be accepted and for an
  // answer that's still streaming. Once locked, the ask is dropped. It's sent
  // a tick later, so StrictMode's remount (which aborts requests) can't stop it.
  const { ask, streaming } = chat;
  useEffect(() => {
    if (explainSelection === null || !accepted || streaming) return;
    const timer = setTimeout(() => {
      clearExplain();
      ask({ kind: "explain", selection: explainSelection });
    });
    return () => clearTimeout(timer);
  }, [explainSelection, accepted, streaming, ask, clearExplain]);

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
      trackMentor("mentor_source_clicked", {
        droplet_id: dropletId,
        lesson_id: lesson.id,
        found: shown,
      });
      if (!shown && !abort.current?.signal.aborted) {
        toast("Couldn't find that passage in the lesson.");
      }
    },
    [wide, setPanel, dropletId, lesson.id],
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
        trackMentor("mentor_saved_to_notes", {
          droplet_id: dropletId,
          lesson_id: lesson.id,
        });
        await onNoteSaved();
        // The toast sits outside the phone's modal sheet, where it can't be reached
        toast.success(
          "Saved to your notes",
          wide
            ? {
                action: {
                  label: "View notes",
                  onClick: () => setPanel("notes"),
                },
              }
            : undefined,
        );
        return true;
      } catch {
        toast.error("Couldn't save to your notes");
        return false;
      }
    },
    [
      chat.messages,
      enrollmentId,
      lesson,
      userId,
      onNoteSaved,
      setPanel,
      wide,
      dropletId,
    ],
  );
  // Ratings live here so they survive the sheet closing
  const [ratings] = useState(createRatingStore);
  const feedback = useMemo<MentorFeedback>(
    () => ({
      dropletId,
      lessonId: lesson.id,
      memory: ratings,
      // The desktop sheet's toasts are reachable; only the modal one needs this
      announce: wide
        ? undefined
        : (text) => setAnnouncement((a) => ({ n: a.n + 1, text })),
    }),
    [dropletId, lesson.id, wide, ratings],
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
      openedByExplain={openedByExplain}
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
      feedback={feedback}
    />
  );
}
