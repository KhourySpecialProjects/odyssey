"use client";

// The streak testing panel (ODY-921, TEMPORARY: remove before streaks
// launch). Everything it does goes through the System Admin actions in
// lib/requests/streak-testing.ts, on the caller's own test rows.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  finishTestLesson,
  moveTestDay,
  resetTestStreak,
  reviveTestDay,
  setTestStreak,
} from "@/lib/requests/streak-testing";
import {
  iconsFor,
  litMessage,
  revivedMessage,
  revivesLeftText,
  shortDate,
} from "@/lib/streak-messages";
import {
  newDayNews,
  nextDayOutlook,
  TEST_STREAK_MAX,
  type TestStreakSettings,
} from "@/lib/streak-test-days";
import type { Streak } from "@/lib/streaks";
import { cn } from "@/lib/utils";
import { useStreakStore } from "@/stores/streak-store";
import { StreakLessonBanner } from "../streak-lesson-banner";
import { useStreakFeedCard } from "../streak-feed-card";
import { StreakIcon } from "../streak-icon";

type PanelState = {
  streak: Streak;
  mode: { test: boolean; offsetDays: number };
};

const QUICK_DAYS = [0, 1, 5, 10, 22, 24, 40, 50, 99, 100, 300];

const card =
  "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900";

