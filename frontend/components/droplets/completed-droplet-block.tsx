"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useRecommendationPicks } from "@/components/recommendations/recommendation-picks";
import { RULE_ICONS } from "@/components/recommendations/recommendation-tile";
import { StartDropletButton } from "@/components/recommendations/start-droplet-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEnrollmentFirstTime } from "@/lib/requests/enrollment";
import { createFriendAnnouncement } from "@/lib/requests/feed";
import { uppercaseFirstChar } from "@/lib/utils";
import type {
  AuthorizedUser,
  Droplet,
  Enrollment,
  Recommendation,
} from "@/types";

const MORE_FOR_YOU = 2;

export function CompletedDropletBlock({
  droplet,
  enrollment,
  authUser,
}: {
  droplet: Droplet;
  enrollment: Enrollment;
  authUser: AuthorizedUser;
}) {
  const [open, setOpen] = useState(enrollment.isFirstTime);
  // The Recap page's picks; none outside its provider, so the dialog looks as before
  const { picks, dismiss } = useRecommendationPicks();
  const [upNext, ...rest] = picks;
  const moreForYou = rest.slice(0, MORE_FOR_YOU);
  const markSeen = () => updateEnrollmentFirstTime(enrollment.id);

  const handleClose = async () => {
    try {
      await markSeen();
      setOpen(false);
    } catch (error) {
      console.error("Failed to update enrollment status:", error);
    }
  };

  const handleShare = async () => {
    try {
      await createFriendAnnouncement(droplet, authUser);
      await markSeen();
      setOpen(false);
    } catch (error) {
      console.error("Failed to share with network: ", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[512px] gap-4 rounded-xl border-[#e2e8f0] bg-white p-8 sm:rounded-xl dark:border-slate-500 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <DialogTitle className="text-2xl font-bold text-[#0f172a] dark:text-white">
            You did it!
          </DialogTitle>
          <DialogDescription className="text-base text-slate-700 dark:text-slate-300">
            Congratulations on completing &ldquo;{droplet.name}&rdquo;.
          </DialogDescription>
        </div>

        {upNext && <UpNext pick={upNext} onStarted={markSeen} />}

        {moreForYou.length > 0 && (
          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              More for you
            </h3>
            <ul className="flex flex-col gap-2">
              {moreForYou.map((pick) => (
                <MoreForYouRow
                  key={pick.droplet.id}
                  pick={pick}
                  onDismiss={dismiss}
                  onOpen={() => void markSeen()}
                />
              ))}
            </ul>
          </section>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-[#e2e8f0] pt-4 dark:border-slate-700">
          <Button
            type="button"
            variant="outline"
            onClick={handleShare}
            className="h-10 rounded-lg border-[#d0d5dd] px-4 text-[#344054] shadow-[0_1px_1px_rgba(16,24,40,0.05)] dark:border-slate-600 dark:text-slate-200"
          >
            Share with friends
          </Button>
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            View recap
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** The main next step: the next voyage step, or else the top pick. */
function UpNext({
  pick: { droplet, reason, rule },
  onStarted,
}: {
  pick: Recommendation;
  onStarted: () => Promise<unknown>;
}) {
  const Icon = RULE_ICONS[rule];
  const lessons = droplet.lessons?.length ?? 0;
  const meta = [
    lessons > 0 && `${lessons} ${lessons === 1 ? "lesson" : "lessons"}`,
    droplet.difficulty && uppercaseFirstChar(droplet.difficulty),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-label="Up next"
      className="flex flex-col gap-1 rounded-lg border border-[#2d7597]/30 bg-[#2d7597]/5 p-4 leading-[normal] dark:border-[#2d7597]/60 dark:bg-[#2d7597]/15"
    >
      <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.04em] text-[#287697] uppercase dark:text-[#4AABCF]">
        <Icon aria-hidden size={14} absoluteStrokeWidth className="shrink-0" />
        {reason}
      </p>
      <p className="text-xl font-black text-[#020617] dark:text-white">
        {droplet.name}
      </p>
      {meta && (
        <p className="text-sm text-slate-600 dark:text-slate-400">{meta}</p>
      )}
      <StartDropletButton
        droplet={droplet}
        onStarted={onStarted}
        className="mt-2 w-full"
      />
    </section>
  );
}

function MoreForYouRow({
  pick: { droplet, reason, rule },
  onDismiss,
  onOpen,
}: {
  pick: Recommendation;
  onDismiss: (dropletId: number) => void;
  onOpen: () => void;
}) {
  const Icon = RULE_ICONS[rule];

  return (
    <li className="relative flex items-center gap-3 rounded-lg border border-[#d0d5dd] bg-[#fcfcfd] py-2.5 pr-2 pl-3 dark:border-slate-600 dark:bg-slate-800">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#2d7597]/10 text-[#287697] dark:bg-[#2d7597]/30 dark:text-[#4AABCF]">
        <Icon aria-hidden size={16} absoluteStrokeWidth />
      </span>
      <div className="min-w-0 flex-1 leading-[normal]">
        {/* The link's ::after covers the row; the ✕ sits above it */}
        <Link
          href={`/d/${droplet.slug}`}
          onClick={onOpen}
          className="block truncate text-sm font-semibold text-[#0f172a] after:absolute after:inset-0 dark:text-white"
        >
          {droplet.name}
        </Link>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {reason}
        </p>
      </div>
      <button
        type="button"
        aria-label={`Not interested in ${droplet.name}`}
        onClick={() => onDismiss(droplet.id)}
        className="relative z-10 shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <X aria-hidden size={16} absoluteStrokeWidth />
      </button>
    </li>
  );
}
