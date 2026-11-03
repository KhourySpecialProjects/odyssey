"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { STATUS_WORDS, plural } from "@/lib/overview-scan/view";
import type { CheckView, FlagView } from "@/lib/overview-scan/view";
import { StatusCircle } from "./status-circle";

const FOCUS =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#2d7597]/35";

function FlagCard({ flag }: { flag: FlagView }) {
  return (
    <li
      className={cn(
        "rounded-md border-l-[3px] px-2.5 py-[7px] text-[12.5px] text-[#475569]",
        flag.severity === "warn"
          ? "border-l-[#f59e0b] bg-[#fffbeb]"
          : "border-l-[#94a3b8] bg-[#f8fafc]",
      )}
    >
      <p className="font-semibold text-[#344054]">{flag.label}</p>
      <p>{flag.message}</p>
      {flag.href && (
        <Link
          href={flag.href}
          className={cn(
            "mt-1 inline-block rounded font-medium text-[#2d7597] hover:underline",
            FOCUS,
          )}
        >
          {flag.linkText} <span aria-hidden="true">→</span>
          <span className="sr-only">: {flag.label}</span>
        </Link>
      )}
    </li>
  );
}

/** One check as an accordion row; its rules and flags open inline. */
export function CheckRow({
  check,
  running,
}: {
  check: CheckView;
  running: boolean;
}) {
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const status = running ? "running" : check.status;

  return (
    <li
      className={cn(
        "rounded-lg",
        open && "bg-[#f9fafb] outline outline-1 outline-[#eaecf0]",
      )}
    >
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left hover:bg-slate-100",
            FOCUS,
          )}
        >
          <StatusCircle status={status} />
          <span className="flex-1 font-medium text-[#344054]">
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
      <div id={detailsId} hidden={!open} className="pr-3 pb-3 pl-[38px]">
        <p className="text-[13px] text-[#475569]">{check.description}</p>
        <p className="mt-1 text-xs text-[#475569]">Looks at: {check.scope}</p>
        <ul className="mt-2 space-y-2">
          {check.rules.map((rule) => (
            <li key={rule.id}>
              <div className="flex items-start gap-2 text-[13px] text-[#344054]">
                <span className="mt-0.5">
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
              {rule.flags.length > 0 && (
                <ul className="mt-1.5 ml-[23px] space-y-1.5">
                  {rule.flags.map((flag, i) => (
                    <FlagCard key={i} flag={flag} />
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
        {check.note && (
          <p className="mt-2 text-xs text-[#475569]">{check.note}</p>
        )}
      </div>
    </li>
  );
}
