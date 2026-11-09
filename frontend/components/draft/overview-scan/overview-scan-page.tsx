"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconPlayerPlay,
  IconRefresh,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { commentTime } from "@/lib/review-comments";
import { REVIEW_FROZEN_MESSAGE } from "@/lib/review-roles";
import {
  runOverviewScan,
  type OverviewScanError,
} from "@/lib/requests/overview-scan";
import { plural, type ScanView } from "@/lib/overview-scan/view";
import { CheckRow } from "./check-row";
import { FOCUS } from "./focus";

const ERRORS: Record<Exclude<OverviewScanError, "rate_limited">, string> = {
  forbidden: "Only reviewers and this droplet's authors can run checks.",
  not_found: "This droplet no longer exists.",
  unauthenticated: "Your session ended. Sign in again to run checks.",
  invalid_input: "The checks couldn't run. Try again.",
  failed: "The checks couldn't run. Try again.",
  in_review: REVIEW_FROZEN_MESSAGE,
  stale:
    "This flag changed since the page loaded. Run checks again or reload the page.",
};

function errorText(r: { error: OverviewScanError; message?: string }) {
  return r.error === "rate_limited"
    ? r.message ?? "You've run the checks 10 times this hour. Try again later."
    : ERRORS[r.error];
}

const PILL = "rounded-full border px-2.5 py-1 text-[13px] font-medium";
const NEUTRAL = "border-[#d0d5dd] bg-white text-[#475569]";
const NOTE = "text-[13px] text-[#475569]";

function finishedText({ counts }: ScanView) {
  return `Checks finished: ${counts.passed} passed, ${counts.needsAttention} need attention, ${counts.couldNotCheck} couldn't check.`;
}

export function OverviewScanPage({
  dropletId,
  dropletName,
  slug,
  lessonCount,
  view,
  loadError,
}: {
  dropletId: number;
  dropletName: string;
  slug: string;
  lessonCount: number;
  view: ScanView;
  loadError?: boolean;
}) {
  const router = useRouter();
  // React 18: an async transition keeps no isPending, so `busy` covers the action.
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const pending = busy || refreshing;
  const [live, setLive] = useState("");
  const [error, setError] = useState("");
  // The ranAt when a run started; undefined when none is running.
  const startRanAt = useRef<string | null | undefined>(undefined);
  const { counts, ranAt, ranBy } = view;

  useEffect(() => {
    if (startRanAt.current === undefined || view.ranAt === startRanAt.current)
      return;
    startRanAt.current = undefined;
    setLive(finishedText(view));
  }, [view]);

  const run = async () => {
    if (pending) return;
    setError("");
    setLive(`Running ${plural(view.checkCount, "check")}.`);
    setBusy(true);
    startRanAt.current = view.ranAt;
    let r: Awaited<ReturnType<typeof runOverviewScan>>;
    try {
      r = await runOverviewScan(dropletId);
    } catch {
      r = { ok: false, error: "failed", data: null };
    }
    if (r.ok) {
      startRefresh(() => router.refresh());
    } else {
      startRanAt.current = undefined;
      setError(errorText(r));
      setLive("");
    }
    setBusy(false);
  };

  // [count, text, classes, always shown]
  const pills: [number, string, string, boolean?][] = [
    [
      counts.passed,
      "passed",
      "border-[#bbf7d0] bg-[#f0fdf4] text-[#15803d]",
      true,
    ],
    [
      counts.needsAttention,
      "need attention",
      "border-[#fde68a] bg-[#fffbeb] text-[#b45309]",
    ],
    [counts.couldNotCheck, "couldn't check", NEUTRAL],
  ];

  const time = commentTime(ranAt ?? undefined);

  return (
    <div className="min-h-full">
      <header className="flex flex-col gap-2.5 border-b border-[#eaecf0] px-9 pt-[18px] pb-4">
        <Link
          href={`/draft/d/${slug}`}
          className={cn(
            "flex w-fit items-center gap-1 rounded text-[13px] font-medium text-[#2d7597] hover:underline",
            FOCUS,
          )}
        >
          <IconArrowLeft size={14} aria-hidden="true" />
          Back to draft
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-[26px] leading-[31px] font-bold text-[#0f172a]">
              Final Overview Scan
            </h1>
            <p className="text-sm text-[#475569]">
              {ranAt ? (
                <>
                  {dropletName} · Last scanned{" "}
                  <time dateTime={ranAt} suppressHydrationWarning>
                    {time}
                  </time>
                  {ranBy && ` by ${ranBy}`}
                </>
              ) : (
                `${dropletName} · ${plural(view.checkCount, "check")} across the droplet page and ${plural(lessonCount, "lesson")}`
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {pending && (
              <span className={cn(PILL, NEUTRAL)}>
                Checking {plural(view.checkCount, "check")}
              </span>
            )}
            {!pending && !ranAt && (
              <span className={cn(PILL, NEUTRAL)}>Not run yet</span>
            )}
            {!pending &&
              ranAt &&
              pills.map(([n, text, look, always]) =>
                always || n > 0 ? (
                  <span key={text} className={cn(PILL, look)}>
                    {n} {text}
                  </span>
                ) : null,
              )}
            <button
              type="button"
              aria-disabled={pending}
              onClick={run}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border border-[#2d7597] bg-[#2d7597] px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(16,24,40,.05)] hover:bg-[#255e78]",
                FOCUS,
                pending && "cursor-not-allowed opacity-70",
              )}
            >
              {!pending &&
                (ranAt ? (
                  <IconRefresh size={16} aria-hidden="true" />
                ) : (
                  <IconPlayerPlay size={16} aria-hidden="true" />
                ))}
              {pending ? "Running…" : ranAt ? "Run again" : "Run checks"}
            </button>
          </div>
        </div>
        {view.editedSince && (
          <p className={NOTE}>
            Edited since the last scan. Run checks again to see current results.
          </p>
        )}
        {view.checksChanged && (
          <p className={NOTE}>
            The checks changed since this scan. Run checks again to see every
            result.
          </p>
        )}
        {loadError && (
          <p className="text-[13px] text-red-700">
            Couldn&apos;t load the last scan.
          </p>
        )}
        <p role="alert" className="text-[13px] text-red-700 empty:hidden">
          {error}
        </p>
        <p role="status" className="sr-only">
          {live}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-7 px-9 pt-5 pb-8 xl:grid-cols-[1fr_1.3fr_1fr] group-data-[review-panel=open]:xl:grid-cols-1">
        {view.columns.map((col) => (
          <section
            key={col.group}
            aria-labelledby={`scan-col-${col.group}`}
            className="flex flex-col gap-1"
          >
            <div className="flex items-baseline justify-between border-b border-[#eaecf0] px-2 pb-2 text-xs text-[#475569]">
              <h2
                id={`scan-col-${col.group}`}
                className="font-semibold tracking-[.06em] uppercase"
              >
                {col.title}
              </h2>
              <span>{plural(col.checks.length, "check")}</span>
            </div>
            {col.checks.length ? (
              <ul className="flex flex-col gap-1">
                {col.checks.map((check) => (
                  <CheckRow key={check.id} check={check} running={pending} />
                ))}
              </ul>
            ) : (
              <p className="px-2 text-[13px] text-[#475569]">
                No checks in this column yet.
              </p>
            )}
          </section>
        ))}
      </div>

      <footer className="flex items-center gap-4 border-t border-[#eaecf0] px-9 py-3 text-xs text-[#475569]">
        Rules version {view.rulesVersion} · {plural(view.ruleCount, "rule")}
      </footer>
    </div>
  );
}
