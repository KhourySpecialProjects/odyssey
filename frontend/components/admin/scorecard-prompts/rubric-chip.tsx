"use client";

import { useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { PromptLevel } from "@/lib/ai-review/system-prompt";
import type { PanelCriterion } from "@/lib/requests/reviews";

const CLOSE_DELAY_MS = 150;

export function RubricChip({
  criteria,
  level,
}: {
  criteria: PanelCriterion[] | null;
  level: PromptLevel;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const cancelClose = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  const show = () => {
    cancelClose();
    setOpen(true);
  };
  const hideSoon = () => {
    cancelClose();
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };
  const hideIfFocusLeft = (e: React.FocusEvent) => {
    const next = e.relatedTarget as Node | null;
    if (
      next &&
      (triggerRef.current?.contains(next) || contentRef.current?.contains(next))
    )
      return;
    cancelClose();
    setOpen(false);
  };

  useEffect(() => cancelClose, []);

  const count = criteria?.length ?? 0;
  const label =
    criteria === null
      ? "Rubric · couldn't load"
      : `Rubric · ${count} ${count === 1 ? "criterion" : "criteria"}`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          cancelClose();
          setOpen(false);
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className="rounded-full border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 dark:border-slate-600 dark:hover:bg-slate-700"
          onPointerEnter={(e) => e.pointerType !== "touch" && show()}
          onPointerLeave={hideSoon}
          onFocus={show}
          onBlur={hideIfFocusLeft}
          onClick={(e) => {
            // Mouse and touch clicks always open (focus just did); a key press toggles.
            e.preventDefault();
            if (open && e.detail === 0) {
              setOpen(false);
              return;
            }
            show();
          }}
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={contentRef}
        aria-label="Rubric"
        className="max-h-[var(--radix-popover-content-available-height)] w-96 max-w-[90vw] overflow-y-auto text-sm"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={cancelClose}
        onPointerLeave={hideSoon}
        onBlur={hideIfFocusLeft}
      >
        {criteria === null ? (
          <p>Couldn&apos;t load the rubric.</p>
        ) : criteria.length === 0 ? (
          <p>No active criteria.</p>
        ) : (
          <ul className="space-y-3">
            {criteria.map((c) => (
              <li key={c.id}>
                <p className="font-medium">{c.name}</p>
                <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                  {level === "lesson"
                    ? c.lessonDescription
                    : c.overallDescription}
                </p>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
