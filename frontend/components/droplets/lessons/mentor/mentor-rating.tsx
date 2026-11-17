"use client";

import { useId, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { trackMentor } from "@/lib/mentor/analytics";
import type { Citation, MentorKind } from "@/lib/mentor/types";
import { saveMentorFeedback } from "@/lib/requests/mentor-feedback";

type Rating = "up" | "down";
export type RatingState = {
  rating: Rating | null;
  shared: boolean;
  canShare: boolean;
  /** A save is in flight, so clicks on any instance of this answer are ignored */
  saving: boolean;
};
/** Holds each answer's state outside the component, which unmounts when the sheet closes */
export type RatingStore = {
  get: (answerKey: string) => RatingState;
  set: (answerKey: string, state: RatingState) => void;
  subscribe: (listener: () => void) => () => void;
};

const NONE: RatingState = {
  rating: null,
  shared: false,
  canShare: false,
  saving: false,
};

export function createRatingStore(): RatingStore {
  const states = new Map<string, RatingState>();
  const listeners = new Set<() => void>();
  return {
    get: (key) => states.get(key) ?? NONE,
    set: (key, state) => {
      states.set(key, state);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}

/** What the panel gives each message for ratings */
export type MentorFeedback = {
  dropletId: number;
  lessonId: number;
  memory?: RatingStore;
  announce?: (text: string) => void;
};

const toolClass =
  "inline-flex items-center gap-1 rounded text-xs text-slate-600 hover:text-slate-900 aria-disabled:opacity-60 aria-pressed:bg-slate-200 aria-pressed:text-slate-900 dark:text-slate-300 dark:hover:text-white dark:aria-pressed:bg-slate-700 dark:aria-pressed:text-white";

/** 👍/👎 for one finished answer, plus the opt-in share tick (ODY-890). */
export function MentorRating({
  kind,
  dropletId,
  lessonId,
  questionId,
  answerKey,
  citations,
  answerText,
  questionText,
  memory,
  announce,
}: {
  kind: MentorKind;
  dropletId: number;
  lessonId: number;
  questionId?: number;
  answerKey: string;
  citations: Citation[];
  answerText: string;
  questionText?: string;
  memory?: RatingStore;
  /** Tells the sheet's live region about a failure */
  announce?: (text: string) => void;
}) {
  const [local] = useState(createRatingStore);
  const store = memory ?? local;
  const { rating, shared, canShare, saving } = useSyncExternalStore(
    store.subscribe,
    () => store.get(answerKey),
    () => NONE,
  );
  const tickId = useId();
  const tick = useRef<HTMLButtonElement>(null);
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);

  const fail = (message: string) => {
    toast.error(message);
    announce?.(message);
  };
  // The tick is about to unmount: keep focus on the pressed thumb
  const hideTick = (thumb: Rating) => {
    if (tick.current && document.activeElement === tick.current) {
      (thumb === "up" ? up : down).current?.focus();
    }
  };

  const send = (next: Rating, share: boolean) =>
    saveMentorFeedback({
      answerKey,
      kind,
      rating: next,
      dropletId,
      lessonId,
      ...(questionId !== undefined && { questionId }),
      citations: citations.map((c) => ({
        ref: c.ref,
        ...(c.anchor.blockId && { blockId: c.anchor.blockId }),
        blockIndex: c.blockIndex,
      })),
      shared: share,
      ...(share && { answerText }),
      ...(share && questionText && { questionText }),
    });

  const rate = async (next: Rating) => {
    const cur = store.get(answerKey);
    if (cur.saving || cur.rating === next) return;
    store.set(answerKey, { ...cur, rating: next, saving: true });
    try {
      let result = await send(next, cur.shared);
      let keepShared = cur.shared;
      // Sharing was switched off while the tick was on: save the rating alone
      if (!result.ok && result.error === "sharing_off" && cur.shared) {
        result = await send(next, false);
        keepShared = false;
      }
      if (!result.ok) throw result;
      if (!result.canShare) hideTick(next);
      store.set(answerKey, {
        rating: next,
        shared: keepShared,
        canShare: result.canShare,
        saving: false,
      });
      trackMentor("mentor_rated", {
        rating: next,
        kind,
        answer_key: answerKey,
        prompt_version: result.promptVersion,
        droplet_id: dropletId,
        lesson_id: lessonId,
      });
    } catch {
      store.set(answerKey, { ...cur, saving: false });
      fail("Couldn't save your rating");
    }
  };

  const share = async (next: boolean) => {
    const cur = store.get(answerKey);
    if (cur.saving || !cur.rating) return;
    store.set(answerKey, { ...cur, shared: next, saving: true });
    try {
      const result = await send(cur.rating, next);
      if (!result.ok) throw result;
      if (!result.canShare) hideTick(cur.rating);
      store.set(answerKey, {
        ...cur,
        shared: next,
        canShare: result.canShare,
        saving: false,
      });
    } catch (e) {
      const off = (e as { error?: string }).error === "sharing_off";
      if (off) hideTick(cur.rating);
      store.set(answerKey, {
        ...cur,
        canShare: !off && cur.canShare,
        saving: false,
      });
      fail(
        next
          ? "Couldn't share this answer"
          : "Couldn't stop sharing this answer",
      );
    }
  };

  return (
    <>
      <button
        ref={up}
        type="button"
        aria-label="Good answer"
        aria-pressed={rating === "up"}
        aria-disabled={saving}
        onClick={() => rate("up")}
        className={toolClass}
      >
        👍
      </button>
      <button
        ref={down}
        type="button"
        aria-label="Bad answer"
        aria-pressed={rating === "down"}
        aria-disabled={saving}
        onClick={() => rate("down")}
        className={toolClass}
      >
        👎
      </button>
      {rating && canShare && (
        <span className="flex basis-full items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <Checkbox
            ref={tick}
            id={tickId}
            checked={shared}
            aria-disabled={saving}
            className="aria-disabled:opacity-60"
            onCheckedChange={(v) => share(v === true)}
          />
          <label htmlFor={tickId}>
            Share this question and answer to help improve Mentor
          </label>
        </span>
      )}
    </>
  );
}
