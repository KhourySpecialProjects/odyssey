"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import {
  STATUS_WORDS,
  flagKeyId,
  plural,
  scanFlagDomId,
} from "@/lib/overview-scan/view";
import type {
  CheckView,
  DismissedFlagView,
  FlagView,
  ViewStatus,
} from "@/lib/overview-scan/view";
import type { ScanFlagKey } from "@/lib/overview-scan/types";
import { commentTime } from "@/lib/review-comments";
import { FOCUS } from "./focus";
import { StatusCircle } from "./status-circle";

const TINT: Record<ViewStatus | "running", string> = {
  pass: "text-[#15803d]",
  warn: "text-[#b45309]",
  unknown: "text-[#475569]",
  "not-run": "text-[#344054]",
  running: "text-[#344054]",
};

/** Dismiss and Undo (ODY-905); off while a scan runs or this flag is saving */
type FlagActions = {
  canDismiss: boolean;
  busy: (key: ScanFlagKey) => boolean;
  onDismiss: (key: ScanFlagKey) => void;
  onUndo: (key: ScanFlagKey) => void;
};

const ACTION = cn(
  "w-fit rounded text-[13px] font-medium text-[#2d7597] hover:underline aria-disabled:cursor-not-allowed aria-disabled:text-slate-400 aria-disabled:no-underline",
  FOCUS,
);

function FlagLink({ flag }: { flag: FlagView }) {
  if (!flag.href) return null;
  return (
    <Link
      href={flag.href}
      className={cn(
        "w-fit rounded text-[13px] font-medium text-[#2d7597] hover:underline",
        FOCUS,
      )}
    >
      {flag.linkText} <span aria-hidden="true">→</span>
      <span className="sr-only">: {flag.label}</span>
    </Link>
  );
}

function FlagCard({ flag, actions }: { flag: FlagView; actions: FlagActions }) {
  const busy = actions.busy(flag.key);
  return (
    <li
      className={cn(
        "flex flex-col gap-0.5 rounded-md border-l-[3px] px-2.5 py-1.5 text-[12.5px] leading-[17.5px] text-[#475569]",
        flag.severity === "warn"
          ? "border-l-[#f59e0b] bg-[#fffbeb]"
          : "border-l-[#94a3b8] bg-[#f8fafc]",
      )}
    >
      <p className="font-semibold text-[#344054]">{flag.label}</p>
      <p>{flag.message}</p>
      <div className="flex flex-wrap gap-x-4">
        <FlagLink flag={flag} />
        {actions.canDismiss && (
          <button
            type="button"
            id={`${scanFlagDomId(flag.key)}-dismiss`}
            aria-disabled={busy || undefined}
            onClick={() => !busy && actions.onDismiss(flag.key)}
            className={ACTION}
          >
            Dismiss<span className="sr-only">: {flag.label}</span>
          </button>
        )}
      </div>
    </li>
  );
}

/** A flag someone marked as fine: greyed, with who and when, and Undo */
function DismissedCard({
  flag,
  actions,
}: {
  flag: DismissedFlagView;
  actions: FlagActions;
}) {
  const busy = actions.busy(flag.key);
  const when = commentTime(flag.dismissedAt);
  return (
    <li className="flex flex-col gap-0.5 rounded-md border-l-[3px] border-l-[#94a3b8] bg-[#f8fafc] px-2.5 py-1.5 text-[12.5px] leading-[17.5px] text-[#475569]">
      <div className="flex flex-col gap-0.5 opacity-70">
        <p className="font-semibold text-[#344054]">{flag.label}</p>
        <p>{flag.message}</p>
        <p className="text-xs">
          {flag.dismissedBy ? `Dismissed by ${flag.dismissedBy}` : "Dismissed"}
          {when && ` · ${when}`}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4">
        <FlagLink flag={flag} />
        {actions.canDismiss && (
          <button
            type="button"
            id={`${scanFlagDomId(flag.key)}-undo`}
            aria-disabled={busy || undefined}
            onClick={() => !busy && actions.onUndo(flag.key)}
            className={ACTION}
          >
            Undo<span className="sr-only">: dismissing {flag.label}</span>
          </button>
        )}
      </div>
    </li>
  );
}

const NO_KEYS: ReadonlySet<string> = new Set();
const noop = () => {};

/** One check as an accordion row; its rules and flags open inline. */
export function CheckRow({
  check,
  running,
  canDismiss = false,
  pendingKeys = NO_KEYS,
  onDismiss = noop,
  onUndo = noop,
}: {
  check: CheckView;
  running: boolean;
  /** Whether Dismiss and Undo show (ODY-905) */
  canDismiss?: boolean;
  /** flagKeyId of each flag whose dismiss or undo is saving */
  pendingKeys?: ReadonlySet<string>;
  onDismiss?: (key: ScanFlagKey) => void;
  onUndo?: (key: ScanFlagKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const actions: FlagActions = {
    canDismiss,
    busy: (key) => running || pendingKeys.has(flagKeyId(key)),
    onDismiss,
    onUndo,
  };
  const detailsId = useId();
  const status = running ? "running" : check.status;

  return (
    <li
      className={cn(
        "rounded-lg border border-transparent",
        open && "border-[#eaecf0] bg-[#f9fafb]",
      )}
    >
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm leading-[21px] hover:bg-slate-100",
            FOCUS,
          )}
        >
          <StatusCircle status={status} />
          <span className={cn("flex-1 font-medium", TINT[status])}>
            {check.title}
          </span>
          <span className="sr-only">, </span>
          <span className="text-xs text-[#475569]">
            {STATUS_WORDS[status]}
            {!running && check.flagCount > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                {plural(check.flagCount, "flag")}
              </>
            )}
            {!running && check.dismissedCount > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="sr-only">, </span>
                {check.dismissedCount} dismissed
              </>
            )}
          </span>
          <IconChevronDown
            aria-hidden="true"
            size={16}
            className={cn(
              "text-slate-400 transition-transform motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>
      {/* `flex` only when open: a display utility would override [hidden] */}
      <div
        id={detailsId}
        hidden={!open}
        className={cn(open && "flex", "flex-col gap-1.5 pr-3 pb-3 pl-[38px]")}
      >
        <p className="text-[13px] text-[#475569]">{check.description}</p>
        <p className="text-xs text-[#475569]">Looks at: {check.scope}</p>
        <ul className="flex flex-col gap-2 pt-1">
          {check.rules.map((rule) => (
            <li key={rule.id}>
              <div
                className={cn(
                  "flex items-start gap-2 text-[13px] leading-[18.2px]",
                  TINT[running ? "running" : rule.status],
                )}
              >
                <span className="pt-0.5">
                  <StatusCircle
                    status={running ? "running" : rule.status}
                    small
                  />
                </span>
                <span>
                  {rule.text}
                  <span className="sr-only">
                    {" "}
                    ({STATUS_WORDS[running ? "running" : rule.status]})
                  </span>
                </span>
              </div>
              {rule.flags.length + rule.dismissed.length > 0 && (
                <ul className="flex flex-col gap-1.5 pt-1.5 pb-0.5 pl-[23px]">
                  {rule.flags.map((flag, i) => (
                    <FlagCard key={i} flag={flag} actions={actions} />
                  ))}
                  {rule.dismissed.map((flag, i) => (
                    <DismissedCard
                      key={`d${i}`}
                      flag={flag}
                      actions={actions}
                    />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {check.note && <p className="text-xs text-[#475569]">{check.note}</p>}
      </div>
    </li>
  );
}
