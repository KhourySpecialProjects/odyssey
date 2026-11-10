"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { reviveStreak } from "@/lib/requests/streaks";
import { reviveOfferMessage, revivedMessage } from "@/lib/streak-messages";
import type { Streak } from "@/lib/streaks";
import { useStreakStore } from "@/stores/streak-store";

// Reviving yesterday (ODY-920). "Not now" hides the offer in this browser
// for that missed day; it's gone tomorrow anyway, as only yesterday can be
// revived.

const DISMISSED_KEY = "streak-revive-dismissed";

function loadDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

/** The revive on offer and not dismissed here, and a way to dismiss it */
export function useReviveOffer(streak: Pick<Streak, "revive">) {
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => setDismissed(loadDismissed()), []);
  const offer =
    streak.revive && streak.revive.date !== dismissed ? streak.revive : null;
  const dismiss = () => {
    if (!offer) return;
    try {
      localStorage.setItem(DISMISSED_KEY, offer.date);
    } catch {
      // Storage is blocked: the offer shows again next visit
    }
    setDismissed(offer.date);
  };
  return { offer, dismiss };
}

/** At the top of the streak popover while a revive is on offer */
export function StreakReviveOffer({
  streak,
  onDismiss,
}: {
  streak: Pick<Streak, "revive" | "revivesLeft">;
  onDismiss: () => void;
}) {
  const setStreak = useStreakStore((s) => s.setStreak);
  const [pending, startTransition] = useTransition();
  if (!streak.revive) return null;
  const { title, detail } = reviveOfferMessage(
    streak.revive,
    streak.revivesLeft,
  );

  const revive = () =>
    startTransition(async () => {
      const result = await reviveStreak().catch(() => null);
      if (!result?.ok) {
        // A refusal says why ("No revives left"); the gate's codes don't read well
        const why = result?.error;
        toast.error(
          why === "unauthenticated" || why === "forbidden"
            ? "Sign in again to revive your streak."
            : why ?? "Couldn't revive your streak. Try again.",
        );
        return;
      }
      setStreak(result.data);
      const done = revivedMessage(result.data);
      toast.success(done.title, { description: done.detail });
    });

  return (
    <section
      aria-label="Revive your streak"
      className="mx-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100"
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-0.5">{detail}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={revive}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-md bg-[#2D7597] px-3 py-1.5 font-semibold text-white hover:bg-[#255e78] focus-visible:ring-2 focus-visible:ring-[#2D7597] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 dark:focus-visible:ring-offset-slate-900"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          {pending ? "Reviving…" : "Revive"}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={pending}
          className="rounded-md px-3 py-1.5 font-medium text-amber-950 hover:bg-amber-100 focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:outline-none dark:text-amber-100 dark:hover:bg-amber-400/20"
        >
          Not now
        </button>
      </div>
    </section>
  );
}