export function StreakTestingPanel({
  initial,
  userId,
}: {
  initial: PanelState;
  /** Keys the feed card's read state, as on the Activity page */
  userId: number;
}) {
  const router = useRouter();
  const setStreak = useStreakStore((s) => s.setStreak);
  const [state, setState] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [settings, setSettings] = useState<TestStreakSettings>({
    current: initial.streak.current || 24,
    litToday: false,
    missedYesterday: false,
    revivesUsed: 0,
    history: true,
  });
  const ids = useId();
  const feedCard = useStreakFeedCard(userId, "unread");
  /** What happened on each test day, newest first */
  const [log, setLog] = useState<{ date: string; text: string }[]>([]);

  // The header pill, banner and feed card all read the shared store
  useEffect(() => setStreak(state.streak), [state.streak, setStreak]);

  const run = (
    action: () => Promise<
      { ok: true; data: PanelState } | { ok: false; error: string }
    >,
    done: string | ((next: PanelState) => string),
    { logged = false, clearsLog = false } = {},
  ) =>
    startTransition(async () => {
      const result = await action().catch(() => null);
      if (!result?.ok) {
        toast.error(result?.error ?? "That didn't work.");
        return;
      }
      const text = typeof done === "function" ? done(result.data) : done;
      setState(result.data);
      if (clearsLog) setLog([]);
      if (logged) {
        const entry = { date: result.data.streak.today, text };
        setLog((entries) => [entry, ...entries].slice(0, 14));
      }
      toast.success(text);
      // The header is server-rendered: show it the test streak too
      router.refresh();
    });

  const set = <K extends keyof TestStreakSettings>(
    key: K,
    value: TestStreakSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));

  const { streak, mode } = state;
  const { icon } = iconsFor(streak.current);
  const atRisk = !!streak.revive || (!streak.litToday && streak.current > 0);

  return (
    <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section aria-labelledby={`${ids}-now`} className={card}>
        <h2 id={`${ids}-now`} className="text-lg font-semibold">
          {mode.test ? "Test streak" : "Your real streak"}
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {mode.test
            ? `Test mode is on. Today is ${shortDate(streak.today)}${
                mode.offsetDays
                  ? `, ${mode.offsetDays} ${mode.offsetDays === 1 ? "day" : "days"} ahead`
                  : ""
              }.`
            : "Test mode is off. Set a test streak to start."}
        </p>
        <div className="mt-4 flex items-center gap-4">
          {icon && (
            <StreakIcon icon={icon} size={72} unlit={!streak.litToday} />
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-600 dark:text-slate-400">Streak</dt>
            <dd className="font-semibold">
              {streak.current} {streak.current === 1 ? "day" : "days"}
              {icon ? `, ${icon.name}` : ""}
            </dd>
            <dt className="text-slate-600 dark:text-slate-400">Today</dt>
            <dd>{streak.litToday ? "Lit" : "Not lit yet"}</dd>
            <dt className="text-slate-600 dark:text-slate-400">Longest</dt>
            <dd>
              {streak.longest} {streak.longest === 1 ? "day" : "days"}
            </dd>
            <dt className="text-slate-600 dark:text-slate-400">Revives</dt>
            <dd>
              {revivesLeftText(streak.revivesLeft)}
              {streak.revive ? ", yesterday can be revived" : ""}
            </dd>
          </dl>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
          Open the pill in the header to see the popover and calendar. The
          banner shows under any lesson&apos;s Next button, and the feed card on{" "}
          <Link href="/activity" className="underline">
            Activity
          </Link>
          .
        </p>
        <Button
          variant="outline"
          className="mt-4"
          disabled={pending || !mode.test}
          onClick={() =>
            run(resetTestStreak, "Back to your real streak and today", {
              clearsLog: true,
            })
          }
        >
          Reset to my real streak
        </Button>
      </section>

      <section aria-labelledby={`${ids}-set`} className={card}>
        <h2 id={`${ids}-set`} className="text-lg font-semibold">
          Set a test streak
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor={`${ids}-days`}>Days in the streak</Label>
            <div className="mt-1 flex items-center gap-3">
              <Input
                id={`${ids}-days`}
                type="number"
                min={0}
                max={TEST_STREAK_MAX}
                value={settings.current}
                onChange={(e) =>
                  set(
                    "current",
                    Math.max(
                      0,
                      Math.min(TEST_STREAK_MAX, Number(e.target.value) || 0),
                    ),
                  )
                }
                className="w-24"
              />
              <input
                type="range"
                aria-label="Days in the streak"
                min={0}
                max={TEST_STREAK_MAX}
                value={settings.current}
                onChange={(e) => set("current", Number(e.target.value))}
                className="flex-1 accent-[#2D7597]"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_DAYS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => set("current", days)}
                  aria-pressed={settings.current === days}
                  className="rounded-full border border-slate-300 px-2.5 py-0.5 text-xs tabular-nums hover:bg-slate-100 aria-pressed:border-[#2D7597] aria-pressed:bg-[#2D7597] aria-pressed:text-white dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  {days}
                </button>
              ))}
            </div>
          </div>

          {(
            [
              ["litToday", "A lesson finished today (lit)"],
              ["missedYesterday", "Yesterday missed (offers a revive)"],
              ["history", "Activity in the months before"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <Checkbox
                id={`${ids}-${key}`}
                checked={settings[key]}
                onCheckedChange={(checked) => set(key, checked === true)}
              />
              <Label htmlFor={`${ids}-${key}`}>{label}</Label>
            </div>
          ))}

          <fieldset>
            <legend className="text-sm font-medium">
              Revives already used
            </legend>
            <div className="mt-1 flex gap-1.5">
              {[0, 1, 2].map((used) => (
                <button
                  key={used}
                  type="button"
                  onClick={() => set("revivesUsed", used)}
                  aria-pressed={settings.revivesUsed === used}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 aria-pressed:border-[#2D7597] aria-pressed:bg-[#2D7597] aria-pressed:text-white dark:border-slate-600 dark:hover:bg-slate-800"
                >
                  {used}
                </button>
              ))}
            </div>
          </fieldset>

          <Button
            disabled={pending}
            onClick={() =>
              run(
                () => setTestStreak(settings),
                `Test streak set: ${settings.current} days`,
                { clearsLog: true },
              )
            }
          >
            {pending ? "Working…" : "Apply test streak"}
          </Button>
        </div>
      </section>

      <section aria-labelledby={`${ids}-time`} className={card}>
        <h2 id={`${ids}-time`} className="text-lg font-semibold">
          Day by day
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Each day works like a real one: it counts only if you finish a lesson
          on it. Move on without one and the streak ends at midnight. Miss a day
          and don&apos;t revive it the next, and it&apos;s lost for good.
        </p>
        <p className="mt-4 text-sm font-medium">
          {mode.test
            ? `Day ${mode.offsetDays + 1} · ${shortDate(streak.today)} · ${
                streak.litToday ? "lit" : "not lit yet"
              }`
            : "Set a test streak to start."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending || !mode.test || streak.litToday}
            onClick={() =>
              run(
                finishTestLesson,
                (next) =>
                  `Lesson finished. Today is lit: ${next.streak.current}-day streak.`,
                { logged: true },
              )
            }
          >
            Finish a lesson today
          </Button>
          {mode.test && streak.revive && (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  reviveTestDay,
                  (next) => {
                    const { title, detail } = revivedMessage(next.streak);
                    return `${title}. ${detail}`;
                  },
                  { logged: true },
                )
              }
            >
              Revive yesterday
            </Button>
          )}
          <Button
            disabled={pending || !mode.test}
            onClick={() =>
              run(moveTestDay, (next) => newDayNews(streak, next.streak), {
                logged: true,
              })
            }
          >
            Go to the next day
          </Button>
        </div>
        {mode.test && (
          <p
            aria-live="polite"
            className={cn(
              "mt-3 rounded-md px-3 py-2 text-sm",
              atRisk
                ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            )}
          >
            {nextDayOutlook(streak)}
          </p>
        )}
        {log.length > 0 && (
          <>
            <h3 className="mt-5 text-sm font-semibold">What happened</h3>
            <ol className="mt-2 space-y-1 text-sm">
              {log.map((entry, i) => (
                <li key={log.length - i}>
                  <span className="font-medium tabular-nums">
                    {shortDate(entry.date)}
                  </span>
                  : {entry.text}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <section aria-labelledby={`${ids}-moments`} className={card}>
        <h2 id={`${ids}-moments`} className="text-lg font-semibold">
          Moments
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const { title, detail } = litMessage(Math.max(1, streak.current));
              const shown = iconsFor(Math.max(1, streak.current)).icon;
              toast.success(title, {
                description: detail,
                icon: shown ? <StreakIcon icon={shown} size={20} /> : undefined,
              });
            }}
          >
            Show the lesson toast
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const { title, detail } = revivedMessage(streak);
              toast.success(title, { description: detail });
            }}
          >
            Show the revive toast
          </Button>
        </div>
        <h3 className="mt-5 text-sm font-semibold">Lesson banner</h3>
        <div className="mt-2 [&>div]:mb-0">
          <StreakLessonBanner lessonCompleted={false} />
        </div>
        <h3 className="mt-5 text-sm font-semibold">Feed card</h3>
        {feedCard ? (
          <ul className="mt-2">{feedCard}</ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            No card: the streak has no icon yet, or it&apos;s marked read.
          </p>
        )}
      </section>
    </div>
  );
}
